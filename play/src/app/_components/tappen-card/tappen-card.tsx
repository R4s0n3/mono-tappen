'use client'
import { memo, useEffect, useState, useCallback } from "react"
import { api } from "@/trpc/react"
import CardSkin, { type CardSkinItem } from "./_elements/card-skin"
import { StarIcon, FireIcon, XMarkIcon } from "@heroicons/react/24/solid"
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline"
import { ArrowUpOnSquareIcon as ShareIcon, FlagIcon } from "@heroicons/react/24/outline"
import Modal from "../modal"
import { reasons } from "@/util/reasons"
import { CardFace, CardFooterFrame, cardFooterLabelClass } from "./card-face"

type TappenCardProps = {
  card?: string,
  skin?: string | CardSkinItem,
  children?: React.ReactNode
}

type CardData = {
  content: string,
  author: string,
  nsfw: boolean,
  isLiked: boolean
}

const defaultCardData: CardData = {
  content: "",
  author: "",
  nsfw: false,
  isLiked: false
}

type FooterIcon = {
  svg: React.ComponentType<{ className?: string }>;
  name: string;
  display: boolean;
}

type CardFooterProps = {
  authorTag: string,
  liked: boolean,
  nsfw: boolean,
  card: string
}

// Memoize the CardFooter component
const CardFooter = memo(function CardFooter(props: CardFooterProps) {
  const { authorTag, liked, nsfw, card } = props
  const [modalContent, setModalContent] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(liked)
  const { mutateAsync: toggleStarred, isPending: isLiking } = api.card.toggleStarred.useMutation({
    onSuccess: (result) => {
      setModalContent(result);
      setIsLiked(prev => !prev)
      setTimeout(() => setModalContent(null), 1234);
    },
    onError: (error) => {
      setModalContent(error.message);
      window.open('/api/auth/signin', '_blank');
    }
  })

  useEffect(() => {
    setIsLiked(liked)
  }, [liked])

  const { mutateAsync: makeReport, isPending: isReporting } = api.card.reportCard.useMutation({
    onSuccess: () => {
      setModalContent("REPORTED")
      setTimeout(() => {
        setModalContent(null)
      }, 1500)
    }
  })

  // Compute icons once based on component state
  const icons: FooterIcon[] = [
    {
      svg: ShareIcon,
      name: "share",
      display: true
    },
    {
      svg: StarIcon,
      name: "starred",
      display: isLiked
    },
    {
      svg: StarIconOutline,
      name: "not-starred",
      display: !isLiked
    },
    {
      svg: FireIcon,
      name: "nsfw",
      display: nsfw
    },
    {
      svg: FlagIcon,
      name: "flag",
      display: true
    },
  ];

  // Memoize button click handler
  const handleButtonClicked = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const pressedId = event.currentTarget.id

    if (pressedId === "share") {
      const shareData = {
        title: 'Check out this Tappen card',
        text: 'I found this interesting card on Tappen!',
        url: `https://hub.tappen.app/card/${card}`
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareData.url);
          setModalContent("Link copied to clipboard!");
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = shareData.url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setModalContent("Link copied!");
        }
        setTimeout(() => setModalContent(null), 1500);
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else if (pressedId === "starred" || pressedId === "not-starred") {
      try {
        await toggleStarred(card);
      } catch (error) {
        console.error("Error toggling star:", error);
      }
    } else if (pressedId === "flag") {
      setModalContent("Report Card:")
    }
  }, [card, toggleStarred])

  // Memoize flag handler
  const handleFlag = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const daReason = event.currentTarget.id
    try {
      await makeReport({ reason: daReason, cardId: card })
    } catch (error) {
      console.error("Error reporting card:", error);
    }
  }, [card, makeReport])

  // Memoize closing the modal
  const closeModal = useCallback(() => setModalContent(null), [])

  return (
    <>
      <Modal selector={card} show={modalContent !== null}>
        <span className="top-0 p-4 pb-16 left-0 flex flex-col gap-2 justify-center items-end absolute size-full z-50">
          <div className="w-full flex justify-center items-center flex-col gap-2 text-tappen-blue-50">
            <span className="bg-tappen-purple-400 text-center p-2 rounded">{modalContent}</span>
            {modalContent === "Report Card:" && (
              <div className="flex w-full flex-col gap-2 p-2 bg-tappen-blue-500/80 rounded">
                {reasons.map((reason, idx) => (
                  <button
                    disabled={isReporting}
                    type="button"
                    id={reason}
                    onClick={handleFlag}
                    className="p-2 rounded bg-tappen-purple-400 font-sans text-sm disabled:opacity-50 transition-opacity duration-300"
                    key={idx}
                  >
                    {reason}
                  </button>
                ))}
                <button
                  className="flex justify-center items-center w-full text-center p-2"
                  type="button"
                  onClick={closeModal}
                >
                  <XMarkIcon className="size-8" />
                </button>
              </div>
            )}
          </div>
        </span>
      </Modal>
      <CardFooterFrame
        label={authorTag ? <p className={cardFooterLabelClass}>@{authorTag}</p> : null}
        actions={icons.map((icon, idx) =>
          icon.display && (
            <button
              disabled={isReporting || isLiking}
              id={`${icon.name}`}
              type="button"
              onClick={handleButtonClicked}
              key={idx}
              className="p-1 min-w-[2rem] flex justify-center items-center disabled:opacity-10"
            >
              <icon.svg className="size-6 text-tappen-blue-500" />
            </button>
          )
        )}
      />
    </>
  )
})

// Main TappenCard component - memoized
const TappenCard = memo(function TappenCard(props: TappenCardProps) {
  const { card = "default", skin = "default", children } = props

  const { data: fetchedCard } = api.card.getByPublicId.useQuery(card, {
    enabled: card !== "default",
    // Add staleTime to reduce refetching
    staleTime: 60000, // 1 minute
  })

  const cardData: CardData = fetchedCard ?? defaultCardData

  return (
    <div className="w-full cursor-pointer max-w-xs aspect-[5/6.9]">
      <CardSkin {...(typeof skin === 'string' ? { skinId: skin } : { skinObject: skin })}>
        {!children && cardData && (
          <CardFace
            id={props.card}
            content={cardData.content}
            footer={
              <CardFooter
                nsfw={cardData.nsfw}
                authorTag={cardData.author}
                liked={cardData.isLiked}
                card={props.card ?? ""}
              />
            }
          />
        )}
        {children}
      </CardSkin>
    </div>
  )
})

export default TappenCard
