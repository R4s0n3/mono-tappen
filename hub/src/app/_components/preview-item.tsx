import type { CardGridItem } from "./card-grid"
import TappenCard from "./tappen-card/tappen-card"
import Link from "next/link"

type PreviewItemProps = {
    card: CardGridItem,
}

export function PreviewItem(props: PreviewItemProps){

    const {card} = props
    if(!card) return null
    return <Link href={`/card/${card.id}`} className="w-full aspect-[5/7] rounded flex">
        <TappenCard skin={card.skin}>
            <div className="size-full flex justify-between flex-col p-2 pt-4">
            <p>{card.content}</p>
            <h5 className="font-sans text-sm">@{card.author}</h5>
            </div>
        </TappenCard>
    </Link>
}