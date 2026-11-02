"use client"
import { api } from "@/trpc/react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/solid"
import { useState, useEffect } from "react"

type PaymentSuccessProps = {
    shopId: string
}

type ResponseItem = {
    status: string,
    message?: string
}

export default function PaymentSuccess(props: PaymentSuccessProps) {
    const { shopId } = props
    const [data, setData] = useState<ResponseItem>()
    const [failed, setFailed] = useState(false)
    const { mutateAsync: handledPaymentSuccess, error } = api.payment.confirm.useMutation({
        retry: 1,
    })

    useEffect(() => {
        let cancelled = false
        void handledPaymentSuccess({ shopId })
            .then((result) => {
                if (!cancelled) setData(result)
            })
            .catch((reason: unknown) => {
                console.error("payment confirm failed", reason)
                if (!cancelled) setFailed(true)
            })
        return () => {
            cancelled = true
        }
    }, [handledPaymentSuccess, shopId])

    const showSpinner = !data && !failed
    const showFailure = failed || data?.status === "failed"

    return <div className="size-full min-h-screen flex flex-col gap-2 justify-center items-center">
        {showSpinner ? <div className="flex flex-col justify-center items-center gap-2">
            <ArrowPathIcon className="size-8 text-tappen-blue-100 animate-spin" />
            <span>processing data...</span>
        </div>
            :
            <h2 className={`flex flex-col justify-center items-center gap-2 text-xl uppercase ${showFailure ? "text-tappen-purple-400" : "text-tappen-green-400"}`}>
                {showFailure ? <XMarkIcon className="size-8" /> : <CheckCircleIcon className="size-8" />}
                {showFailure ? "failed" : data?.status}
            </h2>}
        <h5>{data?.message ?? error?.message}</h5>
    </div>
}
