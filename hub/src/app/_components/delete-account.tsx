'use client'
import { useState } from "react"
import Modal from "./modal"
import { api } from "@/trpc/react"
import { useRouter } from "next/navigation"
export default function DeleteAccount(props: {user: {name:string, id: string}}) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [step, setStep] = useState(0)
    const [deleteAccountValue, setDeleteAccountValue] = useState("")
    const [deleteAccountError, setDeleteAccountError] = useState("")

    const { mutateAsync: deleteUser, isError, isPending } = api.user.deleteUser.useMutation({
        onError: (e) => {
            setDeleteAccountError(e.message)
        }
    })

    function handleCancelDelete(){
        setIsDeleting(false)
        setStep(0)
        setDeleteAccountValue("")
    }

    async function handleDeleteAccount(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(deleteAccountValue === props.user.name ){
        await deleteUser({name:props.user.name, id: props.user.id})
        router.push("/")
    }else{
        setDeleteAccountError("Deleted user name in field must be the same as yours. ('anonymous' if empty)")
    }
    }
    
    return <div>
        <Modal selector="modal-hook" show={isDeleting}>
    <div className="absolute w-full h-screen bg-black/90 flex justify-center items-center z-[999]">
    {!isPending && <div className="w-full max-w-xs p-2 bg-tappen-blue-500 rounded text-tappen-blue-100">
    {step === 0 && <div className="size-full border-2 rounded-sm border-tappen-purple-400 p-4 flex flex-col gap-4">
    <h2 className="text-xl font-bold">ARE YOU SURE?</h2>
    <p>You are about to delete your tappen app account. Please be noted that this process can not be undone and all your cards and purchases will be deleted after this.</p>
    <div className="w-full flex flex-col gap-4">
    <button className="w-full p-2 bg-tappen-blue-400" onClick={() => setStep(prev => prev + 1)}>I AM SURE</button>
    <button className="w-full p-2 bg-tappen-purple-400" onClick={handleCancelDelete}>CANCEL</button>
    </div>
    </div>}
    {step === 1 && <div className="size-full border-2 rounded-sm border-tappen-purple-400 p-4 flex flex-col gap-4">
    <h2 className="text-xl font-bold">DELETE ACCOUNT</h2>
    <p>We are sad to see you go and leave tappen app. thank you for your time and see you anytime. But to make sure your choice is final, please type in your username to delete your account.</p>
    <div className="w-full ">
    <form className="w-full flex flex-col gap-4" onSubmit={ handleDeleteAccount }>
    <input className="text-tappen-blue-500 w-full bg-tappen-blue-200 p-1" onChange={e => setDeleteAccountValue(e.target.value)} value={deleteAccountValue} />
    {isError && deleteAccountError && <span className="text-tappen-purple-400 font-mono">{deleteAccountError}</span>}
    <button type="submit"  className="w-full p-2 bg-tappen-blue-400" >DELETE ACCOUNT</button>
    <button type="button" className="w-full p-2 bg-tappen-purple-400" onClick={handleCancelDelete}>CANCEL</button>
    </form>
    </div>
    </div>}
</div>}
</div>
        </Modal>
     <button onClick={() => setIsDeleting(true)}  className='w-full text-center transition duration-300 text-tappen-purple-400 hover:animate-pulse group rounded flex gap-4 justify-between items-center'>Delete Account</button>
     </div>
}