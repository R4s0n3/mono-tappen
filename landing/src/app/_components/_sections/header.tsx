'use client'
import Link from "next/link"
import { ChevronDoubleDownIcon } from "@heroicons/react/24/solid"
import { StarterCard } from "../starter-card"
import { CardShowcase } from "../card-showcase"
import { JoinRoom } from "../join-room"

type HeaderProps = {
    cards: string[]
}

export function Header(props: HeaderProps) {

    return<div className="w-full h-full border-b-2 border-tappen-blue-900 relative">
    <CardShowcase items={props.cards} rowConfig={[2,3,2]} />
<div className="w-full h-full min-h-screen p-8 flex justify-between items-center max-w-screen-xl m-auto gap-5 flex-col">
    <div className="w-8"></div>
    <StarterCard />
    <JoinRoom />
    <div className="animate-pulse text-tappen-blue-200 flex justify-center items-center flex-col">
      <Link href="#info"><ChevronDoubleDownIcon className="w-9" /></Link>
    </div>
</div>

    </div>
}