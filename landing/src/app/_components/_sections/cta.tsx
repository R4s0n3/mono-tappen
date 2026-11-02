import Link from "next/link";
import {  ArrowTopRightOnSquareIcon, PlayIcon } from "@heroicons/react/24/solid";

export function CallToAction(){
    return   <section className="flex flex-col justify-center items-center gap-14 p-8 pb-24">
    <div className="flex-col flex gap-12 justify-center items-center">
    <h2 className="lg:p-0 text-7xl  uppercase font-bang w-full lg:leading-normal max-w-screen-2xl">Still with us?</h2>
    <div>
      <p className="text-2xl lg:text-4xl font-sans text-start  w-full max-w-screen-xl font-normal lg:leading-normal">Don’t miss out on the fun! Let your Tappen journey begin today and dive into your first game within just seconds. It’s quick, easy, and packed with laughs, creativity, and connection.</p>
      <p className="text-2xl lg:text-4xl font-sans text-start  w-full max-w-screen-xl font-normal lg:leading-normal">Join a growing community of players and make every gathering unforgettable. Ready to play? Tap the buttons below and get started now!</p>
    </div>
      <span className="animate-pulse text-3xl">START NOW, IT&apos;S FREE!</span>
      </div>
      <div className="flex w-full max-w-3xl flex-col lg:flex-row justify-center items-center gap-8 lg:gap-16">
    <Link href="https://play.tappen.app" className="flex-1 text-2xl  flex items-center w-full p-8 px-16 border-2 border-tappen-blue-400/50  bg-tappen-blue-900/80 hover:bg-tappen-blue-900/90 hover:-skew-y-3 rounded-full transition duration-100 hover:animate-pulse text-tappen-blue-400"><PlayIcon className="w-8" /><span className="w-full text-center">PLAY</span></Link>
    <Link href="https://hub.tappen.app" className="flex-1 text-2xl flex gap-8 items-center w-full p-8 px-16 border-2 border-tappen-purple-400/50  bg-tappen-blue-900/80 hover:bg-tappen-blue-900/90 hover:skew-y-3 rounded-full transition duration-100 hover:animate-pulse text-tappen-purple-400"><ArrowTopRightOnSquareIcon className="w-8" /><span className="w-full text-center">JOIN HUB</span></Link>
      </div>
    
</section>
}