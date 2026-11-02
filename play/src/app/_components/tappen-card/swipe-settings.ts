import { useEffect, useMemo, useState } from "react"

export type CardSwipeDirection = 'left' | 'right' | 'up' | 'down'

const MIN_SWIPE_THRESHOLD = 80
const MAX_SWIPE_THRESHOLD = 132
const SWIPE_THRESHOLD_VIEWPORT_FACTOR = 0.24

const getSwipeThreshold = (viewportWidth: number): number => {
  return Math.min(
    MAX_SWIPE_THRESHOLD,
    Math.max(MIN_SWIPE_THRESHOLD, Math.round(viewportWidth * SWIPE_THRESHOLD_VIEWPORT_FACTOR))
  )
}

export const useTappenCardSwipeSettings = () => {
  const [swipeThreshold, setSwipeThreshold] = useState(MIN_SWIPE_THRESHOLD)

  useEffect(() => {
    const applyThresholdFromViewport = () => {
      setSwipeThreshold(getSwipeThreshold(window.innerWidth))
    }

    applyThresholdFromViewport()
    window.addEventListener("resize", applyThresholdFromViewport)

    return () => {
      window.removeEventListener("resize", applyThresholdFromViewport)
    }
  }, [])

  return useMemo(() => ({
    flickOnSwipe: true,
    // Position-based swipes make slow, controlled pulls feel natural.
    swipeRequirementType: 'position' as const,
    swipeThreshold,
    preventSwipe: ['up', 'down'] as CardSwipeDirection[],
  }), [swipeThreshold])
}
