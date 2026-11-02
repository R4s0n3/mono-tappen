/**
 * Observability: every game intent is logged with room + player + intent type.
 * Guest->account conversion is the top-line growth metric; Player.claimedAt
 * and Player.userId make it queryable (see room.stats).
 */

export function logIntent(
  roomId: string,
  playerId: string,
  intent: string,
  meta?: Record<string, unknown>,
) {
  const entry = {
    ts: new Date().toISOString(),
    event: "intent",
    roomId,
    playerId,
    intent,
    ...meta,
  };
  console.log(JSON.stringify(entry));
}
