import { ArrowPathIcon } from "@heroicons/react/24/solid"

export default function LoadingSpinner(){
    return <div className="size-full flex justify-center items-center">
    <ArrowPathIcon  className="size-12 animate-spin"/>
        </div>
}