import Link from "next/link";
import TappenCard from "../tappen-card/tappen-card";
import Image from "next/image";
import { ArrowUpRightIcon } from "@heroicons/react/24/solid";

export function About(){
    return <section id="features" className="flex flex-col gap-14 items-center py-36 border-t-2 border-tappen-blue-900 w-full">
    <h2 className="text-7xl lg:p-0 lg:text-7xl uppercase font-bang w-full lg:leading-normal max-w-screen-xl ">Game Features</h2>
    <div className="w-full flex flex-col lg:flex-row gap-8 gap-y-32 max-w-screen-xl">
    <div className="border-2 gap-2  rounded group cursor-pointer  border-tappen-blue-600 hover:border-tappen-green-400 bg-tappen-blue-900 flex-1 flex flex-col justify-between items-center text-start">
        <div className="p-8 flex flex-col gap-4 w-full">
        <h3 className="font-bang text-6xl text-tappen-green-400 uppercase">Cards</h3>
        <div><span className="font-sans uppercase font-bold p-2 px-4 bg-tappen-blue-400 rounded-full text-xs">create and discover new cards everyday</span></div>
        </div>
        <div className="flex flex-row -space-x-80 transition-transform duration-500 scale-75 group-hover:scale-90 group-hover:rotate-6">
            <div className="flex -space-x-72">
            <div className="-rotate-6 shadow-md z-10"><TappenCard>
        <div className="w-full h-full flex justify-center items-center text-6xl font-serif">
            Whats your favorite flower?
            </div>
            </TappenCard></div>
        <div className="shadow-md transition duration-200 group-hover:z-20"><TappenCard><Link href="https://hub.tappen.app/card/create" className="w-full h-full flex justify-center items-center text-6xl">
           <span className="group-hover:animate-pulse">+</span>
            </Link></TappenCard></div>
            </div>
        </div>
        <Link className="p-8 pb-10 w-full flex gap-2 text-xl justify-end group-hover:text-tappen-green-400 transition duration-300 uppercase" href="https://hub.tappen.app/card/create">learn more <ArrowUpRightIcon className="w-5" /></Link>
    </div>
    <div className="border-2 gap-2 border-opacity-50 group cursor-pointer rounded border-tappen-blue-600 hover:border-tappen-purple-400 bg-tappen-blue-900 flex-1 flex flex-col justify-between items-center text-start">
    <div className="p-8 flex flex-col gap-4 w-full">
        <h3 className="font-bang text-6xl text-tappen-purple-400 uppercase">Decks</h3>
        <div><span className="font-sans uppercase font-bold p-2 px-4 bg-tappen-blue-400 rounded-full text-xs">draft decks to share cards with the world</span></div>
        </div>
        
            <div className="flex flex-row -space-x-80 transition-transform duration-500 scale-75 group-hover:scale-90 group-hover:-rotate-6">
    {Array.from({length: 2}).map((_, idx)=> <div key={idx} className={`z-10 ${idx % 2 === 0 ? "rotate-1" : "-rotate-1"}`}><TappenCard /></div>)}
        
        <div className="shadow-md z-20 rotate-6"><TappenCard skin="showcase">
            <div className="w-full h-full flex flex-1 justify-center items-center">
            <span className=" mx-auto mt-4 bg-blend-screen opacity-[1%]">
            <Image className="w-32" src="/tappen_logo.svg" alt="logo" width={256} height={256} />
                </span>
            </div>
            </TappenCard></div>
            </div>
        
        <Link className="p-8 pb-10 w-full flex gap-2 text-xl justify-end group-hover:text-tappen-purple-400 transition duration-300 uppercase" href="https://hub.tappen.app/?page=decks">learn more <ArrowUpRightIcon className="w-5" /></Link>
    </div>
    <div className="border-2 gap-2 border-opacity-50 group cursor-pointer rounded border-tappen-blue-600 hover:border-tappen-sunset-400 bg-tappen-blue-900 flex-1 flex flex-col justify-between items-center text-start">
    <div className="p-8 flex flex-col gap-4 w-full">
        <h3 className="font-bang text-6xl text-tappen-sunset-400 uppercase">Skins</h3>
    <div><span className="font-sans uppercase font-bold p-2 px-4 bg-tappen-blue-400 rounded-full text-xs">spice up cards to give your message expression</span></div>
        </div>
        
            <div className="flex flex-row -space-x-80 transition-transform duration-500 cursor-pointer scale-75 group-hover:scale-90 group-hover:animate-shake">
       
        <div className="-rotate-6 shadow-md z-20"><TappenCard skin="showcase"><div className="w-full h-full flex fontStyle_mid justify-center items-center text-5xl font-serif">
            What does your inner voice sound like?
            </div></TappenCard></div>
            <div className="shadow-md z-10"><TappenCard skin="showcase" /></div>
            </div>
            <Link className="p-8 pb-10 w-full flex gap-2 text-xl justify-end group-hover:text-tappen-sunset-400 transition duration-300 uppercase" href="https://hub.tappen.app/shop">learn more <ArrowUpRightIcon className="w-5" /></Link>
            </div>
    </div>
  
        </section>
}