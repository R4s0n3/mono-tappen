import Slider from "react-slick";
import { EyeIcon } from "@heroicons/react/24/solid";

export function CardSlider({ items } : { items: SliderItemProps[] }){
    const sliderItems  = items
    const settings = {
        dots: true,
        infinite: false,
        speed: 500,
        slidesToShow: 4,
        slidesToScroll: 4,
        initialSlide: 0,
        responsive: [
          {
            breakpoint: 1024,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3,
              infinite: true,
              dots: true
            }
          },
          {
            breakpoint: 600,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 2,
              initialSlide: 2
            }
          },
          {
            breakpoint: 480,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1
            }
          }
        ]
      };

      function createSliderItems(item:SliderItemProps){
        return <SliderItem 
            {...item}
        />
      }

    return <div>
<Slider {...settings}>
      {sliderItems.map(createSliderItems)}

</Slider>
    </div>
}

type SliderItemProps = {
    id: string,
    content: string,
    border: string | null,
}

function SliderItem(item:SliderItemProps){
    return <div  className='w-full aspect-[5/7] bg-tappen-blue-100 flex justify-center items-center p-3 rounded-sm'>
    <div className='w-full h-full border-tappen-blue-500 border-2 card-border p-4 flex flex-col justify-between overflow-hidden'>
        <h5 className={`
            w-full 
            max-h-full 
            overflow-hidden  

            font-serif 
            text-tappen-blue-900 
            leading-tight 
            break-words
            `}>
            <span className="inline-block whitespace-normal">{item.content}</span>
        </h5>
        <span className='text-tappen-blue-900/80 flex gap-2'><EyeIcon className='w-6 h-6' /> Preview</span>
    </div>
</div>
}