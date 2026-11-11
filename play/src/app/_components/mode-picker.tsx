'use client'

import { useRouter } from "next/navigation";
import TappenCard from "./tappen-card/tappen-card";
import TinderCard from 'react-tinder-card'
import { useTappenCardSwipeSettings } from "./tappen-card/swipe-settings";

import React from "react";
import WaterMark from "./tappen-card/watermark";


export function ModePicker (){
const router = useRouter()
const swipeSettings = useTappenCardSwipeSettings()

return <TinderCard
className={`absolute tappen-swipe-card`}
flickOnSwipe={swipeSettings.flickOnSwipe}
swipeRequirementType={swipeSettings.swipeRequirementType}
swipeThreshold={swipeSettings.swipeThreshold}
preventSwipe={swipeSettings.preventSwipe}
onSwipe={() => {
    router.push("?mode=tappen")
    router.refresh()
    }}
>
    <div className="w-full min-w-80 max-w-xs transform-gpu will-change-transform">
        <TappenCard skin="SHOWCASE">
            <div className="size-full flex flex-col gap-10 p-6 text-tappen-blue-50 font-serif">
                <WaterMark />
                <div className="flex flex-col gap-4">
                <h2 className="font-bold text-5xl">Rules are simple:</h2>
                <ul className="text-xl font-sans">
                <li>Read it out loud</li>
                <li>— and tell the truth</li>
                </ul>
                </div>
            <div className="w-full text-center animate-pulse text-tappen-sunset-400">Swipe to start</div>
            </div>
        </TappenCard>
    </div>
</TinderCard>
}
