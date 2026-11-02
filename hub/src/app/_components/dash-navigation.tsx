'use client'
import { useState, useEffect } from 'react'
import 'keen-slider/keen-slider.min.css'
import Image from 'next/image'
import Link from 'next/link'
import { PlayIcon, ArrowRightEndOnRectangleIcon, ArrowRightStartOnRectangleIcon, ShoppingBagIcon, ListBulletIcon } from '@heroicons/react/24/solid'


const buttons = ['cards', 'decks', 'profile']

type DashNavigationProps = {
    page: string,
    session: boolean
} 

export function DashNavigation(props:DashNavigationProps){
    const { page, session } = props
    const [currentSlide, setCurrentSlide] = useState(0)
 
    useEffect(() => {
        if (page && buttons.includes(page)) {
            setCurrentSlide(buttons.indexOf(page));  
        }   
    }, [page]);

    return <div className="fixed p-4 py-6 z-50 flex w-full flex-col items-center gap-6 bg-tappen-blue-900 border-b-2 border-tappen-blue-700">
    <div className='flex justify-between flex-1 w-full'>
    <div className='flex gap-6'>
    <Link href="https://play.tappen.app" className=''><PlayIcon className='size-8' /></Link>
    <Link prefetch   className={`text-tappen-blue-100`} href={"/shop"}><ShoppingBagIcon className='size-8' /></Link>
    </div>
        <Image className='size-8 self-center' src="/logo.svg" alt="logo" height={20} width={20} />
        <div className='flex gap-6'>
        <Link prefetch   className={`text-tappen-blue-100`} href={"/payment/history"}><ListBulletIcon className='size-8' /></Link>
        <Link prefetch  className={`${session ? "text-tappen-purple-400" : "text-tappen-green-400"}`} href={session ? "/api/auth/signout" : "/api/auth/signin"}>{session ? <ArrowRightEndOnRectangleIcon className="size-8" /> : <ArrowRightStartOnRectangleIcon className='size-8' />}</Link>
        </div>
        </div>
    <div  className="flex justify-between items-center cursor-pointer text-xl w-full max-w-2xl">
    {buttons.map((btn,idx) => <Link
        href={`/?page=${btn}`}
        prefetch
        key={btn}
        id={btn}
        className={`
            uppercase
            flex-1
            flex
            ${currentSlide === 2 && idx === 1 && 'order-3 justify-end'}
            ${currentSlide !== idx && idx > 1 && 'order-3 justify-end'}
            font-bang 
            ${currentSlide === idx ? 'order-2 text-4xl justify-center' : 'text-lg order-1'}
           `}
    >
    {btn}
    </Link>
)}
</div>
</div>
}