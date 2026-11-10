import { memo, type ReactNode } from "react"
import WaterMark from "./watermark"

/** Same type scale as solo play. Length cutoff is part of the card's look. */
export function cardContentSize(content: string) {
  return content.length > 42
    ? "text-3xl md:text-sm lg:text-xl xl:text-3xl"
    : "text-4xl md:text-base lg:text-2xl xl:text-4xl"
}

export const cardFooterLabelClass = "first-letter:uppercase font-bold select-none"

export const CardContent = memo(function CardContent({ content }: { content: string }) {
  const contentSize = cardContentSize(content)

  return (
    <p className={`${contentSize} pointer-events-none select-none overflow-hidden py-1.5`}>
      {content}
    </p>
  )
})

/** Footer row. Hosted mode fills `label` with the turn and leaves the icon slot empty. */
export function CardFooterFrame({
  label,
  actions,
}: {
  label: ReactNode
  actions?: ReactNode
}) {
  return (
    <footer className="w-full flex justify-between items-center mt-auto">
      <div className="font-sans font-normal select-none">
        {label}
      </div>
      <div>
        <div className="flex gap-2 min-w-[max-content]">
          {actions}
        </div>
      </div>
    </footer>
  )
}

/** Watermark, question, and footer. Solo play and hosted rooms both render this. */
export const CardFace = memo(function CardFace({
  id,
  content,
  footer,
  className = "",
}: {
  id?: string
  content: string
  footer: ReactNode
  className?: string
}) {
  return (
    <div id={id} className={`p-4 h-full flex flex-col justify-between text-left ${className}`}>
      <WaterMark />
      <CardContent content={content} />
      {footer}
    </div>
  )
})
