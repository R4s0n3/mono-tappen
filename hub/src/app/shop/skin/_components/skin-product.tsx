'use client'
import { api } from "@/trpc/react"
import { ArrowPathIcon, ChevronLeftIcon } from "@heroicons/react/24/solid"
import { EyeIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { useRouter } from "next/navigation";


import CardSkin from "@/app/_components/tappen-card/_elements/card-skin";

type SkinProductProps = {
    skin:string,
    user: string
}


export default function SkinProduct(props:SkinProductProps){

const router = useRouter()

    const {skin, user} = props


    const {data:intentResponse, isLoading, isError, error} = api.payment.createSkinIntent.useQuery(({skin, userId:user}),{
        retry:2
    })

  useEffect(() => {
    if(intentResponse && intentResponse.checkout_session !== null){
      router.push(intentResponse.checkout_session)
    }
  },[intentResponse, router])

    if(!intentResponse && isLoading)return <span className="animate-spin"><ArrowPathIcon className="size-8"/></span>

    return <div className="w-full flex flex-col gap-8 justify-center items-center max-w-screen-lg ">
<button 
                type="button"
                onClick={() => router.back()} 
                className="flex w-full px-4 text-center justify-center items-center gap-2 text-3xl uppercase"
            >
                <ChevronLeftIcon className="size-8" /> cancel
            </button>
    <div className="w-full flex flex-col-reverse lg:flex-row gap-8">
        <div id="product-view" className="flex-1 flex  w-full flex-col gap-8  items-center">
             <div className="aspect-[5/7] w-full max-w-xs">
            <CardSkin skinId={skin}>
                <div className="size-full flex flex-col justify-between p-4">
            <span className="flex gap-2 items-center"><EyeIcon className="size-8" /> Preview</span>
                </div>
            </CardSkin>
            </div>
        </div>
        <div className="flex-1">
 
  
      {!intentResponse?.checkout_session && isError && <span className="flex h-full flex-col justify-center items-center font-mono text-xl text-tappen-purple-500">{error.message}</span>}
        </div>
      </div>
    </div>
}