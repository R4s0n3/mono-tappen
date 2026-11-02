'use client'
import CardSkin from "@/app/_components/tappen-card/_elements/card-skin"
import { PercentBadgeIcon } from "@heroicons/react/24/solid"

import { useEffect, useState } from "react"

import Link from "next/link"

type ProductSkin = {
    id: string,
    name: string
}

type ProductItem = {
    id: string
    name: string
    desc: string | null
    price: number
    type: string
    skins: ProductSkin[]
}

type FeaturedProductsProps = {
    products: ProductItem[]
}

export default function FeaturedProducts(props: FeaturedProductsProps) {
    const { products } = props


    const subscriptions = products.filter(p => p.type === "SUBSCRIPTION")
    const bundles = products.filter(p => p.type === "BUNDLE")

    return <div className="w-full flex justify-center items-center">
        <div className="size-full max-w-screen-xl flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex flex-col gap-3">
                <h2 className="text-3xl underline underline-offset-4">Subscriptions</h2>
            <ProductsFader items={subscriptions} />
            </div>
            <div className="flex-1 flex flex-col gap-3">
            <h2 className="text-3xl underline underline-offset-2">Bundles</h2>
            <ProductsFader items={bundles} />
            </div>
        
        </div>
    </div>
}

function ProductsFader(props: { items: ProductItem[] }) {
    const { items } = props;
    const [currentIdx, setCurrentIdx] = useState<number>(0);
    const [isTransition, setIsTransition] = useState(false);

    const currentItem = items?.[currentIdx];

    useEffect(() => {
        if (items.length > 1) {
            const interval = setInterval(() => {
                if (document.hidden) return;

                setIsTransition(true);

                setTimeout(() => {
                    setCurrentIdx((prev) => (prev + 1 >= items.length ? 0 : prev + 1));
                    setIsTransition(false);
                }, 500);
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [items.length]);

    const itemPrice = currentItem?.price ?? 0;

    function createSkinItems(skin: ProductSkin, idx:number, allSkins:ProductSkin[]){

        const skinsAvailable = allSkins.length
        function getTextSize(){
            switch (true) {
                case skinsAvailable === 1:
                    return "p-2 text-6xl"
                   
                case skinsAvailable === 2:
                    return"text-xl p-1"
                    
                case skinsAvailable === 3:
                    return "text-sm "
               

            
                default:
                    return "text-xl"
            }
        }

        function getCardSize(){
            switch (true) {
                case skinsAvailable === 1:
                    return "max-w-xs"
                   
                case skinsAvailable === 2:
                    return "flex-1"
                    
                case skinsAvailable === 3:
                    return "flex-1 max-w-24 lg:max-w-32"
        
                default:
                    return "max-w-xs"
            }
        }

        const textSize = getTextSize()
        const cardSize = getCardSize()
        return   <div className={`w-full ${cardSize} aspect-[5/7]`} key={idx}>
            <CardSkin skinId={skin.id}>
            <span className={`first-letter:uppercase ${textSize}`}>spice up your questions.</span>
            </CardSkin>
        </div>
    }

    return (
        <div className="flex flex-col shadow bg-tappen-blue-600 rounded p-1.5 h-full">
            <div
                className={`size-full flex flex-col gap-6 justify-between transition duration-500 border-tappen-blue-400 border-2 rounded-sm p-3 ${
                    isTransition ? "opacity-0" : "opacity-100"
                }`}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-4xl font-bold uppercase">{currentItem?.name}</h2>
                    {currentItem?.type === "BUNDLE" && (
                        <PercentBadgeIcon className="size-10 text-tappen-sunset-400" />
                    )}
                </div>
                <div className="flex flex-col gap-8">
                    
                    <div className="flex-1 flex justify-center">
                        <div className={`flex gap-2`}> 
                        {currentItem?.skins.map(createSkinItems)}
                        </div>
                    </div>
                </div>
                    {currentItem?.desc && <div className="">
                        <p className="first-letter:uppercase">{currentItem?.desc}</p>
                    </div>}
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold uppercase">{(itemPrice / 100)?.toFixed(2)}€</h2>
                    <Link href={makeLink(currentItem?.type ?? "SKIN", currentItem?.id)}>Buy now</Link>
                </div>
            </div>
        </div>
    );
}

function makeLink(type="SKIN", id?:string){
        if(type === "SUBSCRIPTION"){
            return `/shop/subscribe`
        }
        if(type === "BUNDLE"){
            return `/shop/bundle/${id}`
        }
        return `/shop/skin/${id}`
}