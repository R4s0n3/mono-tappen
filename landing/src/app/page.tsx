import { env } from "@/env";
import { api } from "@/trpc/server";

import { About } from "./_components/_sections/about";
import { CallToAction } from "./_components/_sections/cta";
import { Header } from "./_components/_sections/header";
import { HomeEdition } from "./_components/_sections/home-edition";
import { Info } from "./_components/_sections/info";
import { AnnouncementBar } from "./_components/announcement-bar";
import { CardShowcase } from "./_components/card-showcase";
import Footer from "./_components/footer";
import { JoinRoom } from "./_components/join-room";
import Navigation from "./_components/navigation";
import { StarterCard } from "./_components/starter-card";

export default async function Home() {
  const cards = await loadPreviewCardIds();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-between overflow-x-clip bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 text-center text-tappen-blue-100">
      <div className="fixed inset-x-0 top-0 z-50">
        <AnnouncementBar />
        <Navigation embedded />
      </div>
      <section className="relative w-full">
        {cards.length > 0 ? (
          <CardShowcase items={cards} rowConfig={[2, 3, 2]} />
        ) : null}
        <div className="relative z-10 mx-auto flex w-full max-w-screen-xl flex-col gap-5 px-4 pb-6 pt-28 sm:px-6 lg:gap-6 lg:px-8 lg:pb-10 lg:pt-28">
          <Header />
          <HomeEdition
            deCents={env.HOME_SHIPPING_DE_CENTS}
            euCents={env.HOME_SHIPPING_EU_CENTS}
          />
        </div>
      </section>
      <section className="flex w-full flex-col items-center gap-8 px-4 py-16">
        <StarterCard />
        <JoinRoom />
      </section>
      <Info />
      <About />
      <CallToAction />
      <Footer />
    </main>
  );
}

async function loadPreviewCardIds(): Promise<string[]> {
  try {
    const cardData = await api.card.getPreview();
    return cardData?.map((card) => card.cardId) ?? [];
  } catch (error) {
    // Next throws this to mark the route dynamic. It has to propagate.
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      error.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }
    console.error("Could not load homepage card preview", error);
    return [];
  }
}
