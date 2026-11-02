import Image from 'next/image'

export default function WaterMark(){
    return <span className=" mx-auto mt-4 bg-blend-screen opacity-[1%]">
   <Image className='' src='/tappen_logo.svg'  alt="tappen" width={28} height={28} />
    </span>    
}