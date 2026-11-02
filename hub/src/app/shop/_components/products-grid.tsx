'use client'
import CardSkin from "@/app/_components/tappen-card/_elements/card-skin"
import { ShoppingBagIcon } from "@heroicons/react/24/solid"

import Link from "next/link"

type SkinItem = {
    id:string
    name:string
    price:number

}

type ProductsGridProps = {
    skins: SkinItem[]
}

export default function ProductsGrid(props:ProductsGridProps){
    const { skins }= props
    const skinProducts = skins

    function createSkins(skin:SkinItem, idx:number){
        return <div key={idx}  className="w-full aspect-[5/7]">
            <CardSkin skinId={skin?.id ?? ""}>
              <Link href={`shop/skin/${skin.id}`} className="p-3 flex flex-col h-full justify-between">
           <h3 className="text-2xl">{skin?.name}</h3>
           <div className="flex justify-between items-center">
           <h5 className="text-2xl">{(skin.price / 100).toFixed(2)}€</h5>
           <ShoppingBagIcon className="size-8"/>
           </div>
              </Link>
            </CardSkin>
        </div>
    }
    return <div className="w-full flex flex-col justify-center items-center">
        <section id="skins"  className="w-full max-w-screen-xl flex flex-col gap-4">
        <h2 className="text-3xl underline underline-offset-4">Skins</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {skinProducts.map(createSkins)}
            </div>
        </section>
    </div>
}