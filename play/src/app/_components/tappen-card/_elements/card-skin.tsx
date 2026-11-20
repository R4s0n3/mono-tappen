'use client'
import { memo, useEffect, useState, useMemo } from "react"
import { api } from "@/trpc/react"
import { cardFaceSkin, patternOverlay, type PlaySkin } from "@/shared/own-skin"

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
    /** Equipped own skin. When it is safe, it replaces the shop skin. */
    playSkin?: PlaySkin | null,
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
    const { children, skinId, skinObject, playSkin } = props
    const face = cardFaceSkin(skinId ?? "", playSkin)
    const ownSkin = face.source === "own" ? face.playSkin : null

    // Query with optimized options. An equipped own skin skips the shop lookup.
    const { data: fetchedSkin } = api.skin.getStyle.useQuery(skinId ?? "", {
        enabled: !!skinId && !skinObject && !ownSkin,
        retry: 2,
        staleTime: 300000, // 5 minutes - reduce network requests
       
    })

    // Initialize with skinObject or defaultSkin to reduce state updates
    const [cardSkin, setCardSkin] = useState<CardSkinItem>(ownSkin ?? skinObject ?? defaultSkin)

    // Only update when fetched skin changes
    useEffect(() => {
        if (ownSkin) return
        if (fetchedSkin) {
            setCardSkin(fetchedSkin);
        }
    }, [fetchedSkin, ownSkin]);

    // Only update when passed skin object changes
    useEffect(() => {
        if (ownSkin) {
            setCardSkin(ownSkin);
            return
        }
        if (skinObject) {
            setCardSkin(skinObject);
        }
    }, [skinObject, ownSkin]);

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

    const overlay = ownSkin ? patternOverlay(ownSkin.pattern, ownSkin.patternColor) : null

    return (
        <div
            style={dynamicBackground}
            className={`size-full relative overflow-hidden rounded p-2 ${outterClasses.join(" ")}`}
        >
            {overlay ? (
                <div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={overlay} />
            ) : null}
            <div className={`skin-border ${innerClasses.join(" ")} w-full h-full p-2 lg:gap-6 ${overlay ? "relative z-[1]" : ""}`}>
                {children}
            </div>
        </div>
    );
});

export default CardSkin;