import Link from "next/link";
import { getServerAuthSession } from "@/server/auth";

import { DashNavigation } from "@/app/_components/dash-navigation";
import SkinProduct from "../_components/skin-product";


export default async function SkinPage({ params }: { params: { skinId: string } }) {
  const {skinId} = params
  const session = await getServerAuthSession();

  const userId = session?.user.id ?? ""
  

  if(!session) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-[5rem]">
          Tappen Hub
        </h1>
  <div className="flex flex-col items-center justify-center gap-4">
  <Link
    
    href={session ? "/api/auth/signout" : "/api/auth/signin"}
    className="rounded-full bg-pirrot-blue-50/10 px-10 py-3 font-semibold no-underline transition hover:bg-pirrot-blue-50/20"
  >
    {session ? "Sign out" : "Sign in"}
  </Link>
</div> 
</div>
</main>
)

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-tappen-blue-50">
      <DashNavigation page="cards" session={session !== null} />
      <div className="w-full h-full text-tappen-blue-100 min-h-screen flex items-center flex-col pt-48 pb-20 lg:pt-48 gap-8">
      <h2 className="text-6xl font-bang font-bold">PAYMENT</h2>
      <SkinProduct skin={skinId} user={userId} />
      </div>
    </main>
  );
}

