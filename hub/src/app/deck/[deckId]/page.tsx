import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { DeckBuilder } from "@/app/_components/deck-builder";
import { DashNavigation } from "@/app/_components/dash-navigation";

import { redirect } from "next/navigation";

export default async function UpdateDeck({ params }: { params: { deckId: string } }) {
    const {deckId} = params

  const session = await getServerAuthSession();
  if(!session) redirect(`https://play.tappen.app/?did=${deckId}`)
    
    const existingDeck = await api.deck.getById(deckId)
    const isAuthor = existingDeck?.creatorId === session?.user.id
    
    if(!isAuthor) redirect(`https://play.tappen.app/?did=${deckId}`)
      
    const userCards = await api.card.getAllUserCards();
  return (
    <main className="flex overflow-hidden flex-col lg:flex-row min-h-screen w-full bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-white relative">
      <DashNavigation page="decks" session={session !== null} />
      {existingDeck ? <DeckBuilder 
        existingDeckCards={existingDeck?.cards.map(card => ({id:card.cardId, nsfw:card.nsfw, content: card.content, tags: card.tags.map(t => t.name), author: card.author.name ?? "anonymous"}))}
        existingDeckName={existingDeck.name ?? "anonymous"}
        existingDeckId={deckId}
        isUpdateMode
        userCards={userCards?.map(uc => ({ id: uc.cardId, nsfw:uc.nsfw, content: uc.content, tags: uc.tags.map(t => t.name), author: uc.author.name ?? "anonymous" })) ?? []}
          /> : <div className='w-full h-96 z-40 text-white flex justify-center items-center'>DECK DONT EXIST</div>}
    </main>
  );
}

