'use client'
import { ArrowLeftCircleIcon, ArrowRightCircleIcon } from '@heroicons/react/24/outline'
import { ArrowUpRightIcon, CheckBadgeIcon } from '@heroicons/react/24/solid'
import 'keen-slider/keen-slider.min.css'
import { useKeenSlider } from 'keen-slider/react' // import from 'keen-slider/react.es' for to get an ES module
import { useState } from 'react'
import Link from 'next/link'

export function Merch(){
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loaded, setLoaded] = useState(false)
    const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
        mode: "free-snap",
        loop:true,
        slides: { origin: "center", perView: 1.5, spacing: 34},
      
        initial: 1,
        slideChanged(slider) {
          setCurrentSlide(slider.track.details.rel)
        },
        created() {
          setLoaded(true)
        },
      })
    return <section id="merch"  className="w-full flex flex-col justify-center items-center gap-14 pb-24 relative">
   
    <div className="flex-col w-full flex gap-8 justify-center items-center">
    <div className='w-full flex flex-col lg:flex-row max-w-screen-xl p-8 gap-8 justify-between items-center lg:items-end'>
    
    <h2 className=" text-7xl uppercase font-bang  max-w-screen-2xl ">Buy our Merch</h2>
    <div className='flex'>
    {loaded && instanceRef.current && (
          <> 
            <Arrow  
              left
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                instanceRef.current?.prev();
              }}
              disabled={currentSlide === 0}
            />
            <Arrow
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                instanceRef.current?.next();
              }}
              disabled={
                currentSlide ===
                instanceRef?.current.track.details.slides.length - 1
              }
            />
          </>
        )}
    </div>
    </div>
    {<div ref={sliderRef} className="keen-slider w-full py-10">
       {/* CLOTHING */}
      <div className="keen-slider__slide group cursor-pointer  bg-tappen-blue-900 shadow-lg hover:shadow-tappen-blue-400/5 transition-shadow duration-700 rounded p-2 lg:p-4">
      <div className='size-full text-left p-4 lg:p-8 rounded-sm border-2 gap-8 border-tappen-blue-400/50 group-hover:border-tappen-blue-400/80 transition-colors duration-700 flex flex-col justify-between items-center'>
      <h2>Clothing</h2>
      </div>
      </div>
      {/* INFO */}
      <div className="keen-slider__slide group cursor-pointer w-full bg-tappen-blue-900 shadow-lg hover:shadow-tappen-green-900/25 transition-shadow duration-700 rounded p-2 lg:p-4">
      <div className='size-full text-left p-4 lg:p-8 rounded-sm border-2 border-tappen-green-400/50 group-hover:border-tappen-green-400/80 transition-colors duration-700 flex flex-col justify-between items-center'>
      <div className='w-full flex justify-between'>
        <h2 className='w-full font-bold font-bang uppercase text-2xl lg:text-6xl'>Info</h2>
        </div>
        <div>
      <p className="text-xl p-0 lg:p-8 md:text-2xl lg:text-3xl 2xl:text-5xl 2xl:leading-relaxed font-sans text-start w-full max-w-screen-xl font-normal">Don’t miss out on the fun! Let your Tappen journey begin today and dive into your first game within just seconds. It’s quick, easy, and packed with laughs, creativity, and connection.</p>
    </div>
      <div className='flex w-full justify-end items-center flex-col lg:flex-row'>
      <Link href=""  className='text-xl lg:text-5xl  transition-all duration-700 group-hover:scale-105 flex gap-2  items-end'>read more <ArrowUpRightIcon className='size-5 lg:size-10' /></Link>
      </div>
        </div>
      </div>
      {/* TAPPEN PRO */}
      <div className="keen-slider__slide group cursor-pointer w-full bg-tappen-blue-900 shadow-lg hover:shadow-tappen-sunset-900/25 transition-shadow duration-700 rounded p-2 lg:p-4">
      <div className='size-full text-left p-4 lg:p-8 rounded-sm border-2 gap-4 border-tappen-sunset-400/50 group-hover:border-tappen-sunset-400/80 transition-colors duration-700 flex flex-col justify-between items-center'>
      <div className='w-full flex justify-between'>
        <h2 className='w-full font-bold font-bang uppercase text-2xl lg:text-6xl'>Tappen Pro</h2>
        </div>
      <CheckBadgeIcon className='text-tappen-sunset-400 group-hover:scale-105 transition duration-700 size-28 lg:size-96' />
      <div className='flex w-full justify-end items-center flex-col lg:flex-row'>
      <Link href=""  className='text-xl lg:text-5xl  transition-all duration-700 group-hover:scale-105 flex gap-2  items-end'>features <ArrowUpRightIcon className='size-5 lg:size-10' /></Link>
      </div>
        </div>
      </div>
      {/* PRINT */}
      <div className="keen-slider__slide group cursor-pointer w-full bg-tappen-blue-900 shadow-lg hover:shadow-tappen-purple-900/25 transition-shadow duration-700 rounded p-2 lg:p-4">
      <div className='size-full text-left  p-3 rounded-sm border-2 gap-4 border-tappen-purple-400/50 group-hover:border-tappen-purple-400/80 transition-colors duration-700 flex flex-col justify-between items-center'>
      <h2>Print</h2>
        </div>
      </div>
    </div>}
      </div>
    
</section>
}


function Arrow(props: {
  disabled: boolean
  left?: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const disabled = props.disabled ? " arrow--disabled" : ""
  return (
    <button
    type="button"
    onClick={props.onClick}
    className={`arrow ${disabled}`}>
      
      {props.left && (
       <ArrowLeftCircleIcon className='size-12' />
      )}
      {!props.left && (
        <ArrowRightCircleIcon className='size-12' />
      )}
</button>
  )
}



// DECKS
// HOODIES / SHIRTS
// STICKERS
// PREMIUM COUPON