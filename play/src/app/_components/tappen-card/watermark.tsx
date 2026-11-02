import Image from 'next/image'

export default function WaterMark(){
    return <span className="mx-auto lg:mt-4 bg-blend-screen opacity-[1%]">
   <Image className='w-5 md:w-7' src='/tappen_logo.svg'  alt="tappen" width={28} height={28} />
    </span>    
}