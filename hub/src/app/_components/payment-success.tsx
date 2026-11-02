"use client"
import { api } from "@/trpc/react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/solid"
import { useState, useEffect } from "react"

type PaymentSuccessProps = {
    shopId: string
}

type ResponseItem ={
    status: string,
    message?: string
}
export default function PaymentSuccess(props:PaymentSuccessProps){

    const { shopId } = props
    const [data, setData] = useState<ResponseItem>()
    const { mutateAsync:handledPaymentSuccess, error, isError, isPending } = api.payment.confirm.useMutation({
        retry:1,
        onSuccess:(data) => {
            setData(data)
        }
    })

   
    useEffect(() => {
        async function handlePayment(){
            try{
                await handledPaymentSuccess({shopId})
            }catch(e){
                console.log("ERROR: ", e)
            }
        }

        void handlePayment()

    },[handledPaymentSuccess, shopId])


    return <div className="size-full min-h-screen flex flex-col gap-2 justify-center items-center">
    {!data && isPending && !isError ?<div className="flex flex-col justify-center items-center gap-2">
      
            <ArrowPathIcon className="size-8 text-tappen-blue-100 animate-spin" />
            <span>processing data...</span>
    </div>
    :
        data && <h2 className={`flex flex-col justify-center items-center gap-2 text-xl uppercase ${isError ? "text-tappen-purple-400" : "text-tappen-green-400"}`}>
            {isError ? <XMarkIcon className="size-8" /> : <CheckCircleIcon className="size-8" />}
            {data.status}
            
        </h2>}
        <h5>{data?.message ?? error?.message}</h5>
    </div>
}