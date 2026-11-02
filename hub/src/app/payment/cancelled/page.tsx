import { DashNavigation } from "@/app/_components/dash-navigation";
import { XMarkIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

export default function CancelPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-tappen-blue-50">
      <DashNavigation page={"profile"} session={true} />
      <div className="size-full min-h-screen flex flex-col justify-center gap-8 items-center">
      <XMarkIcon className="size-8 text-tappen-purple-400" />
      <p>Payment cancelled.</p>
      <Link href="/shop">Back to Shop</Link>
      </div>
    </main>
  );
}

