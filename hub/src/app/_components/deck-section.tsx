import {api} from '@/trpc/server'
import { DeckGrid } from '@/app/_components/deck-grid'

export async function DeckSection(){
     const userDecks = await api.deck.getUserDecks()

    return <section className="w-full flex flex-col justify-center items-center gap-6">
       <DeckGrid decks={userDecks?.map(d => ({id:d.id, name:d?.name ?? ""})) ?? []} />
       </section>
}