"use client";

import { api } from "@/trpc/react";
import { ArrowPathIcon, ChevronLeftIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function BundleCheckout({ productId }: { productId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const { mutate, data, isError, error, isPending } = api.payment.createBundleIntent.useMutation();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate({ product: productId });
  }, [mutate, productId]);

  useEffect(() => {
    if (data?.checkout_session) {
      router.push(data.checkout_session);
    }
  }, [data, router]);

  return (
    <div className="w-full flex flex-col gap-8 justify-center items-center max-w-screen-lg">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex w-full px-4 text-center justify-center items-center gap-2 text-3xl uppercase"
      >
        <ChevronLeftIcon className="size-8" /> cancel
      </button>
      {isError ? (
        <span className="font-mono text-xl text-tappen-purple-500">{error.message}</span>
      ) : (
        <span className="flex items-center gap-2">
          <ArrowPathIcon className={`size-8 ${isPending || !data ? "animate-spin" : ""}`} />
          Redirecting to checkout…
        </span>
      )}
    </div>
  );
}
