import Image from "next/image"
import Link from "next/link"

const socialLinks: SocialListItem[] = [
    {
        id:"discord",
        link:"https://discord.gg/WnmbAu8jfx",
        icon:"discord"
    },
    {
        id:"instagram",
        link:"https://instagram.com/tappen_app",
        icon:"insta"
    },
    {
        id:"tiktok",
        link:"https://tiktok.com/@tappen_app",
        icon:"tiktok"
    },
    {
        id:"twitter",
        link:"https://x.com/tappen_app",
        icon:"x"
    },
  ]

export default function Footer(){
    return <footer className="w-full font-sans flex  gap-8 justify-center items-center pt-24 lg:pb-24 bg-tappen-blue-900 p-8">
    <div className="w-full max-w-screen-xl grid grid-cols-2 gap-8 gap-y-16 lg:grid-cols-4">
    <div className="flex-1 flex flex-col gap-5 justify-between order-3 lg:order-1">
        <div className="flex flex-col gap-5">
      <h5 className="text-start font-bold uppercase">Come hang with us!</h5>
      <div className="w-full flex gap-4">
        {socialLinks.map(link => <Link key={link.id} href={link.link}><Image className="size-7" src={`/assets/social-media/${link.icon}.svg`} alt={link.id} width={50} height={50} /></Link>)}
      </div>
        </div>
        <div className="flex flex-col gap-1">
      <div className="flex gap-4 items-center">
        <div className="size-12 relative">
    <Image fill src="/logo.svg" alt="logo" />
        </div>
    <div className="flex flex-col text-start">
    <span className="text-xs">powered by</span>
    <h3 className="text-sm font-bold">Mio Mideal</h3>
    </div>
    </div>
    </div>
    </div>
    <div className="flex-1 flex flex-col gap-5 uppercase order-1 lg:order-2">
      <h5 className="text-start font-bold" >Links</h5>
      <div className="flex gap-4 flex-col">
        {["play", "info", "features"].map(link => link === "play" ? <Link className="text-start hover:text-tappen-blue-400 underline underline-offset-4 transition duration-300" key={link} href={`https://play.tappen.app`}>{link}</Link> : <Link className="text-start hover:text-tappen-blue-400 underline underline-offset-4 transition duration-300" key={link} href={`#${link}`}>{link}</Link>)}
    </div>
    </div>
    <div className="flex-1 flex flex-col gap-5 uppercase order-2 lg:order-3">
      <h5 className="text-start font-bold" >Tappen Hub</h5>
      <div className="flex gap-4 flex-col">
        {["login", "cards", "decks"].map(link => link === "login" ? <Link className="text-start hover:text-tappen-blue-400 underline underline-offset-4 transition duration-300" key={link} href={`https://hub.tappen.app/api/auth/signin`}>{link}</Link> : <Link className="text-start hover:text-tappen-blue-400 underline underline-offset-4 transition duration-300" key={link} href={`https://hub.tappen.app/?page=${link}`}>{link}</Link>)}
        <Link className="text-start hover:text-tappen-blue-400 underline underline-offset-4 transition duration-300" key={"shop"} href={`https://hub.tappen.app/shop`}>Skins</Link>
    </div>
    </div>
    <div className="flex-1 flex flex-col gap-4 order-4">
    <h5 className="uppercase text-start font-bold" >Legal</h5>
    <div className="flex gap-4 flex-col uppercase">
        {["terms of use", "privacy policy", "submission terms"].map(link => <Link className="text-start hover:text-tappen-blue-400 underline underline-offset-4 transition duration-300" key={link} href={`/legal#${link.split(" ").join("-")}`}>{link}</Link>)}
    </div>
    </div>
    </div>
    
  </footer>
}

type SocialListItem = {
    id:string,
    link: string,
    icon: string
  }

  // const year = new Date().getFullYear()