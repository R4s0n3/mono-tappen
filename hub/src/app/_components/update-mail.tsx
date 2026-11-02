import { CheckBadgeIcon} from "@heroicons/react/24/solid";

type UpdateMailProps = {
    currentMail: string | null | undefined,
    isVerified?: boolean
}

export default function UpdateMail(props:UpdateMailProps){
    

    return <div className="flex gap-2 flex-col">
        <span className="text-2xl font-bold">E-Mail:</span>
        <div className="flex gap-4 items-center">
        <span className="flex items-center gap-1">{props.currentMail}{props.isVerified ? <CheckBadgeIcon className="size-6 text-tappen-sunset-400" /> : null}</span>  
        </div>
    </div>
}