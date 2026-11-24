import { getServerAuthSession } from "@/server/auth";

import { SkinBuilder } from "../_components/skin-builder/skin-builder";

export default async function SkinsPage() {
  const session = await getServerAuthSession();
  return <SkinBuilder signedIn={Boolean(session?.user)} />;
}
