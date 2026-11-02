import { api } from "@/trpc/server"
import { CardGrid } from "./card-grid"
import { getServerAuthSession } from "@/server/auth"

export async function CardSection(){
    const userCards = await api.card.getAllUserCards()
    const session = await getServerAuthSession()

    const cardItems = userCards.map(c => ({
      id:c.cardId,
      content:c.content,
      author:c.author.name,
      tags: c.tags.map(t => t.name),
      nsfw:c.nsfw,
      skin: c.skinId,
      isLiked: c.likedBy.find(u => u.id === session?.user.id) !== undefined
    }))

    return <section className="w-full h-full">
         <CardGrid cards={cardItems} />               
           </section>
}