import { SkinBuilder } from "@/app/_components/skin-builder/skin-builder";

import { useAccount } from "../account-session";

export function SkinScreen() {
  const account = useAccount();
  return <SkinBuilder signedIn={account.signedIn} />;
}
