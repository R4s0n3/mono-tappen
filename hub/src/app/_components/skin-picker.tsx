'use client'

import TappenCard from "./tappen-card/tappen-card"
import { useKeenSlider } from "keen-slider/react"
import "keen-slider/keen-slider.min.css"
import CardSkin from "./tappen-card/_elements/card-skin"
import { type SyntheticEvent, useState } from "react"
import type { SkinItem } from "./card-builder"
import { EyeIcon, ShoppingBagIcon } from "@heroicons/react/24/solid"
import Link from "next/link"
import { formatPrice } from "@/util/payment/actions"

type SkinPickerProps = {
    skins: SkinItem[],
    previewText: string,
    hasSkin?:string,
    onPickedSkin: (skinId:string) => void
}

export function SkinPicker(props: SkinPickerProps){
    const {hasSkin, skins, previewText} = props
    const defaultSkinId = hasSkin ?? skins.find(s => s.name === "default")?.id
    const [pickedSkin, setPickedSkin] = useState(defaultSkinId)
    
    const [ref] = useKeenSlider<HTMLDivElement>({
      slides: { origin: 'auto', perView: 1 },
      breakpoints: {
        "(min-width: 400px)": {
          slides: { origin: 'auto', perView: 1 },
        },
        "(min-width: 600px)": {
          slides: { origin: 'auto', perView: 2 },
        },
        "(min-width: 1000px)": {
          slides: { origin: 'auto', perView: 3 },
        },
      },
  })


    function createSkinItem(item: SkinItem, idx:number){

        function handleItemClicked(e:SyntheticEvent){ 
          e.preventDefault()
          e.stopPropagation()
          
          props.onPickedSkin(item.id)

          switch(true){
            case item.name === "default":
              setPickedSkin(item.id)
            default:
              item.isOwned && setPickedSkin(item.id)
          }
        }


        return <div key={idx} onClick={handleItemClicked}  className="w-full aspect-[5/7] flex justify-center items-center keen-slider__slide p-1.5 relative">
            <div className="size-full relative">
        {item.name !== "default" && !item.isOwned && <Link href={`/shop/skin/${item.id}`}  className="absolute size-full flex flex-col gap-2 justify-center rounded items-center bg-tappen-blue-900/80 hover:bg-tappen-blue-900/90 z-40"><ShoppingBagIcon className="size-8" />
        {formatPrice(item.price)}</Link>}
        <TappenCard skin={item.id}>
            <div className=" flex p-2 lg:p-4 text-2xl">
                {item.name}
            </div>
        </TappenCard>
            </div>
        </div>
    }

    const filteredSkins = skins.filter(s => s.id !== pickedSkin )

    function renderTextStyle(){
      let textSize
      switch (true) {
        case previewText.length > 42:
          textSize = "text-lg md:text-3xl lg:text-3xl"
          break;
          default:
          textSize = "text-lg md:text-3xl lg:text-3xl"
          break;
      }

      return `${textSize} `
    }

    const previewTextStyle = renderTextStyle()

    return  <div className='w-full flex flex-col gap-4 z-40 relative'>
    <h3 className='text-3xl font-semibold'>Skin</h3>
    {ref && <div className="w-full flex">
            {/* Fixed Preview Card */}
            <div className="w-1/2 md:w-1/3 lg:w-1/4 flex-shrink-0 p-1.5 aspect-[5/7]">
                <div className="h-full py-1">
                    <CardSkin skinId={pickedSkin}>
                        <div className="size-full p-1.5 pt-3 md:p-2 md:pt-4 flex flex-col justify-between">
                            <p className={previewTextStyle}>{previewText}</p>
                            <span className="w-full flex gap-2 opacity-20"><EyeIcon className="size-6 " /> Preview</span>
                        </div>
                    </CardSkin>
                </div>
            </div>
            
            {/* Sliding Cards */}
            <div ref={ref} className='keen-slider flex-1 min-w-0'>
                {filteredSkins?.map(createSkinItem)}
            </div>
        </div>}
    </div>

}