'use client'
import { api } from "@/trpc/react"
import { ArrowPathIcon } from "@heroicons/react/24/solid"
import { useRouter } from "next/navigation"

type PayNowProps = {
    user: string,
    products: string[]
}

export default function PayNow(props: PayNowProps){
    const { user } = props
    const router = useRouter()
    const { mutate, isPending, error } = api.payment.createSubIntent.useMutation({
        onSuccess: (intentResponse) => {
            if (intentResponse.checkout_session) {
                router.push(intentResponse.checkout_session)
            }
        },
    })
    const errorText = error?.message ?? ""

    return <button type="button" className={`p-2 px-3 transition duration-300 ${errorText ? "bg-tappen-purple-400" : "bg-tappen-green-400"} rounded flex items-center gap-2`} disabled={isPending} onClick={() => mutate({ userId: user })} >{isPending && <span className="animate-spin"><ArrowPathIcon className="size-4" /></span>}{errorText ? errorText : "Buy now!"}</button>
}
