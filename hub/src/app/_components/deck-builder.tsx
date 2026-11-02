'use client'
import {useState, useEffect} from 'react'
import Link from 'next/link'
import { CheckCircleIcon, FireIcon, MagnifyingGlassIcon, PlayIcon, TrashIcon } from '@heroicons/react/24/solid'
import CardSkin from './tappen-card/_elements/card-skin'
import { api } from '@/trpc/react'
import { useRouter } from 'next/navigation'

type CardItem = {
    id: string,
    content: string,
    author: string,
    tags:string[],
    skin?: string,
    nsfw: boolean
}


type DeckBuilderProps = {
    userCards: CardItem[],
    existingDeckId?:string,
    existingDeckName?: string, // New prop for existing deck name
    existingDeckCards?: CardItem[], // New prop for existing deck cards
    isUpdateMode?: boolean // New prop to determine if it's update mode
}
const defaultName = "Enter deck name"

export function DeckBuilder(props: DeckBuilderProps){
    const {userCards, existingDeckName, existingDeckCards, existingDeckId, isUpdateMode} = props
    const router = useRouter()
    const [nameValue, setNameValue] = useState(existingDeckName ?? "")
    const [pickedCards, setPickedCards] = useState<CardItem[]>(existingDeckCards ?? [])
    const [filterValue, setFilterValue] = useState("")
    const [commonTags] = useState([])
    const [filteredCards, setFilteredCards] = useState(props.userCards) 
    const [nsfwFilter, setNsfwFilter] = useState(existingDeckCards?.some(c => c.nsfw === true) ? false : true)
    const { mutateAsync: createCard } = api.deck.create.useMutation({
        onSuccess:() => {
            router.push("/?page=decks")
            router.refresh()
        }
    })

    const { mutateAsync: updateCard } = api.deck.update.useMutation({
        onSuccess:() => {
            router.push("/?page=decks")
            router.refresh()
        },
    })
  
    const { mutateAsync: deleteDeck } = api.deck.delete.useMutation({
            onSuccess:()=>{
                router.push("/?page=decks")
                router.refresh()
            }
    })

async function handleDeleteDeck(e: React.MouseEvent<HTMLButtonElement>){
    e.preventDefault()
    e.stopPropagation()
    await deleteDeck(existingDeckId!)
}

  useEffect(() => {
 
    const filteredItems = userCards
        .filter(item => item.content.toLowerCase().includes(filterValue.toLowerCase())  || 
                        item.tags.some(tag => tag.toLowerCase().includes(filterValue.toLowerCase())))
        .sort((a,b) => a.content.localeCompare(b.content))
        .filter(item => nsfwFilter ? !item.nsfw === true : true)

      setFilteredCards(filteredItems);

  }, [filterValue, userCards, nsfwFilter]);


    function handleClickedCard(e: React.MouseEvent<HTMLButtonElement>){
        e.preventDefault()
        if(pickedCards.length >= 99){
            return
        }
        const clickedCardId = e.currentTarget.id
        const hasCard = pickedCards?.some(c => c.id === clickedCardId)

        const cardToAdd = userCards.find(c => c.id === clickedCardId)

        if(!hasCard && cardToAdd){
            setPickedCards(prev => [...prev, cardToAdd])
        }else if(hasCard){
            const filterdCards = pickedCards.filter(c => c.id !== clickedCardId)
            setPickedCards(filterdCards)
        }
    }

function renderMostCommonTags(){
    const tagCountMap = new Map<string, number>();

    pickedCards.forEach(cardItem => {
        cardItem.tags.forEach(tag => {
        tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1);
        });
    });
    const sortedTags = Array.from(tagCountMap.entries()).sort((a, b) => b[1] - a[1]);
    const topThreeTags = sortedTags.slice(0, 3).map(entry => entry[0]);
    return topThreeTags.map((tn,key) => <span className='p-1 px-4 bg-tappen-blue-400/90 rounded-full' key={key}>{tn}</span>)

    }
    async function handleCreateOrUpdateDeck(e:React.FormEvent<HTMLFormElement>){
        e.preventDefault()
        if (isUpdateMode) {
            await updateCard({id: existingDeckId!, name: nameValue, cards: pickedCards.map(c => c.id)})
        } else {
            await createCard({name: nameValue, cards: pickedCards.map(c => c.id)})
        }
    }
    const chainedLink = pickedCards.map(c => c.id).join("-")
    return <div className="size-full relative flex flex-col items-center justify-center pt-72">
<form onSubmit={handleCreateOrUpdateDeck} className="w-full fixed top-0 z-40 flex flex-col justify-center items-center bg-tappen-blue-900 pt-36">
    <div className='flex justify-center w-full items-center max-w-screen-2xl px-4'>
    <div className="w-full border-b-tappen-purple-400 border-b-2">
        <input
        id="pick-name"
            onChange={(e) => e.target.value.length <= 18 ? setNameValue(e.target.value) : null}
            className={`${nameValue !== defaultName ? "text-tappen-blue-100 " : "text-tappen-blue-100/30 "}  w-full resize-none focus:outline-none focus:ring-0 bg-transparent py-4 text-3xl lg:text-5xl`}
            placeholder='Enter deck name'
            value = {nameValue}
            />

    </div>
        <button type="submit" className='p-3 px-6 bg-tappen-blue-500 text-nowrap rounded-full flex'> {isUpdateMode ? "Update Deck" : "Save Deck"}</button>
    </div>
    {/* DECK INFO SECTION */}
    <div className='p-4 flex flex-col md:flex-row gap-4 justify-center items-center text-sm'>
        <div className='flex justify-center items-center gap-2'>
    <div className='size-5 flex justify-center items-center -space-x-1'>
    <i className='block not-italic w-3 aspect-[5/7] border border-tappen-blue-900 bg-tappen-blue-100'></i>
    <i className='block not-italic w-3 aspect-[5/7] border border-tappen-blue-900  rotate-6 bg-tappen-blue-100'></i>
    </div>
    <span className=''>{pickedCards. length} / 99 Cards</span>
        </div>
        <div className='px-4'>
        <div className='flex gap-2'>
        {renderMostCommonTags()}
        {pickedCards.some(c => c.nsfw === true) && <span className='p-1 px-4 bg-tappen-purple-400 rounded-full'>nsfw</span>}
        </div>
        </div>
    </div>
</form>
<div className='size-full flex flex-col justify-center items-center overflow-y-auto relative'>
<div className='w-full'>
    <div className='w-full text-xl flex gap-4 relative'>
    <div className={`w-full fixed flex top-0 justify-center items-center z-30 transition duration-500 pt-[19rem] bg-tappen-blue-500 shadow-lg pb-4 lg:pb-0`}>
        <div className='w-full max-w-screen-2xl flex flex-col md:flex-row justify-between items-center px-4'>
            <div className='flex justify-center items-center'>
            <MagnifyingGlassIcon className='size-8'  />
          <input
            onChange={(e) => e.target.value.length <= 69 ? setFilterValue(e.target.value) : null}
            className="basis-1/2 p-4 overflow-hidden resize-none focus:outline-none leading-loose focus:ring-0 bg-tappen-blue-500 text-tappen-blue-50 text-2xl lg:text-4xl"
            placeholder="Search card or tag"
            value={filterValue}
            />
            </div>
            <div className='flex gap-2'>
           {isUpdateMode && existingDeckId && <button 
                type="button" 
                onClick={handleDeleteDeck} 
                className={`${nsfwFilter ? "bg-tappen-purple-200 opacity-25" : "bg-tappen-purple-400"} rounded-full p-1 px-3 text-sm flex gap-2 justify-center items-center`}>DELETE <TrashIcon className='size-6' /></button>}
            <button 
                type="button" 
                onClick={() => setNsfwFilter(prev => !prev)} 
                className={`${nsfwFilter ? "bg-tappen-purple-200 opacity-25" : "bg-tappen-purple-400"} rounded-full p-1 px-3 text-sm flex gap-2 justify-center items-center`}>NSFW <FireIcon className='size-6' /></button>
            <Link href={`https://play.tappen.app/?game=${chainedLink}`} className='bg-tappen-sunset-400 rounded-full p-1 px-3 text-sm flex gap-2 justify-center items-center'>PLAY <PlayIcon className='size-6' /></Link>
            </div>
            </div>
        </div>
        <div>
            {commonTags.map((t, k)=> <span key={k}>{t}</span>)}
        </div>
    </div>
</div>
<div className={`size-full max-w-screen-2xl gap-2 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 p-4 pt-40 z-20`}>
        {filteredCards?.map( uc => <button id={`${uc.id}`} onClick={handleClickedCard} className='flex text-left flex-col aspect-[5/7] relative'
        key={uc.id}>
            {pickedCards.some(card => card.id === uc.id) && <div className='absolute z-40 size-full top-0 left-0 rounded-sm bg-tappen-blue-900/10 border-2 border-tappen-sunset-400 p-4 flex justify-end items-end'> <CheckCircleIcon className='z-40 size-5 text-tappen-sunset-400' /></div>}
                <CardSkin skinId={uc.skin ?? "default"}>
                    <div className='size-full flex justify-between flex-col p-0.5'>
                <span className='text-xs sm:text-base md:text-xl xl:text-base overflow-y-auto'>{uc.content}</span>
                <span className='font-sans text-xs sm:text-sm text-ellipsis '>@{uc.author}</span>
                    </div>
                </CardSkin>
        </button>)}
</div>
        {!userCards || userCards.length === 0 && <div className='w-full max-w-sm p-12 border-tappen-purple-400 border flex flex-col gap-4 text-center items-center justify-center'>
            <h3 className='text-3xl uppercase font-bold'>No user cards.</h3>
            <p className='w-full max-w-md'>Either create some cards or play the
            <Link
            className='not-italic font-semibold text-tappen-purple-400'
            href={process.env.NODE_ENV === "production" ? "https://play.tappen.app" : "http://play.tappen.local:3001"}> Tappen App </Link>
             to discover new cards for your personal deck.
            </p>
            </div>}
</div>
    </div>
}