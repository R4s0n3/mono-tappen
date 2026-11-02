'use client'

import TinderCard from 'react-tinder-card'
import TappenCard from './tappen-card/tappen-card'
import { useRouter } from 'next/navigation'

export function StarterCard(){
    const router = useRouter()
  
   
    return <TinderCard onSwipe={() => {
       
        router.push("https://play.tappen.app")
        }}>
        <div className={`animate-shake `}>
       <TappenCard>
          <div className="flex flex-col justify-between h-full mt-12 mb-6">
          <h1 className="text-4xl lg:text-5xl text-center font-bang text-tappen-blue-500">Tappen App</h1>
          <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-serif"><b>Two rules:</b> Tell the truth, or take a sip</h2>
          <span className="w-full text-center animate-pulse font-bold text-tappen-blue-500">swipe to start</span>
          </div>
          </div>
        </TappenCard>
        </div>
    </TinderCard>
}