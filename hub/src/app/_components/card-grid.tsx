'use client'

import { useState, useEffect } from "react"
import { PreviewItem } from "./preview-item"
import Link from "next/link"

export type CardGridItem = {
  id: string,
  content: string,
  author?: string | null,
  isLiked? : boolean,
  tags: string[],
  nsfw: boolean,
  skin: string
}

type CardGridProps = {
  cards: CardGridItem[]
}

export function CardGrid(props: CardGridProps) {  
 const {cards} = props
 const [currentFeed, setCurrentFeed] = useState(cards);
 const [searchValue, setSearchValue] = useState("")

 useEffect(() => {
    const filteredItems = cards
      .filter(item => item.content.toLowerCase().includes(searchValue.toLowerCase())  || 
                      item.tags.some(tag => tag.toLowerCase().includes(searchValue.toLowerCase())))
      .sort((a,b) => a.content.localeCompare(b.content))

    setCurrentFeed(filteredItems);
 }, [searchValue, cards]);

 return (
    <div className="w-full flex flex-col">
      <div className={`w-full h-full flex flex-col items-center gap-4`}>
        {/* Search Bar */}
        <div className="w-full fixed flex justify-center z-40 pt-36 bg-tappen-blue-500 shadow-lg">
          <input
            onChange={(e) => e.target.value.length <= 69 ? setSearchValue(e.target.value) : null}
            className="w-full max-w-screen-lg p-4 overflow-hidden resize-none focus:outline-none leading-loose focus:ring-0 bg-tappen-blue-500 text-tappen-blue-50 text-3xl lg:text-5xl"
            placeholder="Search a card..."
            value={searchValue}
          />
        </div>
        
        {/* Grid */}
        <div className="w-full mt-72 max-w-screen-lg grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 p-4">
          {/* Add New Card */}
          <div className="w-full aspect-[5/7]">
            <Link href="/card/create" className="size-full bg-tappen-blue-100 rounded flex justify-center items-center text-2xl text-tappen-blue-500 border-2 border-tappen-blue-500">
              +
            </Link>
          </div>
          {/* Preview Items */}
          {currentFeed.map(c => <PreviewItem key={c.id} card={c} /> )}
        </div>
      </div>
    </div>
 );
}
