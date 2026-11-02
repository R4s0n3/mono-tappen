'use client'
import { useState } from "react";
import { CheckIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

type UpdateNameProps = {
    currentName: string | null | undefined,

}
export default function UpdateName(props:UpdateNameProps){
    const router = useRouter()
    const [editMode, setEditMode] = useState(false)
    const [nameValue, setNameValue] = useState(props.currentName ?? "")
    const [errorMessage, setErrorMessage] = useState("")
    const { mutateAsync: updateName, isPending, isSuccess, isError } = api.user.updateUsername.useMutation({
        onSuccess: () => {
            setNameValue("")
            setEditMode(false)
            router.refresh()
            setErrorMessage("")
        },
        onError: (e) => {
            console.log("DA__ERROR: ", e.message)
            const errorText = e.message ?? "";
            setErrorMessage(errorText);
        }
    })

    async function handleSubmitChangeMail (e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        await updateName(nameValue)
    }


    return <div className="flex gap-2 flex-col">
        <span className="text-2xl font-bold">Username:</span>
        <div className="flex gap-4 items-center justify-between">    
        {isPending && <span>changing username...</span>}
        {!isPending && editMode ? <form className="flex gap-4 w-full items-center" onSubmit={handleSubmitChangeMail}>
        <input className="text-tappen-blue-500 w-full bg-tappen-blue-200 p-1" value={nameValue} onChange={e => setNameValue(e.target.value)} />
        <button type="submit"  className="p-1 rounded bg-tappen-blue-400/80 hover:bg-tappen-blue-400/90 text-tappen-green-400"><CheckIcon className="size-6" /></button>
        </form> : <span className="flex items-center gap-1">{!isPending && props.currentName}</span> }
        <button type="button"  className={`p-1 rounded bg-tappen-blue-400/80 hover:bg-tappen-blue-400/90 ${editMode ? "text-tappen-purple-400" : "text-tappen-blue-100"}`} onClick={() => setEditMode(prev => !prev)}>
        {!isPending && editMode ? <XMarkIcon className="size-6"  /> : <PencilIcon className="size-6" />}
        </button>
        </div>
        {isSuccess && <span className="font-mono text-tappen-purple-400">username changed</span>}
        {isError && errorMessage && <span className="font-mono text-tappen-purple-400">{errorMessage}</span>}
    </div>
}