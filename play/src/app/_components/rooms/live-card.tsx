"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
import {
  CardSkinFrame,
  useResolvedCardSkin,
} from "../tappen-card/_elements/card-skin";
import { CardBack } from "../tappen-card/card-back";
import {
  CardFace,
  CardFooterFrame,
  cardFooterLabelClass,
} from "../tappen-card/card-face";
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
  /** True while the room is looking at the back. */
  onFaceDown?: (faceDown: boolean) => void;
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

function lerp(
  from: CardTransform,
  to: CardTransform,
  p: number,
): CardTransform {
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

export const LiveCard = forwardRef<LiveCardHandle, LiveCardProps>(
  function LiveCard(
    {
      content,
      skinId,
      playSkin,
      sequence,
      canDrag,
      canAdvance,
      playerId,
      intro,
      socket,
      onAdvance,
      onFaceDown,
    },
    ref,
  ) {
    const areaRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const shadowRef = useRef<HTMLDivElement>(null);
    const flipperRef = useRef<HTMLDivElement>(null);
    const resolvedSkin = useResolvedCardSkin(skinId, undefined, playSkin);
    const [holding, setHolding] = useState(false);
    const [heldByName, setHeldByName] = useState<string | null>(null);
    const opening = socket.getTransform();
    const [faceDown, setFaceDown] = useState(opening.flipped);

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
    const releasePendingRef = useRef(false);

    const initial = opening;
    const targetRef = useRef<CardTransform>(initial);
    const faceDownRef = useRef(initial.flipped);
    const onFaceDownRef = useRef(onFaceDown);
    onFaceDownRef.current = onFaceDown;

    const rememberFace = (flipped: boolean) => {
      if (faceDownRef.current === flipped) return;
      faceDownRef.current = flipped;
      setFaceDown(flipped);
    };
    const rememberFaceRef = useRef(rememberFace);
    rememberFaceRef.current = rememberFace;
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
    const publishRef = useRef<
      (pose: CardTransform, sendToRoom?: boolean) => void
    >(() => undefined);
    const commitSwipeRef = useRef<(direction: 1 | -1) => Promise<void>>(
      async () => undefined,
    );
    const cancelKind = useRef<"turn" | "lock" | null>(null);

    const grab = useRef({ x: 0, y: 0 });
    const origin = useRef({ x: 0, y: 0 });
    const queued = useRef<CardTransform | null>(null);
    const sendRaf = useRef(0);
    const lastSent = useRef(0);
    const keepaliveRef = useRef(0);

    useLayoutEffect(() => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reduce = media.matches;
      const onMotion = () => {
        reduce = media.matches;
      };
      media.addEventListener("change", onMotion);
      let frame = 0;
      let alive = true;
      let last = performance.now();

      const paint = (pose: DisplayPose) => {
        const area = areaRef.current;
        const card = cardRef.current;
        if (!area || !card) return;
        const flipper = flipperRef.current;
        const shadow = shadowRef.current;
        const rect = area.getBoundingClientRect();
        // Solo play renders the card at max-w-xs (20rem). Use that width for
        // both seats, and only shrink when the stage cannot hold it.
        const soloWidth = 320;
        const maxW = Math.min(Math.max(0, rect.width - 40), soloWidth);
        const maxH = Math.max(0, rect.height - 16);
        const width = Math.max(140, Math.min(maxW, maxH * (5 / 6.9)));
        const placed = `translate3d(${pose.x * rect.width}px, ${pose.y * rect.height}px, 0) translate3d(-50%, -50%, 0) rotate(${pose.rotation}deg)`;
        card.style.width = `${width}px`;
        // Position stays off the spinning plane so the shadow does not flip.
        card.style.transform = placed;
        if (shadow) {
          shadow.style.width = `${width}px`;
          shadow.style.transform = placed;
        }
        if (flipper) flipper.style.transform = `rotateY(${pose.rotY}deg)`;
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
        const localSource =
          (controlling.current || dragging.current) && !reduce;
        const follow = localSource
          ? 1
          : 1 - Math.exp(-dt / (target.dragging ? 40 : 120));
        display.x += (target.x - display.x) * follow;
        display.y += (target.y - display.y) * follow;
        display.rotation += (target.rotation - display.rotation) * follow;
        const goalY = target.flipped ? 180 : 0;
        if (reduce) {
          display.rotY = goalY;
        } else {
          const rotK = 1 - Math.exp(-dt / 150);
          display.rotY += (goalY - display.rotY) * rotK;
        }
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
      paint(displayRef.current);
      wakeRef.current();

      return () => {
        alive = false;
        media.removeEventListener("change", onMotion);
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
        const sequenceChanged =
          snap && transform.sequence !== targetRef.current.sequence;
        const otherHolder = incomingHolder != null && incomingHolder !== mine;
        const releaseAck =
          releasePendingRef.current &&
          !transform.dragging &&
          incomingHolder == null;
        if (releaseAck || sequenceChanged || otherHolder) {
          releasePendingRef.current = false;
        }
        // A quiet hold expires on the server. A release echo is not that: the
        // next grab waits until this one is acknowledged, so a late echo cannot
        // cancel a newer finger.
        const serverReleased =
          dragging.current && !transform.dragging && incomingHolder == null;

        if (sequenceChanged || otherHolder || serverReleased) {
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
        rememberFaceRef.current(transform.flipped);
        noteHolder(transform);
        wakeRef.current();
      });
    }, [noteHolder, socket, stopKeepalive]);

    useEffect(() => {
      onFaceDownRef.current?.(faceDown);
    }, [faceDown]);

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
      rememberFace(pose.flipped);
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
      releasePendingRef.current = true;
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
      const to = { ...restTransform(seq), flipped: true };
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

    useImperativeHandle(
      ref,
      () => ({
        swipeAway(direction: 1 | -1 = 1) {
          void commitSwipeRef.current(direction);
        },
      }),
      [],
    );

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
      if (
        !canDragRef.current ||
        heldByOtherRef.current ||
        releasePendingRef.current ||
        committing.current ||
        event.button !== 0
      ) {
        return;
      }
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
        releasePendingRef.current = true;
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
        <div className="card-flip-scene pointer-events-none absolute inset-0">
          <div
            ref={shadowRef}
            aria-hidden
            className={`pointer-events-none absolute left-0 top-0 aspect-[5/6.9] rounded ${
              holding
                ? "shadow-[0_28px_50px_rgba(0,0,0,0.45)]"
                : "shadow-[0_18px_36px_rgba(0,0,0,0.35)]"
            }`}
          />
          <div
            ref={cardRef}
            className={`card-flip-root pointer-events-auto absolute left-0 top-0 aspect-[5/6.9] select-none ${
              canDrag && !heldByName
                ? holding
                  ? "cursor-grabbing"
                  : "cursor-grab"
                : ""
            }`}
            style={{ touchAction: "none", WebkitTouchCallout: "none" }}
            onPointerDown={canDrag ? onPointerDown : undefined}
            onPointerMove={canDrag ? onPointerMove : undefined}
            onPointerUp={canDrag ? endDrag : undefined}
            onPointerCancel={canDrag ? endDrag : undefined}
          >
            <div ref={flipperRef} className="card-flip">
              <div className="card-flip-face" aria-hidden={faceDown}>
                <CardSkinFrame resolved={resolvedSkin}>
                  <div className="flex h-full min-h-0 flex-col">
                    <CardFace
                      className="min-h-0 w-full flex-1"
                      content={content}
                      footer={
                        <CardFooterFrame
                          label={
                            <p className={cardFooterLabelClass}>
                              turn {sequence}
                            </p>
                          }
                          actions={
                            <span aria-hidden className="block h-8 w-0" />
                          }
                        />
                      }
                    />
                  </div>
                </CardSkinFrame>
              </div>
              <div
                className="card-flip-face card-flip-face-back"
                aria-hidden={!faceDown}
              >
                <CardSkinFrame resolved={resolvedSkin}>
                  <CardBack
                    fontColor={resolvedSkin.skin.font.color}
                    pattern={resolvedSkin.pattern}
                  />
                </CardSkinFrame>
              </div>
            </div>
          </div>
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
  },
);
