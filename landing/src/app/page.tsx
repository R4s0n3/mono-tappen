import { api } from "@/trpc/server";
import { About } from "./_components/_sections/about";
import { CallToAction } from "./_components/_sections/cta";
import Footer from "./_components/footer";
import { Info } from "./_components/_sections/info";
import { Header } from "./_components/_sections/header";
import { HomeEdition } from "./_components/_sections/home-edition";
import Navigation from "./_components/navigation";

export default async function Home() {
  const cardData = await api.card.getPreview();
  const daCards = cardData?.map((c) => c.cardId);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-between bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 text-center text-tappen-blue-100">
      <Navigation />
      <Header cards={daCards} />
      <HomeEdition />
      <Info />
      <About />
      <CallToAction />
      {/* <Merch /> */}
      <Footer />
    </main>
  );
}
