import Link from "next/link";

import { getServerAuthSession } from "@/server/auth";
import { DashNavigation } from "@/app/_components/dash-navigation";

import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";

import PayNow from "../_components/pay-now";

export default async function SupscribePage() {

  const session = await getServerAuthSession();

  
  type SubInfoItem = {
    desc: string,
    value: boolean | string | number
  }

type SubInfo = {
    title: string,
    features: SubInfoItem[],
    price: number
}

const base_features:SubInfoItem[] = [
      {desc: "Community Cards", value: true},
      {desc: "Tappen Original Decks", value: false},
      {desc: "Premium Skin", value: false},
      {desc: "Faved cards Deck", value: true},
      {desc: "Individual Decks", value: 1},

]

const premium_features:SubInfoItem[] = [
      {desc: "Community Cards", value: true},
      {desc: "Tappen Original Decks", value: true},
      {desc: "Premium Skin", value: true},
      {desc: "Faved cards Deck", value: true},
      {desc: "Individual Decks", value: 30},
]

const BASE = {
    title: "basic",
    features: base_features,
    price: 0
}

const PREMIUM = {
    title: "premium",
    features: premium_features,
    price: 799
}

const SUBS_INFO:SubInfo[] = [ BASE, PREMIUM ]

function createSubInfoItems(subInfo: SubInfo){
    const { title, features, price} = subInfo
    function createInfo(info: SubInfoItem){

        // Check if info.value is not a boolean and render it as a string
        const valueToRender = typeof info.value === 'boolean' ? 
            (!info.value ? <XMarkIcon className="size-5" /> : <CheckIcon className="size-5" />) : 
            info.value;

        return <li className={`w-full flex justify-between ${!info.value && "line-through"}`}>
            <span>{info.desc}</span>
            <span className={`${!info.value && "line-through"}`}>{valueToRender}</span>
        </li>
    }
    return <div className="rounded bg-gradient-to-br from-tappen-blue-500 to-tappen-blue-800 shadow-md flex-1 p-2">
        <div className={`size-full flex flex-col gap-5 rounded-sm justify-between p-3 border-2 ${title === "premium" ? "border-tappen-sunset-300": "border-tappen-blue-100"}`}>
        <h5 className="uppercase text-3xl font-bold">{title}</h5>
    <ul className="w-full">
        {features.map(createInfo)}
    </ul>
    <div className="flex justify-between items-center">
    <span>{(price / 100).toFixed(2)}€</span>
    {price > 0 && <PayNow user={session?.user.id ?? ""} products={["tappen_premium"]} />}
    </div>
    </div>
    </div>
}
  if(!session) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-[5rem]">
          Tappen Hub
        </h1>
  <div className="flex flex-col items-center justify-center gap-4">
  <Link
    href={session ? "/api/auth/signout" : "/api/auth/signin"}
    className="rounded-full bg-pirrot-blue-50/10 px-10 py-3 font-semibold no-underline transition hover:bg-pirrot-blue-50/20"
  >
    {session ? "Sign out" : "Sign in"}
  </Link>
</div> 
</div>
</main>
)

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-tappen-blue-50">
      <DashNavigation page="cards" session={session !== null} />
      <div className="w-full h-full text-tappen-blue-100 min-h-screen flex justify-center items-center flex-col p-4 pt-48 pb-20 lg:pt-20">
        <div className="w-full max-w-screen-lg flex flex-col gap-8">
        <div className="base-full"><h2 className="text-3xl font-bold text-tappen-blue-100">TAPPEN PREMIUM</h2></div>
        <div className="w-full flex flex-col lg:flex-row gap-8 ">
            {SUBS_INFO.map(createSubInfoItems)}
            </div>
            </div>
      </div>
    </main>
  );
}

