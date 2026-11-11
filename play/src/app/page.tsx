import { getServerAuthSession } from "@/server/auth";
import { entitlementCopy } from "@/server/home/entitlement";
import { api } from "@/trpc/server";

// import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/solid";
import { ModePicker } from "./_components/mode-picker";
import Image from "next/image";
import Link from "next/link";
import GameCards from "./_components/game-cards";


export default async function Home({ searchParams }: { searchParams: { mode: string, uid: string, did: string, tid: string, game: string } }) {
  const session = await getServerAuthSession();
  const entitlement = session?.user ? await api.account.entitlement() : null;
  const { mode, uid, did, tid, game } = searchParams;
  const tagIds: string[] = tid?.split('-') ?? [];
  const cardIds: string[] = game?.split('-') ?? [];

  const gameCards = await api.card.getByParams({ mode, uid, did, tid: tagIds, game: cardIds })

  const hasGameMode = Object.values(searchParams).some(sm => sm !== undefined)
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 text-tappen-blue-200 overflow-hidden relative gap-8 px-8 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] z-0">
      <Image className="w-8" width={69} height={69} alt="tappen-app-logo" src="logo.svg" />
      {/* <button type="button"   className="absolute flex gap-2 justify-center items-center text-center top-8 left-6 p-1 px-6 bg-tappen-purple-300 rounded-full">
        <AdjustmentsHorizontalIcon className="size-4" /> filter</button> */}
      <div className="size-full max-w-xl flex justify-center items-center flex-col">
        {hasGameMode ? <GameCards cards={gameCards.map(card => ({
          id: card.cardId,
          skin: card.skinId
        }))} /> : <ModePicker />}
      </div>
      <footer className="w-full font-titillium flex flex-col justify-center items-center gap-2">
        <div className="flex gap-3">
          <Link href="/host" className="rounded-full bg-tappen-sunset-500 px-6 py-2 font-bold text-tappen-blue-900 transition hover:bg-tappen-sunset-400">
            Host a night
          </Link>
          <Link href="/join" className="rounded-full bg-tappen-blue-800 px-6 py-2 font-bold text-tappen-blue-200 transition hover:bg-tappen-blue-700">
            Join with a code
          </Link>
        </div>
        {entitlement ? (
          <div className="flex flex-col items-center gap-1 text-center text-sm">
            <p>{entitlement.premium ? entitlementCopy.premiumOn : entitlementCopy.premiumOff}</p>
            <p>
              {entitlement.ownsPremiumSkin ? entitlementCopy.skinOn : entitlementCopy.skinOff}{" "}
              {entitlement.ownsPremiumSkin ? entitlementCopy.equip : ""}
            </p>
          </div>
        ) : null}
        <span className="text-xs uppercase">join</span>
        <Link href="https://hub.tappen.app" className="text-sm font-bold z-50">Tappen Hub</Link>
      </footer>
    </main>
  );
}
