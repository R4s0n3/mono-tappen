"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { createHomeCheckout } from "@/server/home/checkout";
import {
  HOME_MAX_QUANTITY,
  HOME_SHIP_BY_LABEL,
  HOME_UNIT_AMOUNT_CENTS,
  formatEur,
  formatShipping,
  homeOrderTotal,
  type CheckoutFormState,
  type HomeRegion,
} from "@/lib/home/product";

const initialState: CheckoutFormState = { error: null };

type CheckoutFormProps = {
  deCents: number;
  euCents: number;
};

export function CheckoutForm({ deCents, euCents }: CheckoutFormProps) {
  const [state, formAction] = useFormState(createHomeCheckout, initialState);
  const [quantity, setQuantity] = useState(1);
  const [region, setRegion] = useState<HomeRegion>("DE");
  const shipping = region === "DE" ? deCents : euCents;
  const total = homeOrderTotal(quantity, shipping);

  return (
    <form action={formAction} className="flex flex-col gap-6 text-left">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-bold uppercase tracking-[0.18em] text-tappen-blue-200">
          Quantity
        </legend>
        <div className="flex items-center justify-between rounded-full border border-tappen-blue-700 bg-tappen-blue-800/80 px-2 py-2">
          <button
            type="button"
            className="size-11 rounded-full text-2xl font-bold text-tappen-sunset-300 transition hover:bg-tappen-blue-700"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          >
            −
          </button>
          <input
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={HOME_MAX_QUANTITY}
            value={quantity}
            aria-label="Number of boxes"
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isInteger(next)) return;
              setQuantity(Math.min(HOME_MAX_QUANTITY, Math.max(1, next)));
            }}
            className="w-16 bg-transparent text-center text-2xl font-bold [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            className="size-11 rounded-full text-2xl font-bold text-tappen-sunset-300 transition hover:bg-tappen-blue-700"
            aria-label="Increase quantity"
            onClick={() =>
              setQuantity((current) => Math.min(HOME_MAX_QUANTITY, current + 1))
            }
          >
            +
          </button>
        </div>
        <p className="text-sm text-tappen-blue-300">
          Up to {HOME_MAX_QUANTITY} boxes per checkout.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-bold uppercase tracking-[0.18em] text-tappen-blue-200">
          Shipping
        </legend>
        <RegionOption
          region="DE"
          current={region}
          title="Germany"
          detail="Addresses in Germany"
          price={formatShipping(deCents)}
          onSelect={setRegion}
        />
        <RegionOption
          region="EU"
          current={region}
          title="Rest of the EU"
          detail="Other European Union member states"
          price={formatShipping(euCents)}
          onSelect={setRegion}
        />
      </fieldset>

      <dl
        className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-base"
        aria-live="polite"
      >
        <dt>Tappen Home × {quantity}</dt>
        <dd className="font-semibold">
          {formatEur(HOME_UNIT_AMOUNT_CENTS * quantity)}
        </dd>
        <dt>
          {region === "DE" ? "Shipping in Germany" : "Shipping in the EU"}
        </dt>
        <dd className="font-semibold">{formatShipping(shipping)}</dd>
        <dt className="pt-2 text-lg font-bold">Total incl. VAT and shipping</dt>
        <dd className="pt-2 text-lg font-bold text-tappen-sunset-300">
          {formatEur(total)}
        </dd>
      </dl>

      <p className="text-sm leading-relaxed text-tappen-blue-200">
        Unit price {formatEur(HOME_UNIT_AMOUNT_CENTS)} incl. VAT. Germany
        shipping is {formatShipping(deCents)}. Shipping to the rest of the EU is{" "}
        {formatShipping(euCents)}. The total above is what Stripe charges.
        Payment is due now. We ship before Christmas 2026, by{" "}
        {HOME_SHIP_BY_LABEL}.
      </p>

      <label className="flex items-start gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          name="acceptedTerms"
          required
          className="mt-1 size-5 accent-tappen-sunset-500"
        />
        <span>
          I have read the{" "}
          <Link
            className="underline underline-offset-4"
            href="/legal/withdrawal"
          >
            withdrawal notice
          </Link>
          ,{" "}
          <Link
            className="underline underline-offset-4"
            href="/legal#terms-of-service"
          >
            terms
          </Link>
          , and{" "}
          <Link
            className="underline underline-offset-4"
            href="/legal#privacy-policy"
          >
            privacy policy
          </Link>
          , and I want to place this paid preorder.
        </span>
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-2xl bg-tappen-orange-500/15 px-4 py-3 text-sm text-tappen-orange-200"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
      <p className="text-sm leading-relaxed text-tappen-blue-300">
        The next page is Stripe Checkout. Its Pay button completes the purchase
        and you will be charged the total above. Tappen does not see your card
        number.{" "}
        <Link className="underline underline-offset-4" href="/legal#imprint">
          Imprint
        </Link>
        .
      </p>
    </form>
  );
}

function RegionOption({
  region,
  current,
  title,
  detail,
  price,
  onSelect,
}: {
  region: HomeRegion;
  current: HomeRegion;
  title: string;
  detail: string;
  price: string;
  onSelect: (region: HomeRegion) => void;
}) {
  const selected = current === region;
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition ${
        selected
          ? "border-tappen-sunset-400 bg-tappen-blue-800"
          : "border-tappen-blue-700 bg-tappen-blue-900/40 hover:border-tappen-blue-400"
      }`}
    >
      <span className="flex items-start gap-3">
        <input
          type="radio"
          name="region"
          value={region}
          checked={selected}
          onChange={() => onSelect(region)}
          className="mt-1 accent-tappen-sunset-500"
        />
        <span>
          <span className="block font-bold">{title}</span>
          <span className="block text-sm text-tappen-blue-300">{detail}</span>
        </span>
      </span>
      <span className="font-semibold">{price}</span>
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-tappen-sunset-500 px-6 py-4 text-lg font-bold text-tappen-blue-900 transition hover:bg-tappen-sunset-400 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Opening secure payment…" : "Continue to payment"}
    </button>
  );
}
