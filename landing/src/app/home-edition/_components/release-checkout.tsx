"use client";

import { useEffect, useRef } from "react";

import { cancelHomeCheckout } from "@/server/home/checkout";

export function ReleaseCheckout({ sessionId }: { sessionId: string }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void cancelHomeCheckout(sessionId);
  }, [sessionId]);

  return null;
}
