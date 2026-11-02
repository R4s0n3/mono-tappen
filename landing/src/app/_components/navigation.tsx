'use client'
import { useScrollDirection } from '@/util/scroll-hook'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRightEndOnRectangleIcon, PlayIcon } from "@heroicons/react/24/solid";

export default function Navigation (){
    const scrollDirection = useScrollDirection()
    return <div className={`w-full max-w-screen-2xl flex justify-between items-center p-4 fixed  z-50`}>
    <Link href="https://play.tappen.app" className={`size-8 transition-all duration-300 ${scrollDirection === "down" ? "opacity-0" : "opacity-100"}`}><PlayIcon /></Link>
    <Image className="w-8" src="/tappen_logo.svg" alt="logo" width={256} height={256} />
    <Link className={`size-8 transition-all duration-300 ${scrollDirection === "down" ? "opacity-0" : "opacity-100"}`} href="https://hub.tappen.app"><ArrowRightEndOnRectangleIcon className="size-8" /></Link>
    </div>
}