'use client'
import WaterMark from "./watermark"
import { api } from "@/trpc/react"
import CardSkin,  { type CardSkinItem } from "./_elements/card-skin"
import { StarIcon, FireIcon } from "@heroicons/react/24/solid"
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline"
import { useEffect, useState } from "react"

type TappenCardProps = {
    card?: string,
    skin?: string | CardSkinItem,
    children?: React.ReactNode
}

const defaultCardData = {
    content:"",
    author:"",
    nsfw: false,
    isLiked: false
}

export default function TappenCard(props: TappenCardProps){
    const { card = "default", skin = "default", children } = props   
    
    const { data: fetchedCard, isLoading } = api.card.getByPublicId.useQuery(card,{
        enabled: card !== "default"
    })
 
    
    const [ cardData,  setCardData ] = useState(defaultCardData)
    
    useEffect(() => {
        // Update skin when fetch completes
        if (fetchedCard) {
            setCardData(fetchedCard);
        }
    }, [fetchedCard]);

    const cardControl = handleCardControl()

    function handleCardControl(){
       return "card-control"  
    }
    
    
    return <div className={`${cardControl} w-full min-w-80 max-w-xs aspect-[5/6.9] transition duration-500 relative ${isLoading ? "opacity-0" : "opacity-100"}`}>
        <CardSkin {...(typeof skin === 'string' ? { skinId: skin } : { skinObject: skin })} >
            {!children && cardData && <>
                <WaterMark />
                <CardContent content={cardData.content} />
                <CardFooter nsfw={cardData.nsfw} authorTag={cardData.author} liked={cardData.isLiked} />
            </>}
            {children}
        </CardSkin>
    </div>
    }

    const CardContent = ({ content } : { content: string }) => {

        function handlePreviewTextsize() {
            let textsize = "text-4xl leading-tight"
            if (content.length > 42) {
              textsize = "text-3xl leading-normal"
            }
            return textsize
          }
        const contentSize = handlePreviewTextsize()
        return <p className={`${contentSize}`}>{content}</p>
    }
    

type CardFooterProps = {
    authorTag: string,
    liked: boolean,
    nsfw: boolean
}

function CardFooter(props: CardFooterProps){
    const { authorTag, liked, nsfw } = props

    const icons: React.ComponentType[] = [
        liked ? StarIcon : StarIconOutline,
        ...(nsfw ? [FireIcon] : [])
      ];


    return <footer className="w-full flex justify-between mt-auto">
        <div className="font-sans font-normal">{authorTag && <b className="first-letter:uppercase">@{authorTag}</b>}</div>
        <div><div className="flex gap-2 ">{icons.map((Icon, idx: number) => <span key={idx}  className="w-6 h-6 flex"><Icon  /></span>)}</div></div>
    </footer>
}