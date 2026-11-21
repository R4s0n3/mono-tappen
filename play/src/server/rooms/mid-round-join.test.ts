/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Server check that a player can join while a round is already running and
 * receives the live card. Skipped unless DATABASE_URL points at Postgres.
 */
const databaseUrl = process.env.DATABASE_URL;

describe(
  "mid-round join",
  { skip: databaseUrl ? false : "DATABASE_URL is not set" },
  () => {
    it("accepts a new player during an active round and returns the current card", async () => {
      process.env.DATABASE_URL = databaseUrl;
      process.env.NODE_ENV ??= "test";

      const { PrismaClient } = await import("@prisma/client");
      const { joinRoom } = await import("./join-room.ts");
      const { hub, roomView } = await import("./room-view.ts");
      const db = new PrismaClient();

      const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
      const code = `M${stamp.slice(-5).toUpperCase()}`.replace(/[01OI]/g, "2");
      const endedCode = `E${stamp.slice(-5).toUpperCase()}`.replace(
        /[01OI]/g,
        "3",
      );
      const content = `Still on the table ${stamp}`;

      const author = await db.user.create({
        data: {
          name: "Mid Round",
          email: `mid-round-${stamp}@test.tappen.app`,
        },
      });
      const background = await db.skinBackground.create({
        data: {
          type: "radial",
          animation: "liquid",
          primary: "#111111",
          secondary: "#222222",
        },
      });
      const border = await db.skinBorder.create({
        data: { frame: "classic", rarity: "common" },
      });
      const font = await db.skinFont.create({
        data: { type: "serif", color: "mid" },
      });
      const skin = await db.skin.create({
        data: {
          name: `Mid ${stamp}`,
          price: 0,
          skinBackgroundId: background.id,
          skinBorderId: border.id,
          skinFontId: font.id,
        },
      });
      const card = await db.card.create({
        data: {
          content,
          nsfw: false,
          visible: "PUBLIC",
          health: 1000000,
          authorId: author.id,
          skinId: skin.id,
        },
      });

      let roomId: string | null = null;
      let endedId: string | null = null;
      const handlers = new Map<string, (raw?: unknown) => void>();
      const sent: string[] = [];

      try {
        const room = await db.room.create({
          data: { code, status: "ACTIVE" },
        });
        roomId = room.id;
        const host = await db.player.create({
          data: { roomId: room.id, displayName: "Stage", role: "STAGE" },
        });
        await db.room.update({
          where: { id: room.id },
          data: { hostId: host.id },
        });
        await db.turn.create({
          data: { roomId: room.id, cardId: card.cardId, sequence: 2 },
        });

        const ended = await db.room.create({
          data: { code: endedCode, status: "ENDED", endedAt: new Date() },
        });
        endedId = ended.id;

        const sock = {
          readyState: 1,
          send(payload: string) {
            sent.push(payload);
          },
          on(event: string, cb: (raw?: unknown) => void) {
            handlers.set(event, cb);
          },
          ping() {
            return undefined;
          },
          terminate() {
            return undefined;
          },
        };
        hub.attach(sock as never);

        const waitFor = async (label: string, predicate: () => boolean) => {
          for (let attempt = 0; attempt < 50; attempt++) {
            if (predicate()) return;
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
          throw new Error(
            `${label} timed out. Last socket messages: ${sent.slice(-3).join(" | ")}`,
          );
        };

        handlers.get("message")?.(
          JSON.stringify({
            type: "subscribe",
            roomId: room.id,
            token: host.connectionToken,
          }),
        );
        await waitFor("host snapshot", () =>
          sent.some((raw) => raw.includes('"type":"state"')),
        );

        handlers.get("message")?.(
          JSON.stringify({
            type: "card.transform",
            x: 0.72,
            y: 0.41,
            rotation: 8,
            flipped: false,
            dragging: true,
            sequence: 2,
          }),
        );
        await waitFor("live pose", () =>
          sent.some((raw) => raw.includes('"type":"card.transform"')),
        );

        const joined = await joinRoom(db, {
          code: code.toLowerCase(),
          displayName: "Riley",
          userId: null,
        });
        assert.equal(joined.roomId, room.id);
        assert.ok(joined.token);
        assert.equal(joined.state?.status, "ACTIVE");
        assert.equal(joined.state?.code, code);
        assert.equal(joined.state?.turn?.sequence, 2);
        assert.equal(joined.state?.turn?.cardId, card.cardId);
        assert.equal(joined.state?.turn?.content, content);
        assert.equal(joined.state?.cardTransform?.dragging, true);
        assert.ok(
          Math.abs((joined.state?.cardTransform?.x ?? 0) - 0.72) < 0.001,
        );
        assert.equal(
          joined.state?.players.some(
            (player) =>
              player.id === joined.playerId && player.displayName === "Riley",
          ),
          true,
        );

        const snapshot = await roomView(joined.roomId, "CONTROLLER");
        assert.equal(snapshot?.status, "ACTIVE");
        assert.equal(snapshot?.turn?.content, content);
        assert.equal(snapshot?.turn?.sequence, 2);
        assert.equal(snapshot?.cardTransform?.dragging, true);

        await assert.rejects(
          () =>
            joinRoom(db, {
              code: endedCode,
              displayName: "Too Late",
              userId: null,
            }),
          (error: unknown) => {
            assert.ok(error instanceof Error);
            assert.match(error.message, /this room has ended/);
            return true;
          },
        );
      } finally {
        handlers.get("close")?.();
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (roomId)
          await db.room
            .delete({ where: { id: roomId } })
            .catch(() => undefined);
        if (endedId)
          await db.room
            .delete({ where: { id: endedId } })
            .catch(() => undefined);
        await db.card
          .delete({ where: { cardId: card.cardId } })
          .catch(() => undefined);
        await db.skin.delete({ where: { id: skin.id } }).catch(() => undefined);
        await db.skinBackground
          .delete({ where: { id: background.id } })
          .catch(() => undefined);
        await db.skinBorder
          .delete({ where: { id: border.id } })
          .catch(() => undefined);
        await db.skinFont
          .delete({ where: { id: font.id } })
          .catch(() => undefined);
        await db.user
          .delete({ where: { id: author.id } })
          .catch(() => undefined);
        await db.$disconnect();
      }
    });
  },
);
