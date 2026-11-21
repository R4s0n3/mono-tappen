"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import {
  dealTransform,
  DRAG_Y_MAX,
  DRAG_Y_MIN,
  flyOutTransform,
  restTransform,
  SWIPE_THRESHOLD,
  type CardTransform,
} from "@/shared/card-transform";
import type { PlaySkin } from "@/shared/own-skin";
import CardSkin from "../tappen-card/_elements/card-skin";
import { CardFace, CardFooterFrame, cardFooterLabelClass } from "../tappen-card/card-face";
import type { CardSocket, RoomStatus } from "./types";

const SEND_INTERVAL_MS = 32;
const HOLD_KEEPALIVE_MS = 1000;

export type LiveCardHandle = {
  swipeAway: (direction?: 1 | -1) => void;
};

type LiveCardProps = {
  content: string;
  skinId: string;
  playSkin?: PlaySkin | null;
  sequence: number;
  /** This seat may grab the card. Skip and draw are separate. */
  canDrag: boolean;
  /** Host only. Swipe, flip, and the next-card button. */
  canAdvance: boolean;
  playerId: string;
  intro: boolean;
  socket: CardSocket;
  onAdvance: () => Promise<void>;
};

type DisplayPose = {
  x: number;
  y: number;
  rotation: number;
  rotY: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function lerp(from: CardTransform, to: CardTransform, p: number): CardTransform {
  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y + (to.y - from.y) * p,
    rotation: from.rotation + (to.rotation - from.rotation) * p,
    flipped: p < 1 ? from.flipped : to.flipped,
    dragging: false,
    sequence: to.sequence,
  };
}

function easeOut(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

/** True for the render that enters ACTIVE, so the host can deal the first card. */
export function useDealIntro(status: RoomStatus) {
  const prev = useRef(status);
  const intro = prev.current !== "ACTIVE" && status === "ACTIVE";
  useEffect(() => {
    prev.current = status;
  }, [status]);
  return intro;
}

export const LiveCard = forwardRef<LiveCardHandle, LiveCardProps>(function LiveCard(
  { content, skinId, playSkin, sequence, canDrag, canAdvance, playerId, intro, socket, onAdvance },
  ref,
) {
  const areaRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [holding, setHolding] = useState(false);
  const [heldByName, setHeldByName] = useState<string | null>(null);

  const socketRef = useRef(socket);
  socketRef.current = socket;
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;
  const sequenceRef = useRef(sequence);
  sequenceRef.current = sequence;
  const canDragRef = useRef(canDrag);
  canDragRef.current = canDrag;
  const canAdvanceRef = useRef(canAdvance);
  canAdvanceRef.current = canAdvance;
  const playerIdRef = useRef(playerId);
  playerIdRef.current = playerId;
  const heldByOtherRef = useRef(false);
  const heldLabelRef = useRef<string | null>(null);

  const initial = socket.getTransform();
  const targetRef = useRef<CardTransform>(initial);
  const displayRef = useRef<DisplayPose>({
    x: initial.x,
    y: initial.y,
    rotation: initial.rotation,
    rotY: initial.flipped ? 180 : 0,
  });

  const paintRef = useRef<(pose: DisplayPose) => void>(() => undefined);
  const controlling = useRef(false);
  const dragging = useRef(false);
  const committing = useRef(false);
  const epoch = useRef(0);
  const wakeRef = useRef<() => void>(() => undefined);
  const publishRef = useRef<(pose: CardTransform, sendToRoom?: boolean) => void>(() => undefined);
  const commitSwipeRef = useRef<(direction: 1 | -1) => Promise<void>>(async () => undefined);
  const cancelKind = useRef<"turn" | "lock" | null>(null);

  const grab = useRef({ x: 0, y: 0 });
  const origin = useRef({ x: 0, y: 0 });
  const queued = useRef<CardTransform | null>(null);
  const sendRaf = useRef(0);
  const lastSent = useRef(0);
  const keepaliveRef = useRef(0);

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let alive = true;
    let last = performance.now();

    const paint = (pose: DisplayPose) => {
      const area = areaRef.current;
      const card = cardRef.current;
      if (!area || !card) return;
      const rect = area.getBoundingClientRect();
      // Solo play renders the card at max-w-xs (20rem). Use that width for
      // both seats, and only shrink when the stage cannot hold it.
      const soloWidth = 320;
      const maxW = Math.min(Math.max(0, rect.width - 40), soloWidth);
      const maxH = Math.max(0, rect.height - 16);
      const width = Math.max(140, Math.min(maxW, maxH * (5 / 6.9)));
      card.style.width = `${width}px`;
      card.style.transform = `translate3d(${pose.x * rect.width}px, ${pose.y * rect.height}px, 0) translate3d(-50%, -50%, 0) rotate(${pose.rotation}deg) rotateY(${pose.rotY}deg)`;
    };
    paintRef.current = paint;

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(48, now - last);
      last = now;
      const target = targetRef.current;
      const display = displayRef.current;
      // The player who is actually moving the card paints that pose immediately.
      // Everyone else eases toward the latest broadcast, including the host
      // while a guest is holding the card.
      const localSource = (controlling.current || dragging.current) && !reduce;
      const follow = localSource ? 1 : 1 - Math.exp(-dt / (target.dragging ? 40 : 120));
      display.x += (target.x - display.x) * follow;
      display.y += (target.y - display.y) * follow;
      display.rotation += (target.rotation - display.rotation) * follow;
      const goalY = target.flipped ? 180 : 0;
      const rotK = reduce ? 1 : 1 - Math.exp(-dt / 80);
      display.rotY += (goalY - display.rotY) * rotK;
      paint(display);

      const moving =
        Math.abs(target.x - display.x) > 0.001 ||
        Math.abs(target.y - display.y) > 0.001 ||
        Math.abs(target.rotation - display.rotation) > 0.08 ||
        Math.abs(goalY - display.rotY) > 0.6 ||
        target.dragging;
      frame = moving ? requestAnimationFrame(tick) : 0;
    };

    wakeRef.current = () => {
      if (!alive || frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    wakeRef.current();

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      frame = 0;
    };
  }, []);

  const stopKeepalive = useCallback(() => {
    if (!keepaliveRef.current) return;
    clearInterval(keepaliveRef.current);
    keepaliveRef.current = 0;
  }, []);

  const noteHolder = useCallback((transform: CardTransform) => {
    const incoming = transform.holderId ?? null;
    const mine = playerIdRef.current;
    const other = incoming != null && incoming !== mine;
    heldByOtherRef.current = other;
    const trimmed = transform.holderName?.trim() ?? "";
    const label = other ? (trimmed.length > 0 ? trimmed : "A player") : null;
    if (label === heldLabelRef.current) return;
    heldLabelRef.current = label;
    setHeldByName(label);
  }, []);

  useEffect(() => {
    return socket.subscribeTransform(({ transform, snap }) => {
      const mine = playerIdRef.current;
      const incomingHolder = transform.holderId ?? null;
      const sequenceChanged = snap && transform.sequence !== targetRef.current.sequence;
      const otherHolder = incomingHolder != null && incomingHolder !== mine;
      // A quiet hold expires on the server. Drop the local finger if it did.
      const serverTookIt = dragging.current && incomingHolder !== mine;

      if (sequenceChanged || otherHolder || serverTookIt) {
        cancelKind.current = sequenceChanged ? "turn" : "lock";
        epoch.current += 1;
        dragging.current = false;
        controlling.current = false;
        setHolding(false);
        stopKeepalive();
      }

      const stillSource = controlling.current || dragging.current;
      if (stillSource && !sequenceChanged) return;

      if (snap || sequenceChanged) {
        const display = displayRef.current;
        display.x = transform.x;
        display.y = transform.y;
        display.rotation = transform.rotation;
        if (sequenceChanged) display.rotY = transform.flipped ? 180 : 0;
        paintRef.current(displayRef.current);
      }
      targetRef.current = transform;
      noteHolder(transform);
      wakeRef.current();
    });
  }, [noteHolder, socket, stopKeepalive]);

  useEffect(() => {
    const block = (event: TouchEvent) => {
      if (dragging.current) event.preventDefault();
    };
    window.addEventListener("touchmove", block, { passive: false });
    const onResize = () => wakeRef.current();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("touchmove", block);
      window.removeEventListener("resize", onResize);
      if (keepaliveRef.current) {
        clearInterval(keepaliveRef.current);
        keepaliveRef.current = 0;
      }
    };
  }, []);

  const publish = (pose: CardTransform, sendToRoom = true) => {
    targetRef.current = pose;
    wakeRef.current();
    if (!sendToRoom) return;
    queued.current = pose;
    if (sendRaf.current) return;

    const pump = (now: number) => {
      sendRaf.current = 0;
      if (!queued.current) return;
      if (now - lastSent.current < SEND_INTERVAL_MS) {
        sendRaf.current = requestAnimationFrame(pump);
        return;
      }
      const next = queued.current;
      queued.current = null;
      lastSent.current = now;
      socketRef.current.send({
        type: "card.transform",
        x: next.x,
        y: next.y,
        rotation: next.rotation,
        flipped: next.flipped,
        dragging: next.dragging,
        sequence: next.sequence,
      });
      if (queued.current) sendRaf.current = requestAnimationFrame(pump);
    };

    sendRaf.current = requestAnimationFrame(pump);
  };
  publishRef.current = publish;

  const animate = (
    from: CardTransform,
    to: CardTransform,
    ms: number,
    token: number,
    sendToRoom: boolean,
  ) => {
    return new Promise<void>((resolve) => {
      const started = performance.now();
      const step = (now: number) => {
        if (epoch.current !== token) {
          resolve();
          return;
        }
        const p = Math.min(1, (now - started) / ms);
        publishRef.current(lerp(from, to, easeOut(p)), sendToRoom);
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  };

  const springBack = async (sendToRoom: boolean) => {
    const token = ++epoch.current;
    controlling.current = true;
    const from = { ...targetRef.current, dragging: false };
    const to = {
      ...restTransform(sequenceRef.current),
      flipped: from.flipped,
      dragging: false,
    };
    if (sendToRoom) {
      await animate(from, to, 260, token, true);
    } else {
      // One release. The server parks the card at rest for everyone else.
      publish(from, true);
      await animate(from, to, 260, token, false);
    }
    if (epoch.current === token) controlling.current = false;
  };

  const runDeal = () => {
    const token = ++epoch.current;
    controlling.current = true;
    const seq = sequenceRef.current;
    const from = dealTransform(seq);
    const to = restTransform(seq);
    void animate(from, to, 520, token, true).then(() => {
      if (epoch.current === token) controlling.current = false;
    });
  };

  const commitSwipe = async (direction: 1 | -1) => {
    if (committing.current) return;
    if (!canAdvanceRef.current) {
      await springBack(false);
      return;
    }
    committing.current = true;
    cancelKind.current = null;
    const token = ++epoch.current;
    controlling.current = true;
    const from = { ...targetRef.current, dragging: false };
    const to = flyOutTransform(sequenceRef.current, direction, from.flipped);
    try {
      await animate(from, to, 320, token, true);
      if (epoch.current !== token) {
        // A guest still holding the card can interrupt the fly-out.
        // The button and the swipe still draw, because only the host got here.
        if (cancelKind.current === "lock") await onAdvanceRef.current();
        return;
      }
      await onAdvanceRef.current();
    } catch {
      if (epoch.current === token) {
        committing.current = false;
        await springBack(true);
      }
    } finally {
      committing.current = false;
      if (epoch.current === token) controlling.current = false;
    }
  };
  commitSwipeRef.current = commitSwipe;

  useImperativeHandle(ref, () => ({
    swipeAway(direction: 1 | -1 = 1) {
      void commitSwipeRef.current(direction);
    },
  }), []);

  const seenSequence = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!canAdvance) return;
    const prev = seenSequence.current;
    seenSequence.current = sequence;
    if (prev === undefined) {
      if (intro) runDeal();
      return;
    }
    if (prev !== sequence) runDeal();
    // runDeal is recreated each render and only uses refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAdvance, intro, sequence]);

  const pointFrom = (event: { clientX: number; clientY: number }) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canDragRef.current || heldByOtherRef.current || committing.current || event.button !== 0) return;
    const point = pointFrom(event);
    if (!point) return;
    epoch.current += 1;
    dragging.current = true;
    controlling.current = true;
    setHolding(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = point;
    const pose = targetRef.current;
    grab.current = { x: pose.x - point.x, y: pose.y - point.y };
    lastSent.current = 0;
    publish({ ...pose, dragging: true, sequence: sequenceRef.current });
    stopKeepalive();
    // A still finger keeps the lock. The server releases it if these stop.
    keepaliveRef.current = window.setInterval(() => {
      if (!dragging.current) return;
      const current = targetRef.current;
      publish({ ...current, dragging: true, sequence: sequenceRef.current });
    }, HOLD_KEEPALIVE_MS);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const point = pointFrom(event);
    if (!point) return;
    const x = clamp(point.x + grab.current.x, 0, 1);
    const y = clamp(point.y + grab.current.y, DRAG_Y_MIN, DRAG_Y_MAX);
    publish({
      x,
      y,
      rotation: clamp((x - 0.5) * 36, -24, 24),
      flipped: targetRef.current.flipped,
      dragging: true,
      sequence: sequenceRef.current,
    });
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setHolding(false);
    stopKeepalive();
    const pose = targetRef.current;
    // Guests can move the card, then it returns home. A fling is not a skip.
    if (!canAdvanceRef.current) {
      void springBack(false);
      return;
    }
    const startX = origin.current.x + grab.current.x;
    const startY = origin.current.y + grab.current.y;
    const moved = Math.hypot(pose.x - startX, pose.y - startY);
    if (moved < 0.035) {
      const home = restTransform(sequenceRef.current);
      publish({ ...home, flipped: !pose.flipped, dragging: false });
      controlling.current = false;
      return;
    }
    if (pose.x - 0.5 > SWIPE_THRESHOLD) {
      void commitSwipe(1);
      return;
    }
    if (0.5 - pose.x > SWIPE_THRESHOLD) {
      void commitSwipe(-1);
      return;
    }
    void springBack(true);
  };

  return (
    <div
      ref={areaRef}
      className="relative min-h-0 w-full flex-1 touch-none overflow-hidden overscroll-none"
      style={{ touchAction: "none" }}
    >
      <div
        ref={cardRef}
        className={`absolute left-0 top-0 aspect-[5/6.9] select-none [transform-style:preserve-3d] ${
          canDrag && !heldByName ? (holding ? "cursor-grabbing" : "cursor-grab") : ""
        } ${holding ? "shadow-[0_28px_50px_rgba(0,0,0,0.45)]" : "shadow-[0_18px_36px_rgba(0,0,0,0.35)]"}`}
        style={{ touchAction: "none", WebkitTouchCallout: "none", willChange: "transform" }}
        onPointerDown={canDrag ? onPointerDown : undefined}
        onPointerMove={canDrag ? onPointerMove : undefined}
        onPointerUp={canDrag ? endDrag : undefined}
        onPointerCancel={canDrag ? endDrag : undefined}
      >
        <CardSkin skinId={skinId} playSkin={playSkin}>
          <div className="relative size-full [transform-style:preserve-3d]">
            <div className="absolute inset-0 flex flex-col [backface-visibility:hidden]">
              <CardFace
                className="min-h-0 w-full flex-1"
                content={content}
                footer={
                  <CardFooterFrame
                    label={<p className={cardFooterLabelClass}>turn {sequence}</p>}
                    actions={<span aria-hidden className="block h-8 w-0" />}
                  />
                }
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded bg-tappen-blue-900 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="flex size-[86%] items-center justify-center rounded-sm border-2 border-dashed border-tappen-sunset-500/80">
                <span className="font-bang text-3xl tracking-[0.28em] text-tappen-sunset-400">TAPPEN</span>
              </div>
            </div>
          </div>
        </CardSkin>
      </div>
      {heldByName ? (
        <p
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs font-semibold text-tappen-blue-100"
        >
          {heldByName} is holding
        </p>
      ) : null}
    </div>
  );
});
