import Link from "next/link";
import { getServerAuthSession } from "@/server/auth";
import { DeckSection } from "./_components/deck-section";
import { CardSection } from "./_components/card-section";
import { ProfileSection } from "./_components/profile-section";
import { DashNavigation } from "./_components/dash-navigation";

export default async function Home({ searchParams }: { searchParams: { page: string } }) {

  const session = await getServerAuthSession();
  const currentPage = searchParams.page
  
  function renderContent () {
    switch(currentPage){
      case "cards":
        return  <CardSection />
      case "decks":
        return  <DeckSection />
      case "profile":
        return  <ProfileSection />
      default:
        return <CardSection />

    }
  }

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
      <DashNavigation page={searchParams.page} session={session !== null} />
      {renderContent()}
    </main>
  );
}

