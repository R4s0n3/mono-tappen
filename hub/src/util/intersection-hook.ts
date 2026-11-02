import { useEffect, useRef } from "react";

interface IntersectionObserverHookProps {
  onIntersect: () => void; // Callback function to fire when intersecting
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export const useIntersectionObserver = ({
  onIntersect,
  root = null,
  rootMargin = "0px",
  threshold = 0,
}: IntersectionObserverHookProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry!.isIntersecting) {
          onIntersect();
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(ref.current);
    const currentRef =  ref.current
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [ref, onIntersect, root, rootMargin, threshold]);

  return ref;
};
