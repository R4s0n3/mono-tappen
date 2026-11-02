'use client'
import { memo, useEffect, useState, useMemo } from "react"
import { api } from "@/trpc/react"
import { useCardTilt } from "../hooks/useCardTilt"

export type RARITY_TYPE = "common" | "rare" | "epic" | "legendary"

export type CardSkinItem = {
    font: {
        type: string,
        color: string
    },
    border: {
        frame: string,
        rarity: RARITY_TYPE
    },
    background: {
        type: string,
        colors: {
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
    skinObject?: CardSkinItem,
    enableTilt?: boolean
}

export const defaultSkin: CardSkinItem = {
    font: {
        type: "serif",
        color: "mid"
    },
    border: {
        frame: "classic",
        rarity: "common"
    },
    background: {
        type: "radial",
        colors: {
            primary: "#eaeaef",
            secondary: "#f5f5fa",
        },
        animation: "liquid",
    }
}

// Create dynamic background style utility function - moved outside component to avoid recreation
function createDynamicBackgroundStyle(styleObj: CardSkinItem['background']) {
    const { type, colors } = styleObj;
    const { primary, secondary, highlight } = colors;

    const gradientType = type === "radial" ? "radial-gradient" : "linear-gradient";
    const colorStop = highlight ? `, ${highlight}` : "";

    return {
        backgroundImage: `${gradientType}(${secondary}, ${primary}${colorStop})`,
        backgroundSize: "300% 300%",
    };
}

// Memoized CardSkin component
const CardSkin = memo(function CardSkin(props: CardSkinProps) {
    const { children, skinId, skinObject, enableTilt = true } = props

    // Query with optimized options
    const { data: fetchedSkin } = api.skin.getStyle.useQuery(skinId ?? "", {
        enabled: !!skinId && !skinObject,
        retry: 2,
        staleTime: 300000, // 5 minutes - reduce network requests
        
    })

    // Initialize with skinObject or defaultSkin to reduce state updates
    const [cardSkin, setCardSkin] = useState<CardSkinItem>(skinObject ?? defaultSkin)

    // Only update when fetched skin changes
    useEffect(() => {
        if (fetchedSkin) {
            setCardSkin(fetchedSkin);
        }
    }, [fetchedSkin]);

    // Only update when passed skin object changes
    useEffect(() => {
        if (skinObject) {
            setCardSkin(skinObject);
        }
    }, [skinObject]);

    // Memoize style calculations - only recalculate when cardSkin changes
    const { dynamicBackground, outterClasses, innerClasses } = useMemo(() => {
        const { font, border, background } = cardSkin;
        const { type: fontStyle, color: fontColor } = font;
        const { frame, rarity } = border;
        const { animation } = background;

        return {
            dynamicBackground: createDynamicBackgroundStyle(background),
            outterClasses: [`font-${fontStyle}`, `fontStyle_${fontColor}`, `animate-${animation}`],
            innerClasses: [rarity, `frame_${frame}`]
        };
    }, [cardSkin]);

    // Tilt effect
    const { tiltStyle, tiltApi } = useCardTilt({
        maxTilt: 15,
        perspective: 1200,
        scale: 1.03,
        enabled: enableTilt,
    })


    return (
        <div
            style={enableTilt ? { ...dynamicBackground, ...tiltStyle } : dynamicBackground}
            className={`size-full relative overflow-hidden rounded p-1 md:p-2 ${outterClasses.join(" ")} ${enableTilt ? 'holo-card' : ''}`}
            onMouseLeave={enableTilt ? tiltApi.reset : undefined}
        >
            <div className={`skin-border ${innerClasses.join(" ")} w-full h-full p-2 lg:gap-6`}>
                {children}
            </div>
        </div>
    );
});

export default CardSkin;