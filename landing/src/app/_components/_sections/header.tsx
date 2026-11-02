"use client";
import Link from "next/link";
import { ChevronDoubleDownIcon } from "@heroicons/react/24/solid";
import { StarterCard } from "../starter-card";
import { CardShowcase } from "../card-showcase";
import { JoinRoom } from "../join-room";

type HeaderProps = {
  cards: string[];
};

export function Header(props: HeaderProps) {
  return (
    <div className="relative h-full w-full border-b-2 border-tappen-blue-900">
      <CardShowcase items={props.cards} rowConfig={[2, 3, 2]} />
      <div className="m-auto flex h-full min-h-screen w-full max-w-screen-xl flex-col items-center justify-between gap-5 p-8">
        <div className="w-8"></div>
        <StarterCard />
        <JoinRoom />
        <Link
          href="/home-edition"
          className="text-sm font-semibold uppercase tracking-[0.18em] text-tappen-sunset-300 underline decoration-tappen-sunset-400/70 underline-offset-4"
        >
          Preorder the printed box
        </Link>
        <div className="flex animate-pulse flex-col items-center justify-center text-tappen-blue-200">
          <Link href="#info">
            <ChevronDoubleDownIcon className="w-9" />
          </Link>
        </div>
      </div>
    </div>
  );
}
