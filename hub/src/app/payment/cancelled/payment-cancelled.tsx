"use client";

import { api } from "@/trpc/react";
import { XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function PaymentCancelled({ paymentId }: { paymentId?: string }) {
  const started = useRef(false);
  const cancelCheckout = api.payment.cancelCheckout.useMutation();

  useEffect(() => {
    if (!paymentId || started.current) return;
    started.current = true;
    cancelCheckout.mutate({ paymentId });
  }, [cancelCheckout, paymentId]);

  const completed = cancelCheckout.data?.status === "COMPLETED";

  return (
    <div className="size-full min-h-screen flex flex-col justify-center gap-8 items-center">
      {completed ? (
        <CheckCircleIcon className="size-8 text-tappen-green-400" />
      ) : (
        <XMarkIcon className="size-8 text-tappen-purple-400" />
      )}
      <p>{completed ? "Payment completed." : "Payment cancelled."}</p>
      <Link href="/shop">Back to Shop</Link>
    </div>
  );
}
