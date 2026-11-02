import Link from "next/link"

type DeckGridItemType = {
    id: string | number,
    name: string
}

type DeckGridProps = {
    decks: DeckGridItemType[]
}

export function DeckGrid(props: DeckGridProps){
    
    const defaultDeckCard = {
        name: "+",
        id: "create-deck"
    }

    const favsDeckCard = {
        name: "★",
        id: "favs"
    }


    function createDeckGridItems(item: DeckGridItemType){
        return <DeckGridItem 
            key={item.id}
            {...item}
        />
    }
 
    return <div className="w-full max-w-screen-lg mt-48 grid grid-cols-3 md:grid-cols-4 gap-4 p-4">
    <DeckGridItem {...defaultDeckCard} />
    <DeckGridItem {...favsDeckCard} />
    {props.decks.map(createDeckGridItems)}
    </div>
    
}

function DeckGridItem(item: DeckGridItemType){

    const {id, name} = item

        let itemLink = `/deck/${id}`

        switch (id) {
            case "favs":
                itemLink = "/deck/favs"
                break;
            case "create-deck":
                itemLink = "/deck/create"
                break;
            default:
                itemLink = `/deck/${id}`
                break;
        }

    return <Link
    prefetch
    
    href={itemLink}
    className={`
    aspect-[5/7]
    rounded 
    bg-gradient-to-br
    drop-shadow-md
     shadow-tappen-blue-900
    from-tappen-blue-700 
    border-tappen-blue-600
    text-tappen-blue-100
    border-2 p-4
    lg:pt-8
    hover:cursor-pointer
    hover:to-tappen-blue-500/20
    to-tappen-blue-900
    flex
    ${name === "+" && "items-center justify-center"}
    ${name === "★" && "text-tappen-orange-300 text-5xl items-center border-tappen-orange-300/20 justify-center"}
    font-serif
    text-start
    text-lg
    lg:text-4xl
    uppercase
    `}>
  {name}
  </Link>
}