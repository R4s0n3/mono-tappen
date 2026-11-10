"use client";

import Link from "next/link";
import { PlayIcon } from "@heroicons/react/24/solid";

export function Header() {
  return (
    <div className="flex w-full flex-col items-center gap-5 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
      <div className="flex flex-col items-center gap-2 lg:items-start">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-tappen-sunset-300">
          A conversation party game
        </p>
        <h1 className="font-bang text-5xl uppercase leading-none sm:text-6xl lg:text-7xl">
          Tappen
        </h1>
        <p className="text-lg leading-snug text-tappen-blue-100 sm:text-xl">
          A game, not therapy.
        </p>
      </div>
      <div className="flex w-full max-w-md gap-3 lg:w-auto lg:max-w-none">
        <Link
          href="https://play.tappen.app"
          className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-tappen-blue-50 px-4 py-3 text-base font-bold text-tappen-blue-900 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tappen-sunset-300 sm:px-6 sm:text-lg lg:flex-none lg:px-8"
        >
          <PlayIcon className="size-5 shrink-0" aria-hidden />
          Play
        </Link>
        <Link
          href="/home-edition"
          className="inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-tappen-sunset-500 px-4 py-3 text-base font-bold text-tappen-blue-900 transition hover:bg-tappen-sunset-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tappen-blue-50 sm:px-6 sm:text-lg lg:flex-none lg:px-8"
        >
          Home Edition
        </Link>
      </div>
    </div>
  );
}
