'use client'
import { useState } from 'react'
import type { Visibility } from '@prisma/client'
import { api } from '@/trpc/react'
import { InformationCircleIcon, LockOpenIcon, } from '@heroicons/react/24/outline'
import { EyeIcon, LockClosedIcon, UserGroupIcon } from '@heroicons/react/24/solid'
import { Fader } from './fader'
import { SkinPicker } from './skin-picker'
import { useRouter } from 'next/navigation'

export type SkinItem = {
  id:string
  name:string
  price:number
  isOwned: boolean
}

type VisibilityState = {
  public: boolean;
  shared: boolean;
  private: boolean;
};

export type DefaultCardItem = {
  id:string,
  skin:string,

  content:string,

  tags: string[],
  visibility: "public" | "shared" | "private",

  isAuthor: boolean,
  nsfw:boolean,
}

type CardBuilderProps = {
  tags: string[],
  skins: SkinItem[],
  isUpdateMode?: boolean,
  existingCard?: DefaultCardItem
}


export function CardBuilder(props: CardBuilderProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const {skins} = props

const handleVisibility = (id: 'public' | 'shared' | 'private'): VisibilityState => ({
  public: false,
  shared: false,
  private: false,
  [id]: true,
});

  const defaultVisibility = handleVisibility(props.existingCard?.visibility ?? "public")

  const createCard = api.card.create.useMutation({
    onMutate: () => {
      setIsCreating(true)
    },
    onSuccess: () => {
      
      setIsAdultContent(false)
      setVisibilityState(defaultVisibility)

      setTimeout(() => {
        setContent("")
        setSelectedTags([])
        setIsCreating(false)
      }, 2000)
      router.push("/?page=cards")
      router.refresh()
    },
  })

  const updateCard = api.card.update.useMutation({
    onMutate: () => {
      setIsCreating(true)
    },
    onSuccess: () => {

      setIsAdultContent(false)
      setVisibilityState(defaultVisibility)

      setTimeout(() => {
        setContent("")
        setSelectedTags([])
        setIsCreating(false)
      }, 2000)
      router.push("/?page=cards")
      router.refresh()
    },
  })

  const [content, setContent] = useState(props.existingCard?.content ?? "")
  const [tagValue, setTagValue] = useState("")
  const [isAdultContent, setIsAdultContent] = useState(props.existingCard?.nsfw ?? false)
  const [selectedTags, setSelectedTags] = useState<string[]>(props.existingCard?.tags ?? [])
  const [tagError, setTagError] = useState("")
  
  const tagNames = props.tags

  const [visibilityState, setVisibilityState] = useState<VisibilityState>(defaultVisibility)

 

  const visibilityOptions = [
    {
      id: 'public',
      label: 'Public',
      icon: EyeIcon,
      description: 'Visible to everyone on the platform'
    },
    {
      id: 'shared',
      label: 'Shared',
      icon: UserGroupIcon,
      description: 'Visible only to specific users or groups'
    },
    {
      id: 'private',
      label: 'Private',
      icon: LockClosedIcon,
      description: 'Visible only to you'
    },
  ] as const;

 

  function handleAddNewTag(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
         
    if(tagValue.toLocaleLowerCase() === "nsfw"){
      setIsAdultContent(true)
      setTagValue("")
     return
   }

    if (selectedTags.length >= 3) {
      setTagError("max-error")
      setTimeout(() => {
        setTagError("")
      }, 2000)
      return
    }

    const existingTag = selectedTags.some(tn => tn.toLocaleLowerCase() === tagValue.toLocaleLowerCase())
 

    if (existingTag) {
      setTagError(tagValue)
      setTimeout(() => {
        setTagError("")
      }, 500)
    }

    if (tagError === "" && !existingTag && tagValue.length > 0) {
      setSelectedTags(prev => [...prev, tagValue])
      setTagValue("")
    }


  }

  function handleAddTag(tn: string) {

    if (selectedTags.length >= 3) {
      setTagError("max-error")
      setTimeout(() => {
        setTagError("")
      }, 2000)
      return
    }

    const existingTag = selectedTags.some(tname => tname.toLocaleLowerCase() === tn.toLocaleLowerCase())

    if (existingTag) {
      setTagError(tn)
      setTimeout(() => {
        setTagError("")
      }, 500)
    }

    if (tagError === "" && !existingTag && tn.length > 0) {
      setSelectedTags(prev => [...prev, tn])
      setTagValue("")
    }

  }

  function handleRemoveTag(tname: string) {
    const filteredTags = selectedTags.filter(tag => tag !== tname)
    
    setSelectedTags(filteredTags)
  }

  const pickedPrivacyOption: keyof typeof Visibility = (Object.entries(visibilityState).find(([_, value]) => value)?.[0] ?? 'public').toUpperCase() as keyof typeof Visibility;

  const defaultSkin = props.existingCard?.skin ?? "default"
  const [pickedSkin, setPickedSkin] = useState(defaultSkin)
  
  async function handleSubmitCardForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    try {
      props.isUpdateMode ?
      await updateCard.mutateAsync({
        id:props.existingCard!.id,
        content,
        tags: selectedTags.map(t => t.toLocaleLowerCase()),
        nsfw: isAdultContent,
        visible: pickedPrivacyOption,
        skin: pickedSkin
      })
      :
      await createCard.mutateAsync({
        content,
        tags: selectedTags.map(t => t.toLocaleLowerCase()),
        nsfw: isAdultContent,
        visible: pickedPrivacyOption,
        skin: pickedSkin
      })
    } catch (error) {
      console.error(`Error ${props.isUpdateMode ? "updating" : "creating"} card: `, error)
    }
  }

  const filteredTagNames = tagNames.filter(tn => !selectedTags.includes(tn.toLocaleLowerCase()))

  function handlePickedSkin(skinId:string){
    setPickedSkin(skinId)
  }

  if(props.isUpdateMode && !props.existingCard) return null
  return <div className="w-full min-h-72 max-h-screen flex flex-col fixed top-0">
    <Fader open={isCreating} />
    <form className="w-full h-full bg-tappen-blue-900 flex flex-col items-center pt-36 py-4" onSubmit={handleSubmitCardForm}>
      <div className='w-full h-full flex flex-col items-center max-w-7xl'>
        <div className='flex justify-between w-full items-end  flex-1'>
          <div className='w-full flex justify-between gap-2 p-4'>
            <div className="w-full">
              <textarea
                maxLength={69}
                onChange={(e) => e.target.value.length <= 69 ? setContent(e.target.value) : null}
                className="w-full h-full resize-none focus:outline-none leading-loose focus:ring-0 bg-transparent text-tappen-blue-50 text-3xl lg:text-5xl"
                placeholder="Ask a new question..."
                value={content}
              />
            </div>
          </div>
        </div>
        <div className='flex justify-between items-center w-full px-4'>
          <div className='bg-tappen-blue-500 text-xl p-3 px-6 rounded-full justify-center items-center'>
            <button
              type="submit"
            >save card</button>
          </div>
          <span className='text-tappen-purple-400 font-mono mt-2 flex gap-2'>{content.length} / 69</span>
        </div>
      </div>
    </form>
    <div className=" p-4 lg:p-8 pb-12 flex flex-col items-center gap-8 w-full overflow-y-auto">
      <div className='w-full flex flex-col gap-8 max-w-7xl'>
        {/* SKINPICKER */}
        {!isCreating && <SkinPicker skins={skins} hasSkin={props.existingCard?.skin} previewText={content} onPickedSkin={handlePickedSkin} />}
        <div className='w-full flex flex-col lg:flex-row gap-4'>
          <div className='bg-tappen-blue-900/20 border-tappen-blue-500/50 flex-1 flex flex-col gap-4 p-4 '>
            <h3 className='text-3xl font-semibold'>Tags</h3>
            <span className="text-tappen-purple-400 font-mono mt-2 flex gap-2 ">
              <InformationCircleIcon className='w-6 h-6 flex-shrink-0' /> Add tags to boost the visibility of your card and help it reach the right audience.
            </span>
            <form className='flex flex-col' onSubmit={handleAddNewTag}>
              <div className='w-full flex gap-2'>
                <div className='flex-1'>
                  <input placeholder='Enter tag name'
                  maxLength={15}
                    className='w-full border-b border-tappen-blue-900/50 resize-none focus:outline-none focus:ring-0 py-4 text-3xl bg-transparent text-tappen-blue-50'
                    onChange={e => e.target.value.length <= 15 ? setTagValue(e.target.value) : null} value={tagValue} />
                </div>
                <div className='flex justify-center items-center'>
                  <div className='w-12 lg:w-16 aspect-square  bg-tappen-blue-500 rounded-full flex justify-center items-center'>
                    <button
                      type="submit"
                      className='text-2xl lg:text-4xl  w-full h-full'
                    >+</button>
                  </div>
                </div>
              </div>
            </form>
            <div className='w-full flex flex-col lg:flex-row gap-4'>
              <div className='flex-1 flex flex-col gap-4'>
                <h2>Selected tags:</h2>
                <div className='w-full flex flex-wrap gap-4'>
                  {selectedTags?.map((tn, idx) => <button type="button"
                    className={`cursor-pointer p-1 px-4 rounded-full bg-tappen-blue-400 text-sm ${tagError.toLocaleLowerCase() === tn.toLocaleLowerCase() && "animate-shake"}`}
                    onClick={() => handleRemoveTag(tn.toLocaleLowerCase())} key={idx}>{tn.toLocaleLowerCase()}</button>)}
                  {isAdultContent && <button type="button"
                    className={`cursor-pointer p-1 px-4 rounded-full bg-tappen-purple-400 text-sm`}
                    onClick={() => setIsAdultContent(prev => !prev)}>nsfw</button>}
                </div>
              </div>
              <div className='flex-1 flex flex-col gap-4'>
                <h2>Hot tags:</h2>
                <div className='w-full flex-wrap flex gap-2 overflow-y-auto max-h-24'>
                  {filteredTagNames?.map((tn, idx) => <button type="button" className={`cursor-pointer p-1 px-4 bg-tappen-blue-500 rounded-full text-sm`}
                    onClick={() => handleAddTag(tn.toLocaleLowerCase())}
                    key={idx}
                  >{tn.toLocaleLowerCase()}</button>)}
                </div>
              </div>
            </div>
            <div>
              <span className={`text-purple-400 font-mono transition duration-500 ${tagError === "max-error" ? "opacity-100" : "opacity-0"}`}>max. 3 tags</span>
            </div>
            <div className='flex gap-4 justify-center items-center'>
              <div>
                {isAdultContent ? <LockClosedIcon className="w-6 h-6" /> : <LockOpenIcon className="w-6 h-6" />}
              </div>
              <input
                type="button"
                className={`w-full cursor-pointer flex text-center font-semibold gap-2 p-4 border border-tappen-purple-400 
                ${isAdultContent ? "bg-tappen-purple-400 text-tappen-blue-800" : "text-tappen-purple-400"}`}  
                onClick={() => setIsAdultContent(prev => !prev)}
                value={"NSFW"}
              />
            </div>
          </div>
          <div className='bg-tappen-blue-900/20 border-tappen-blue-500/50 flex-1 p-4 flex flex-col gap-4'>
            <h3 className='text-3xl font-semibold'>Visibility</h3>
            <span className="text-tappen-purple-400 font-mono mt-2 flex gap-2">
              <InformationCircleIcon className='w-6 h-6' /> {visibilityOptions.find(option => visibilityState[option.id])?.description}
            </span>
            <div className="w-full flex flex-col lg:flex-row gap-8">
              <div className='w-full flex flex-col gap-2'>
                {visibilityOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setVisibilityState(handleVisibility(option.id))}
                    className={`w-full flex gap-2 p-2 rounded ${visibilityState[option.id] ? 'bg-tappen-purple-400 text-white' : 'bg-tappen-blue-900/20'}`}
                  >
                    <option.icon className='w-5 h-5' /> {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

}