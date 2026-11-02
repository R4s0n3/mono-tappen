'use client'
import { api } from "@/trpc/react"
import { ArrowPathIcon, DocumentCurrencyEuroIcon } from "@heroicons/react/24/solid"
import Link from "next/link"


type PaymentItem = {
    id:string,
    shopId: string,
    purchasedAt: Date,
    status: string,
    receiptUrl:string,
    type: string
  }
  
  
  export default function PaymentHistoryList(props: {history: PaymentItem[]}){
  
    const {history} = props
    function createListItems(item:PaymentItem, idx:number){
      return <ListItem
        key={idx} 
        {...item}
      />
    }
    return <div className="w-full max-w-md gap-2 flex flex-col">
      <h2 className="text-2xl font-bold underline underline-offset-2">PAYMENT HISTORY</h2>
      <ul className="flex flex-col w-full rounded border-2 p-0.5 border-tappen-blue-500 bg-tappen-blue-400 max-h-72 overflow-y-auto">
      {history?.map(createListItems)}
      </ul>
    </div>
  }
  
  
  function ListItem(item: PaymentItem){
    const { id, shopId, purchasedAt, status, receiptUrl, type } = item
    const { data: receipt, isLoading } = api.payment.getBill.useQuery(
        shopId,
        // Only fetch if we don't already have the receipt URL
        { enabled: !receiptUrl }
      );
    console.log(receipt)
    const receipt_url = receiptUrl || receipt;

    return <li id={id} className="w-full flex gap-2 flex-col bg-tappen-blue-400 p-2 border-b border-b-tappen-blue-500">
      <div className="flex justify-between ">
    <span className="font-bold text-xs">TYPE: {type} </span>
    <span className="font-bold text-xs">{purchasedAt.toLocaleDateString()}</span>
      </div>
      <div className="flex justify-between">
    <span>status: {status.toLocaleLowerCase()}</span>
    {receipt && <Link className="flex gap-2"  href={receipt_url ?? ""} target="_blank" >Receipt <DocumentCurrencyEuroIcon className="size-6" /></Link>}
    {isLoading && !receipt && <ArrowPathIcon className="size-6 animate-spin"/>}
      </div>
    </li>
  }