import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import { DashNavigation } from "@/app/_components/dash-navigation";
import { CardBuilder } from "@/app/_components/card-builder";
import type { DefaultCardItem } from "@/app/_components/card-builder";
import TappenCard from "@/app/_components/tappen-card/tappen-card";
import Image from "next/image";

export default async function CardView({ params }: { params: { cardId: string } }) {
  const {cardId} = params
  const session = await getServerAuthSession()

  const existingCard = await api.card.getById(cardId)


  const { cardId:id, skinId, content, authorId, tags, nsfw, visible } = existingCard!
  const visibility = `${visible.toLowerCase()}` as "public" | "shared" | "private"
  const existingItem: DefaultCardItem = {
    id,
    skin: skinId,
    nsfw,
    visibility,
    content: content,
    tags: tags?.map(t => t.name),
    isAuthor: authorId === session?.user.id
  }

  if(!session) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <div className="size-16 relative">
        <Image alt="logo" fill src="/tappen_logo.svg" />
        </div>
  <div className="flex flex-col items-center justify-center gap-4">
 
 <div  className="size-full flex justify-center items-center">
{visibility === "private" ? 
  <h2>You are not allowed to see this card.</h2>
  :
  <TappenCard card={cardId} skin={skinId} />}
 </div> 
 

</div> 
</div>
</main>
)

const tagsData = await api.tag.getTrending()
const skinsData = await api.skin.getAll()

  return (
    <main className="flex overflow-hidden flex-col lg:flex-row min-h-screen w-full bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-white relative">
      <DashNavigation page="cards" session={session !== null} />
      {existingCard && existingCard.authorId === session.user.id ? <CardBuilder 
        isUpdateMode 
        existingCard={existingItem} 
        skins={skinsData.map(skin => ({id: skin.id, name:skin.name, price:skin.price, isOwned: skin.name === "default" || skin.users.some(u => u.userId === session.user.id )}))} 
        tags={tagsData.map(t => t.name)}
          /> : <div className="size-full min-h-screen flex justify-center items-center"><TappenCard card={cardId} skin={skinId} /></div>}
          {!existingCard && <div className='w-full h-96 z-40 text-white flex justify-center items-center'>CARD DONT EXIST</div>}
    </main>
  );
}

