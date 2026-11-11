import { ArrowPathRoundedSquareIcon, ChevronDoubleRightIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";

const controlButton =
  "inline-flex min-h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-tappen-blue-800 px-3 text-sm font-semibold text-tappen-blue-100 transition active:bg-tappen-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tappen-sunset-400";

type PlayDockProps = {
  showCardControls: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export function PlayDock({ showCardControls, onPrevious, onNext }: PlayDockProps) {
  return (
    <footer className="flex w-full max-w-md shrink-0 flex-col gap-3 font-sans">
      {showCardControls ? (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={controlButton} aria-label="Previous card" onClick={onPrevious}>
            <ArrowPathRoundedSquareIcon className="size-5 shrink-0" aria-hidden="true" />
            Previous
          </button>
          <button type="button" className={controlButton} aria-label="Next card" onClick={onNext}>
            <ChevronDoubleRightIcon className="size-5 shrink-0" aria-hidden="true" />
            Next
          </button>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Link
          to="/host"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-tappen-sunset-500 px-6 text-base font-bold text-tappen-blue-900 transition hover:bg-tappen-sunset-400 active:bg-tappen-sunset-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tappen-sunset-200"
        >
          Host a night
        </Link>
        <Link
          to="/join"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-tappen-blue-800 px-6 text-base font-semibold text-tappen-blue-100 ring-1 ring-inset ring-tappen-blue-300/40 transition hover:bg-tappen-blue-700 active:bg-tappen-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tappen-sunset-400"
        >
          Join with a code
        </Link>
      </div>
    </footer>
  );
}
