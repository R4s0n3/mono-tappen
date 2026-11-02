import Link from "next/link";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { DeckBuilder } from "@/app/_components/deck-builder";
import { DashNavigation } from "@/app/_components/dash-navigation";

export default async function CreateDeck() {
  
  const session = await getServerAuthSession();
  const userCards = await api.card.getAllUserCards();


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
          <DeckBuilder userCards={userCards?.map(uc => ({ id: uc.cardId, nsfw:uc.nsfw, content: uc.content, tags: uc.tags.map(t => t.name), author: uc.author.name ?? "anonymous" })) ?? []} />
    </main>
  );
}

