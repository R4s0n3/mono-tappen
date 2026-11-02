"use client";
import { useScrollDirection } from "@/util/scroll-hook";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowRightEndOnRectangleIcon,
  PlayIcon,
} from "@heroicons/react/24/solid";

export default function Navigation() {
  const scrollDirection = useScrollDirection();
  const pathname = usePathname();
  const onHomeEdition = pathname.startsWith("/home-edition");
  const fade = scrollDirection === "down" ? "opacity-0" : "opacity-100";

  return (
    <div className="fixed z-50 flex w-full max-w-screen-2xl items-center justify-between p-4">
      <Link
        href="https://play.tappen.app"
        aria-label="Play"
        className={`size-8 transition-all duration-300 ${fade}`}
      >
        <PlayIcon />
      </Link>
      <Image
        className="absolute left-1/2 top-1/2 w-8 -translate-x-1/2 -translate-y-1/2"
        src="/tappen_logo.svg"
        alt="Tappen"
        width={256}
        height={256}
      />
      <div className="flex items-center gap-3">
        <Link
          href="/home-edition"
          className={`rounded-full bg-tappen-sunset-500 px-3 py-2 text-xs font-bold uppercase tracking-wide text-tappen-blue-900 shadow-md transition hover:bg-tappen-sunset-400 sm:px-4 sm:text-sm ${
            onHomeEdition ? "ring-2 ring-tappen-sunset-200" : ""
          }`}
        >
          <span className="sm:hidden">Preorder</span>
          <span className="hidden sm:inline">Home edition</span>
        </Link>
        <Link
          aria-label="Tappen Hub"
          className={`hidden size-8 transition-all duration-300 sm:block ${fade}`}
          href="https://hub.tappen.app"
        >
          <ArrowRightEndOnRectangleIcon className="size-8" />
        </Link>
      </div>
    </div>
  );
}
