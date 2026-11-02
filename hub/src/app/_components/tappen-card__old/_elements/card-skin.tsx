'use client'
import { api } from "@/trpc/react"
import { useEffect, useState } from "react"

export type RARITY_TYPE = "common" | "rare" | "epic" | "legendary"

export type CardSkinItem = {
    font:{
        type: string,
        color: string
    },
    border:{
        frame: string,
        rarity: RARITY_TYPE
    },
    background:{
        type:string,
        colors:{
            primary: string,
            secondary: string,
            highlight?: string
        },
        animation: string
    }
}

type CardSkinProps = {
    children: React.ReactNode,
    skinId?: string,
    skinObject?: CardSkinItem
}   


export const defaultSkin: CardSkinItem = {
    font:{
        type: "serif",
        color: "mid"
    },
    border:{
        frame: "classic",
        rarity: "common"
    },
    background:{
        type: "radial",
        colors:{
            primary: "#eaeaef",
            secondary: "#f5f5fa",
        },
        animation: "liquid",
    }
}




export default function CardSkin(props: CardSkinProps){
    const { children, skinId, skinObject } = props
    
    const { data: fetchedSkin, isLoading } = api.skin.getStyle.useQuery(skinId ?? "", {
        enabled: !!skinId && !skinObject, 
        retry: 2,
    })

    const [ cardSkin,  setCardSkin ] = useState<CardSkinItem>(skinObject ?? defaultSkin)
    
    useEffect(() => {
        if (fetchedSkin) {
            setCardSkin(fetchedSkin);
        }
    }, [fetchedSkin, isLoading]);
    
    useEffect(() => {
        if (skinObject) {
            setCardSkin(skinObject);
        }
    }, [skinObject]);


    type SkinBackgroundObject = {
        type: string,
        colors:{
            primary: string,
            secondary: string,
            highlight?: string
        }
        animation: string
    }

    // BACKGROUND
    function createDynamicBackgroundStyle(styleObj: SkinBackgroundObject) {

        const { type, colors } = styleObj;
        const { primary, secondary, highlight} = colors
      
        const gradientType = type === "radial" ? "radial-gradient" : "linear-gradient";
        const colorStop = highlight ? `, ${highlight}` : "";
        
        return {
          backgroundImage: `${gradientType}(${secondary}, ${primary}${colorStop})`,
          backgroundSize: "300% 300%",
        };

    }

    const { font, border, background } = cardSkin;
    const { type:fontStyle , color:fontColor } = font
    const { frame, rarity} = border
    const { animation } = background
    
    const dynamicBackground = createDynamicBackgroundStyle(background);

    const outterClasses:string[] = [ `font-${fontStyle}`, `fontStyle_${fontColor}`, `animate-${animation}` ]
    const innerClasses:string[]  = [ rarity, `frame_${frame}` ]

    return <div 
        style={dynamicBackground} 
        className={`w-full h-full relative overflow-hidden rounded p-1.5 shadow-md
        ${outterClasses.join(" ")}`}>
        <div className={`skin-border ${innerClasses.join(" ")} w-full h-full flex flex-col gap-2 md:gap-4 p-2 lg:gap-6`}>
        {children}
        </div>
    </div>
}