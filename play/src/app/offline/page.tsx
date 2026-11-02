import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-white">
      <h1 className="text-3xl font-bold">You are offline</h1>
      <p className="mt-4 max-w-md text-base text-tappen-blue-100">
        Check your internet connection and try again.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-white px-6 py-2 font-semibold text-tappen-blue-700"
      >
        Retry
      </Link>
    </main>
  );
}
