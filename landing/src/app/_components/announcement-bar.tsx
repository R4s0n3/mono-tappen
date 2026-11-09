import Link from "next/link";

export function AnnouncementBar() {
  return (
    <Link
      href="/home-edition"
      className="flex min-h-11 flex-wrap items-center justify-center gap-x-2 bg-tappen-sunset-500 px-4 py-2 text-center text-sm font-bold leading-snug text-tappen-blue-900 transition hover:bg-tappen-sunset-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-tappen-blue-900"
    >
      <span>New: Tappen Home — the printed set.</span>
      <span className="underline decoration-tappen-blue-900/50 underline-offset-2">
        Preorder now
      </span>
    </Link>
  );
}
