

export function Fader({ open } : {open:boolean}){
 
    return <div className={`w-full flex justify-center items-center text-5xl h-dvh bg-tappen-blue-900 transition duration-300 absolute top-0 left-0
    opacity-0 scale-0 ${open && "scale-100 opacity-100"}`}>✨</div>

}