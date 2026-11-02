'use client'

import { useRef } from 'react'
import { useGesture } from '@use-gesture/react'
import { useSpring } from '@react-spring/web'

type CardTiltOptions = {
  maxTilt?: number
  perspective?: number
  scale?: number
  enabled?: boolean
}

export type CardTiltAPI = {
  tiltStyle: Record<string, string | number>
  tiltApi: {
    reset: () => void
  }
}

export function useCardTilt(options: CardTiltOptions = {}): CardTiltAPI {
  const {
    maxTilt = 20,
    perspective = 1000,
    scale = 1.02,
    enabled = true
  } = options

  const targetRef = useRef<HTMLDivElement>(null)

  const [{ x, y, scaleS }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    scaleS: 1,
    config: {
      mass: 1,
      tension: 300,
      friction: 20,
    },
  }))

  useGesture(
    {
      onMove: ({ xy: [px, py] }) => {
        if (!targetRef.current || !enabled) return

        const rect = targetRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        const rotateX = ((py - centerY) / (rect.height / 2)) * -maxTilt
        const rotateY = ((px - centerX) / (rect.width / 2)) * maxTilt

        void api.start({
          x: rotateY,
          y: rotateX,
          scaleS: scale,
          immediate: false,
        })
      },
    },
    {
      target: targetRef,
      eventOptions: { passive: true },
    }
  )

  const tiltStyle = {
    transform: `perspective(${perspective}px) rotateX(${y.get()}deg) rotateY(${x.get()}deg) scale(${scaleS.get()})`,
    transformStyle: 'preserve-3d',
    willChange: 'transform',
  }

  return {
    tiltStyle,
    tiltApi: {
      reset: () => void api.start({ x: 0, y: 0, scaleS: 1 }),
    },
  }
}
