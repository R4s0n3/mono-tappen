import { getServerAuthSession } from "@/server/auth";

import { DashNavigation } from "../_components/dash-navigation";

import FeaturedProducts from "./_components/featured-products";
import ProductsGrid from "./_components/products-grid";
import { api } from "@/trpc/server";


export default async function Shop() {

  const session = await getServerAuthSession()
  const products = await api.product.getAll()
  const skins = await api.skin.getAll()

  const productItems = products?.map(item => ({
    id:item.id,
    type:item.type,
    name: item.name,
    desc:item.description,
    price:item.price,
    skins: item.skins.map(skin => ({ id:skin.id, name:skin.name }))
  }))

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-tappen-blue-50">
      <DashNavigation page={"cards"} session={session !== null} />
    <div className="w-full pt-48  p-4 flex flex-col gap-8 justify-center">
    <div className="w-full flex justify-center items-center">
    <div className="w-full max-w-screen-xl">
        <h2 className="text-7xl font-bang">SHOP</h2>
    </div>
    </div>
      <FeaturedProducts products={productItems.filter(p => p.type !== "SKIN")} />
      <ProductsGrid skins={skins?.filter(skin => skin.name !== "default").map(s => ({id: s.id, name: s.name, price: s.price}))}/>
    </div>
    </main>
  );
}

