import { getServerAuthSession } from "@/server/auth";

import { DashNavigation } from "../_components/dash-navigation";
import { SkinBuilder } from "./_components/skin-builder";

export default async function SkinsPage() {
  const session = await getServerAuthSession();

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-tappen-blue-50">
      <DashNavigation page="profile" session={session !== null} />
      <SkinBuilder signedIn={session !== null} />
    </main>
  );
}
