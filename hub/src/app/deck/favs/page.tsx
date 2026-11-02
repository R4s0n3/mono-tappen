import Link from "next/link";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import FavoriteCardsGrid from "@/app/_components/favs-grid";
import { DashNavigation } from "@/app/_components/dash-navigation";

export default async function FavDeck() {
 
  const session = await getServerAuthSession();
  const existingDeck = await api.card.getFavCards()

  if(!session) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Tappen Hub
        </h1>
  <div className="flex flex-col items-center justify-center gap-4">
  <Link
    href={session ? "/api/auth/signout" : "/api/auth/signin"}
    className="rounded-full bg-pirrot-blue-50/10 px-10 py-3 font-semibold no-underline transition hover:bg-pirrot-blue-50/20"
  >
    {session ? "Sign out" : "Sign in"}
  </Link>
</div> 
</div>
</main>
)


  return (
    <main className="flex overflow-hidden flex-col lg:flex-row min-h-screen w-full bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-white relative">
      <DashNavigation page="decks" session={session !== null} />
      <FavoriteCardsGrid userCards={existingDeck?.map(card => ({id:card.cardId, nsfw:card.nsfw, content: card.content, tags: card.tags.map(t => t.name), author: card.author.name ?? "anonymous"}))} />
    </main>
  );
}

