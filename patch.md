# Tappen — Multiplayer Rooms Implementation Plan

**Audience:** implementing agent with write access to all three repos.
**Stack:** Next.js, tRPC, Prisma, MySQL.
**Repos / domains:**
- `tappen.app` — marketing / public homepage
- `play.tappen.app` — the game client
- `hub.tappen.app` — content management & creator tools

---

## 0. Read This First

### Core product thesis
The card is not the content. The *conversation the card triggers* is the content.
The physical game already works at the table. What is missing is that the app has
no **memory** (nothing survives the night) and no **anticipation** (no reason to
open it when nobody is playing).

Everything below exists to add memory and anticipation. Do not add features that
pull attention *down into phones* — the game's value is people looking at each
other.

### Non-negotiable design constraint: stage + controllers
This is **not** "sync the same card to every device."

- **Stage** — one device (propped-up phone, laptop, TV). Renders the current
  card large and readable. This is the only place the card text is displayed at
  full size.
- **Controller** — every other player's phone. Small surface, few buttons.
  Controllers send *intents*. They never render the card as the primary view.

If you find yourself building a full card reader on the controller, stop and
re-read this section.

### Server authority
The server is the single source of truth for room state. Controllers send
intents; the server validates, mutates, and broadcasts. Never let a client
compute game state and push it as fact. This matters because several mechanics
below are *hidden-information* mechanics — client-authoritative state would leak
them.

### Hard rule on phases
Ship phases in order. Do not start phase N+1 until phase N is deployed and has
been played by real humans. Each phase has a **STOP** gate at the end. Honour
it.

---

## Phase 1 — Rooms, Stage, Controllers

**Goal:** a group in one physical room can play the existing game with one stage
device and N controllers. No new game mechanics yet. Feature parity with the
current single-device experience, restructured.

### 1.1 Data model (Prisma)

Add to the schema. Names are suggestions; keep them consistent across repos.

```prisma
model Room {
  id        String   @id @default(cuid())
  code      String   @unique          // short, human-readable join code
  status    RoomStatus                 // LOBBY | ACTIVE | ENDED
  hostId    String                     // Player.id of the stage owner
  deckId    String
  createdAt DateTime @default(now())
  endedAt   DateTime?
  players   Player[]
  turns     Turn[]
}

model Player {
  id          String   @id @default(cuid())
  roomId      String
  displayName String
  role        PlayerRole                // STAGE | CONTROLLER
  userId      String?                   // null = guest, claimable later
  joinedAt    DateTime @default(now())
  isConnected Boolean  @default(true)
  room        Room     @relation(fields: [roomId], references: [id])
}

model Turn {
  id         String   @id @default(cuid())
  roomId     String
  cardId     String
  targetId   String?                    // Player.id the card is aimed at
  sequence   Int                        // ordering within the room
  startedAt  DateTime @default(now())
  resolvedAt DateTime?
  room       Room     @relation(fields: [roomId], references: [id])
}
```

Notes:
- `code` must be short and unambiguous. Exclude visually confusable characters
  (`0/O`, `1/I/l`). 5–6 chars is fine.
- Guests are first-class. `Player.userId` is nullable by design — see 1.5.
- `Turn` is the spine of everything in later phases. Get it right now.

### 1.2 Realtime transport

Add a websocket layer. Requirements:

- Room-scoped channels. A client subscribes to exactly one room.
- Server-authoritative. Clients emit intents, server emits state.
- Reconnect must be safe: on reconnect, client requests a full state snapshot
  rather than replaying a delta log.
- Presence: mark `Player.isConnected` on connect/disconnect. Stage shows who
  dropped.

**Decision to make and document:** whether to run a separate websocket process
or use a hosted realtime provider. Do not spend more than a day on this. Write
your choice and reasoning into `docs/realtime.md` in the `play` repo, including
how it deploys and how it scales past one instance.

Keep tRPC for everything request/response. The websocket layer carries room
state broadcasts only. Do not attempt to route all game actions through
websockets — intents can be tRPC mutations that trigger a broadcast. This is
simpler and easier to debug.

### 1.3 Stage client (`play.tappen.app`)

- Create room → pick deck → get join code.
- Lobby: show join code prominently, list players as they join.
- Active: render current card large. Show the target player's name.
- Advance to next card. This is the stage's privilege in Phase 1 — controllers
  cannot advance the turn yet.
- End room → transition to `ENDED`.

Design note: the stage will often be a propped-up phone at an awkward angle in
bad lighting. Very large type, very high contrast, minimal chrome.

### 1.4 Controller client (`play.tappen.app`)

- Join by code. No account required.
- Enter display name.
- Show: whose turn it is, and a compact indicator of the current card's
  category/deck — **not** the full card text.
- Phase 1 has almost no controller buttons. That is correct and expected. The
  controller exists so that Phase 2 has somewhere to live.

### 1.5 Guest claim

When a room ends, every guest player gets a claim link/prompt: "That was you?
Make an account and keep this night."

- Claiming attaches `Player.userId` retroactively, for that player across that
  room's history.
- Claim window: 7 days after `endedAt`.
- This is the primary growth loop. Every game is a multiplayer onboarding
  funnel. Do not treat it as an afterthought.

### 1.6 Homepage (`tappen.app`)

Minimal change only: a "join a room" entry point that accepts a code and
redirects to `play.tappen.app`. Nothing else this phase.

### STOP — Phase 1 gate

Do not proceed until:
- [ ] A real group of 4+ people has played a full session on the stage +
      controller model.
- [ ] Reconnect works: kill a controller's connection mid-game, rejoin, state
      is correct.
- [ ] Kill the *stage's* connection mid-game and rejoin. Room survives.
- [ ] Someone who has never used the app joined without help.
- [ ] Written notes on what felt worse than the old single-device version.

That last item is the important one. Report back before starting Phase 2.

---

## Phase 2 — Aimed Anonymous Queue

**Goal:** the cheapest change with the biggest behavioural effect. Players can
load cards aimed at specific people, anonymously.

### 2.1 Model

```prisma
model QueuedCard {
  id         String   @id @default(cuid())
  roomId     String
  cardId     String
  targetId   String                     // Player.id
  queuedById String                     // Player.id — NEVER sent to clients
  createdAt  DateTime @default(now())
  consumedAt DateTime?
}
```

`queuedById` is stored for abuse handling and moderation only. It must never
appear in any tRPC response, websocket payload, or log accessible to clients.
Write a test that asserts this.

### 2.2 Behaviour

- From a controller, a player can queue a card at another player.
- The target sees only a count: "3 cards queued for you." Never who, never
  which.
- The stage, when advancing, pulls from the queue for the current target if one
  exists, otherwise draws normally.
- **Cross-session persistence:** a player can queue cards for a person *between*
  sessions, if both are registered users. This is the anticipation mechanic —
  the reason to open the app on a Tuesday. Model this as a queue that survives
  room end and gets pulled into the next room containing both players.

### 2.3 Abuse guard

Anonymous + aimed is a harassment vector. Before shipping:
- Rate limit queuing per player per room.
- Target can decline the queue entirely (nuclear option, visible to the room so
  it carries social cost rather than being a silent escape).
- Server-side ability to trace `queuedById` for reports.

### STOP — Phase 2 gate

- [ ] Played with real people. Did the aimed queue change behaviour at the
      table?
- [ ] Verified `queuedById` does not leak in any client-visible payload.

---

## Phase 3 — Group Verdict

**Goal:** replace self-declared truth/sip with a group vote. This produces the
telemetry that Phases 4–6 depend on. Do not skip or reorder it.

### 3.1 Model

```prisma
model Verdict {
  id       String   @id @default(cuid())
  turnId   String
  voterId  String                       // Player.id
  vote     VoteType                     // ACCEPTED | CONTESTED
  castAt   DateTime @default(now())

  @@unique([turnId, voterId])
}
```

Add to `Turn`: `outcome` (`TRUTH_ACCEPTED | CONTESTED_DRANK | SKIPPED_DRANK`)
and `escalatedFromTurnId String?` (used in Phase 3.3).

### 3.2 Behaviour

- Player answers out loud.
- Every controller except the answering player shows two buttons.
- Votes are hidden until all are in (or a short timer expires), then revealed on
  the stage at once. Simultaneous reveal is the whole drama — do not show a live
  running tally.
- If the table doesn't buy it, they drink anyway.
- Persist the aggregate on the `Turn`.

### 3.3 Escalation as a first-class action

Escalation currently happens by accident and the app doesn't know about it.
Give the stage an **Escalate** button that serves a deeper follow-up on the same
theme.

This requires the card model to stop being a standalone string and become a
node in a graph:

```prisma
model CardRelation {
  id           String       @id @default(cuid())
  fromCardId   String
  toCardId     String
  relationType RelationType  // HARDER_VERSION | FOLLOW_UP
}
```

- Add `depth Int` to the card model.
- Escalate pulls a `HARDER_VERSION` or `FOLLOW_UP` from the current card. If
  none exists, fall back to same-category next-depth.
- Record `escalatedFromTurnId` so escalation chains are queryable. Chain length
  is a strong quality signal — a card that reliably produces long chains is a
  great card.

### 3.4 Telemetry

Per card, derive and store rolling aggregates:
- times played
- contest rate (`CONTESTED / total`)
- escalation trigger rate
- mean escalation chain length when used as a chain root

Contest rate is a better quality signal than any star rating, because nobody
rates cards but everybody votes in the moment. This is the single most valuable
dataset the product will generate. Treat it accordingly.

### STOP — Phase 3 gate

- [ ] Simultaneous reveal feels dramatic, not laggy, on real phones.
- [ ] Escalation chains are being recorded correctly with parent links.
- [ ] Telemetry aggregates are populating and plausible.

---

## Phase 4 — Night Recap

**Goal:** give the game a past tense. This is what makes people say "we have to
play again" on Monday instead of forgetting until December.

On room end, generate a shareable recap. Candidate items — pick the ones the
data actually supports well, don't force all of them:

- Who got targeted most
- Most contested answer of the night
- Longest escalation chain ("this card caused a 20-minute argument")
- Truth/sip ratio per player
- The card nobody would answer

Requirements:
- Distinct URL per recap. Works for guests via claim link (1.5).
- Designed to be screenshotted. Vertical, phone-shaped, legible when
  compressed by messaging apps.
- Every player in the room can access it; content is identical for all of them.

Privacy: recaps contain answers *about* people. Ship a per-room "make this
recap private" control before launch, and make sure a player can opt their own
name out.

### STOP — Phase 4 gate

- [ ] A recap has been voluntarily shared by a real player without prompting.

---

## Phase 5 — Creator Telemetry in the Hub

**Goal:** the hub is the moat. Turn it from a tool into a place with status.

Give card authors a dashboard fed by Phase 3 telemetry:

> Your card has been played 40,000 times, contested 31% of the time, and it's
> the #2 escalation trigger in the "exes" deck.

- Per-card stats page for the author.
- Deck-level rollups.
- A visible ladder. Creating a card that gets played by strangers unlocks
  something obtainable no other way.

### Preserve and sharpen the earn-only economy

Cards are earned by playing or creating. Never purchasable. Keep this — earned
content beats bought content for retention. But make the ladder **legible**:

- Playing a night unlocks the next tier of the deck you were playing.
- Creating a card that reaches N plays by non-friends unlocks creator-only
  content.
- Show progress toward the next unlock explicitly. Scarcity only motivates when
  the path is visible.

### Authoring must support the card graph

Update the hub's card editor for Phase 3.3's model: authors need to attach
harder versions and follow-ups, and set depth. This is the meatier authoring
work that makes the creator tools genuinely interesting rather than a text form.

### STOP — Phase 5 gate

- [ ] A creator who is not you has authored a card *with* an escalation chain.

---

## Phase 6 — Public Live Feed

**Goal:** make `tappen.app` feel populated. Last, because it is only impressive
once there is volume. Shipping this early makes the product look dead.

**Do not publish raw questions or answers.** Boring and a privacy hazard.
Publish anonymised aggregate drama:

- "1,240 rooms live right now"
- "Most contested card tonight"
- "This deck was just unlocked for the first time by someone in Lisbon"
- Global truth-vs-sip ratio, live

Rules:
- No player names, ever.
- No answer content, ever.
- Geographic granularity: city at most, and only where volume is high enough
  that it can't identify a specific room.
- Cache aggressively. This is a marketing surface, not a realtime system.

### Gate

Only start this phase once concurrent room counts are high enough that the feed
looks alive at 3am on a Tuesday. If it doesn't, delay.

---

## Cross-Cutting Requirements

### Testing
- Room lifecycle: create → join → play → end → claim.
- Reconnect for both stage and controller roles.
- Hidden-information tests: assert `QueuedCard.queuedById` and in-flight
  `Verdict.vote` values never reach clients.
- Multi-instance safety for the websocket layer if horizontally scaled.

### Observability
- Log every intent with room id, player id, intent type.
- Track: median room duration, players per room, turns per room, guest→account
  conversion rate.
- Guest→account conversion is the top-line growth metric. Instrument it in
  Phase 1, not later.

### Migrations
- One migration per phase, reviewed before apply.
- Never destructive to existing decks or user-created content. Card authors'
  work is the most valuable data in the system.

### Things explicitly out of scope
- Remote/online play between people not in the same physical room.
- Text or voice chat. The players are already talking to each other.
- Any purchasable content.
- Full card text rendered on controllers.

---

## Reporting Back

At each STOP gate, report:
1. What shipped.
2. What the real-world playtest revealed.
3. What you'd change about the *next* phase based on 2.

Point 3 matters most. This plan is a hypothesis, and phases 4–6 should be
rewritten based on what phases 1–3 teach.
