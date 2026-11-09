import Link from "next/link";
import { ArrowTopRightOnSquareIcon, PlayIcon } from "@heroicons/react/24/solid";

export function CallToAction() {
  return (
    <section className="flex flex-col items-center justify-center gap-14 p-8 pb-24">
      <div className="flex flex-col items-center justify-center gap-12">
        <h2 className="w-full max-w-screen-2xl  font-bang text-7xl uppercase lg:p-0 lg:leading-normal">
          Still with us?
        </h2>
        <div>
          <p className="w-full max-w-screen-xl text-start font-sans  text-2xl font-normal lg:text-4xl lg:leading-normal">
            Don’t miss out on the fun! Let your Tappen journey begin today and
            dive into your first game within just seconds. It’s quick, easy, and
            packed with laughs, creativity, and connection.
          </p>
          <p className="w-full max-w-screen-xl text-start font-sans  text-2xl font-normal lg:text-4xl lg:leading-normal">
            Join a growing community of players and make every gathering
            unforgettable. Ready to play? Tap the buttons below and get started
            now!
          </p>
        </div>
        <span className="animate-pulse text-3xl">
          START NOW, IT&apos;S FREE!
        </span>
      </div>
      <div className="flex w-full max-w-3xl flex-col items-center justify-center gap-8 lg:flex-row lg:gap-16">
        <Link
          href="https://play.tappen.app"
          className="flex w-full  flex-1 items-center rounded-full border-2 border-tappen-blue-400/50 bg-tappen-blue-900/80 p-8  px-16 text-2xl text-tappen-blue-400 transition duration-100 hover:-skew-y-3 hover:animate-pulse hover:bg-tappen-blue-900/90"
        >
          <PlayIcon className="w-8" />
          <span className="w-full text-center">PLAY</span>
        </Link>
        <Link
          href="https://hub.tappen.app"
          className="flex w-full flex-1 items-center gap-8 rounded-full border-2 border-tappen-purple-400/50 bg-tappen-blue-900/80 p-8  px-16 text-2xl text-tappen-purple-400 transition duration-100 hover:skew-y-3 hover:animate-pulse hover:bg-tappen-blue-900/90"
        >
          <ArrowTopRightOnSquareIcon className="w-8" />
          <span className="w-full text-center">JOIN HUB</span>
        </Link>
      </div>
      <Link
        href="/home-edition"
        className="text-lg font-bold text-tappen-sunset-200 underline decoration-tappen-sunset-400/70 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tappen-sunset-300"
      >
        Preorder Tappen Home — the printed set
      </Link>
    </section>
  );
}
