'use client'
import { api } from "@/trpc/react"
import { ArrowPathIcon, DocumentCurrencyEuroIcon } from "@heroicons/react/24/solid"
import Link from "next/link"


type PaymentItem = {
    id:string,
    shopId: string | null,
    purchasedAt: Date,
    status: string,
    receiptUrl: string | null,
    type: string
  }
  
  
  export default function PaymentHistoryList(props: {history: PaymentItem[]}){
  
    const {history} = props
    return <div className="w-full max-w-md gap-2 flex flex-col">
      <h2 className="text-2xl font-bold underline underline-offset-2">PAYMENT HISTORY</h2>
      <ul className="flex flex-col w-full rounded border-2 p-0.5 border-tappen-blue-500 bg-tappen-blue-400 max-h-72 overflow-y-auto">
      {history.map((item) => <ListItem key={item.id} {...item} />)}
      </ul>
    </div>
  }
  
  
  function ListItem(item: PaymentItem){
    const { id, shopId, purchasedAt, status, receiptUrl, type } = item
    const canLoadReceipt = (status === "COMPLETED" || status === "REFUNDED") && Boolean(shopId)
    const { data: receipt, isLoading } = api.payment.getBill.useQuery(
        shopId ?? "missing",
        { enabled: canLoadReceipt && !receiptUrl }
      );
    const receiptLink = receiptUrl ?? receipt ?? null;

    return <li id={id} className="w-full flex gap-2 flex-col bg-tappen-blue-400 p-2 border-b border-b-tappen-blue-500">
      <div className="flex justify-between ">
    <span className="font-bold text-xs">TYPE: {type} </span>
    <span className="font-bold text-xs">{new Date(purchasedAt).toLocaleDateString()}</span>
      </div>
      <div className="flex justify-between">
    <span>status: {status.toLocaleLowerCase()}</span>
    {receiptLink && <Link className="flex gap-2" href={receiptLink} target="_blank" >Receipt <DocumentCurrencyEuroIcon className="size-6" /></Link>}
    {isLoading && !receiptLink && <ArrowPathIcon className="size-6 animate-spin"/>}
      </div>
    </li>
  }
