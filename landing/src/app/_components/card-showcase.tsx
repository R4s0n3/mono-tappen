
import TappenCard from "./tappen-card/tappen-card"




type GridLayoutProps = {
    items: string[]; // Array of items to be displayed in the grid
    rowConfig: number[]; // Array defining the number of columns per row
  };

export function CardShowcase(props: GridLayoutProps){
    let itemIndex = 0;

    const {items, rowConfig} = props
    return ( <div className={"w-full h-full top-0 absolute overflow-hidden"}   >
        <div className="w-full flex flex-col justify-center items-center gap-32 -mt-16 lg:-mt-[16rem]">
        {rowConfig.map((columns, rowIndex) => {
            const rowItems = items.slice(itemIndex, itemIndex + columns);
            itemIndex += columns;
            
            return <GridRow key={rowIndex} items={rowItems} columns={columns} />;
        })}
        </div>
    </div>)
}



type GridRowProps = {
    items: string[]; // Array of items to display in this row
    columns: number; // Number of columns in the row
  };
  
  const GridRow: React.FC<GridRowProps> = ({ items, columns }) => {
    // Check if items length is less than columns
    const blankCardsNeeded = columns - items.length;
    const updatedItems = [
      ...items,
      ...Array.from({ length: Math.max(0, blankCardsNeeded) }, (_, index) => (`blank-${index}`)) // Create blank items
    ];

   


    function createUpdatedItems(item:string, index:number){

      const randomNumber = Math.floor(Math.random() * 4)
      let randomRotation = "rotate-0"
      switch (randomNumber) {
          case 0:
            randomRotation = "rotate-6"
            break;
          case 1:
            randomRotation = "rotate-3 "
            break;
          case 2:
            randomRotation = "-rotate-3"
            break;
          case 3:
            randomRotation = "-rotate-2"
            break;
          case 4:
            randomRotation = "rotate-2"
            break;
          default:
            randomRotation = "-rotate-2"
            break;
        }

      return <div key={item || index} className={`transition duration-500 ${randomRotation} ${index === 1 && items.length > 2 && "opacity-0"}`}>
          <TappenCard card={item} />
        </div>
        
    }
    return (
      <div className={`flex gap-28`}>
        {updatedItems.map(createUpdatedItems)}
      </div>
    );
  };
