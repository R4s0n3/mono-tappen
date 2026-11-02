'use client'
import { api } from "@/trpc/react"
import { ArrowPathIcon } from "@heroicons/react/24/solid"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type PayNowProps = {
    user: string,
    products: string[]
}

export default function PayNow(props: PayNowProps){
    const {user} = props
    const router = useRouter()
    const [isBuyIntent, setIsBuyIntent] = useState(false)
    const [errorText, setErrorText] = useState("")
    
    const {data: intentResponse, isLoading, error, isError} = api.payment.createSubIntent.useQuery({userId: user}, {
        enabled: isBuyIntent,
        retry:1,
    })

    useEffect(()=> {
        isError && setIsBuyIntent(false)
        setErrorText(error?.message ?? "")
        setTimeout(() => {
            setErrorText("")
        },2000)
    },[isError, error])

    useEffect(()=> {
        if(isBuyIntent && intentResponse && intentResponse.checkout_session !== null){
            router.push(intentResponse.checkout_session)
        }
    },[isBuyIntent, intentResponse, router])
 
    return <button className={`p-2 px-3 transition duration-300 ${errorText ? "bg-tappen-purple-400" : "bg-tappen-green-400"} rounded flex items-center gap-2`} onClick={() => setIsBuyIntent(true)} >{isLoading && <span className="animate-spin"><ArrowPathIcon className="size-4" /></span>}{errorText ? errorText : "Buy now!"}</button>
}

