"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import {
  dealTransform,
  flyOutTransform,
  restTransform,
  SWIPE_THRESHOLD,
  type CardTransform,
} from "@/shared/card-transform";
import CardSkin from "../tappen-card/_elements/card-skin";
import type { CardSocket, RoomStatus } from "./types";

const SEND_INTERVAL_MS = 32;
const DRAG_Y_MIN = 0.18;
const DRAG_Y_MAX = 0.82;

export type LiveCardHandle = {
  swipeAway: (direction?: 1 | -1) => void;
};

type LiveCardProps = {
  content: string;
  skinId: string;
  sequence: number;
  interactive: boolean;
  canAdvance: boolean;
  intro: boolean;
  variant: "stage" | "hand";
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
  { content, skinId, sequence, interactive, canAdvance, intro, variant, socket, onAdvance },
  ref,
) {
  const areaRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [holding, setHolding] = useState(false);

  const socketRef = useRef(socket);
  socketRef.current = socket;
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;
  const sequenceRef = useRef(sequence);
  sequenceRef.current = sequence;
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;
  const variantRef = useRef(variant);
  variantRef.current = variant;
  const canAdvanceRef = useRef(canAdvance);
  canAdvanceRef.current = canAdvance;

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
  const publishRef = useRef<(pose: CardTransform) => void>(() => undefined);
  const commitSwipeRef = useRef<(direction: 1 | -1) => Promise<void>>(async () => undefined);

  const grab = useRef({ x: 0, y: 0 });
  const origin = useRef({ x: 0, y: 0 });
  const queued = useRef<CardTransform | null>(null);
  const sendRaf = useRef(0);
  const lastSent = useRef(0);

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
      const cap = variantRef.current === "stage" ? 512 : 352;
      const maxW = Math.min(rect.width * 0.8, cap);
      const maxH = rect.height * 0.74;
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
      const hostSnap = interactiveRef.current && !reduce;
      const follow = hostSnap ? 1 : 1 - Math.exp(-dt / (target.dragging ? 40 : 120));
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

  useEffect(() => {
    return socket.subscribeTransform(({ transform, snap }) => {
      // The host is the source of the pose. Echoes would fight the finger.
      // A new turn still snaps so the deal-in starts in the same place.
      if (interactiveRef.current && !snap) return;
      if (snap) {
        const sequenceChanged = transform.sequence !== targetRef.current.sequence;
        if (sequenceChanged) epoch.current += 1;
        const display = displayRef.current;
        display.x = transform.x;
        display.y = transform.y;
        display.rotation = transform.rotation;
        if (sequenceChanged) display.rotY = transform.flipped ? 180 : 0;
        paintRef.current(displayRef.current);
      }
      targetRef.current = transform;
      wakeRef.current();
    });
  }, [socket]);

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
    };
  }, []);

  const publish = (pose: CardTransform) => {
    targetRef.current = pose;
    wakeRef.current();
    if (!interactiveRef.current) return;
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

  const animate = (from: CardTransform, to: CardTransform, ms: number, token: number) => {
    return new Promise<void>((resolve) => {
      const started = performance.now();
      const step = (now: number) => {
        if (epoch.current !== token) {
          resolve();
          return;
        }
        const p = Math.min(1, (now - started) / ms);
        publishRef.current(lerp(from, to, easeOut(p)));
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  };

  const springBack = async () => {
    const token = ++epoch.current;
    controlling.current = true;
    const from = { ...targetRef.current, dragging: false };
    const to = {
      ...restTransform(sequenceRef.current),
      flipped: from.flipped,
      dragging: false,
    };
    await animate(from, to, 260, token);
    if (epoch.current === token) controlling.current = false;
  };

  const runDeal = () => {
    const token = ++epoch.current;
    controlling.current = true;
    const seq = sequenceRef.current;
    const from = dealTransform(seq);
    const to = restTransform(seq);
    void animate(from, to, 520, token).then(() => {
      if (epoch.current === token) controlling.current = false;
    });
  };

  const commitSwipe = async (direction: 1 | -1) => {
    if (committing.current) return;
    if (!canAdvanceRef.current) {
      await springBack();
      return;
    }
    committing.current = true;
    const token = ++epoch.current;
    controlling.current = true;
    const from = { ...targetRef.current, dragging: false };
    const to = flyOutTransform(sequenceRef.current, direction, from.flipped);
    try {
      await animate(from, to, 320, token);
      if (epoch.current !== token) return;
      await onAdvanceRef.current();
    } catch {
      if (epoch.current === token) {
        committing.current = false;
        await springBack();
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
    if (!interactive) return;
    const prev = seenSequence.current;
    seenSequence.current = sequence;
    if (prev === undefined) {
      if (intro) runDeal();
      return;
    }
    if (prev !== sequence) runDeal();
    // runDeal is recreated each render and only uses refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, intro, sequence]);

  const pointFrom = (event: { clientX: number; clientY: number }) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactiveRef.current || committing.current || event.button !== 0) return;
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
    const pose = targetRef.current;
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
    void springBack();
  };

  const textSize =
    content.length > 160 ? "text-lg md:text-2xl" : content.length > 80 ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl";

  return (
    <div
      ref={areaRef}
      className="relative min-h-0 w-full flex-1 touch-none overflow-hidden overscroll-none"
      style={{ touchAction: "none" }}
    >
      <div
        ref={cardRef}
        className={`absolute left-0 top-0 aspect-[5/6.9] select-none [transform-style:preserve-3d] ${
          interactive ? (holding ? "cursor-grabbing" : "cursor-grab") : ""
        } ${holding ? "shadow-[0_28px_50px_rgba(0,0,0,0.45)]" : "shadow-[0_18px_36px_rgba(0,0,0,0.35)]"}`}
        style={{ touchAction: "none", WebkitTouchCallout: "none", willChange: "transform" }}
        onPointerDown={interactive ? onPointerDown : undefined}
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerUp={interactive ? endDrag : undefined}
        onPointerCancel={interactive ? endDrag : undefined}
      >
        <CardSkin skinId={skinId}>
          <div className="relative size-full [transform-style:preserve-3d]">
            <div className="absolute inset-0 flex flex-col justify-between [backface-visibility:hidden]">
              <p className={`flex-1 overflow-hidden font-serif leading-snug ${textSize}`}>{content}</p>
              <div className="mt-4 text-center text-xs uppercase tracking-widest opacity-70">
                turn {sequence}
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded bg-tappen-blue-900 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="flex size-[86%] items-center justify-center rounded-sm border-2 border-dashed border-tappen-sunset-500/80">
                <span className="font-bang text-3xl tracking-[0.28em] text-tappen-sunset-400">TAPPEN</span>
              </div>
            </div>
          </div>
        </CardSkin>
      </div>
    </div>
  );
});
