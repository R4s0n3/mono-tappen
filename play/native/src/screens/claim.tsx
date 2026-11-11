import { Link } from "react-router-dom";

/**
 * The hosted "claim this night" button lands here. Sign in with Apple,
 * which attaches the seat to the account, is M2. This screen is the slot.
 */
export function ClaimScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 px-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-center text-tappen-blue-100">
      <h1 className="font-lilita-one text-4xl text-tappen-blue-50">Your night</h1>
      <p className="max-w-xs text-lg text-tappen-blue-200">
        Sign in with Apple will keep this night on your account. That is the only sign-in this app will offer, and it is not in this build yet.
      </p>
      <Link
        to="/"
        className="font-lilita-one rounded-full bg-tappen-sunset-500 px-8 py-3 text-lg text-tappen-blue-900"
      >
        Back home
      </Link>
    </main>
  );
}
