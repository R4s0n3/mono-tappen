import { entitlementCopy } from "@/server/home/entitlement";
import { api } from "@/trpc/server";
import UpdateMail from "./update-mail";
import UpdateName from "./update-name";
import Link from "next/link";
import DeleteAccount from "./delete-account";

export async function ProfileSection() {
  const userData = await api.user.getData();
  const entitlement = await api.user.entitlement();

  return (
    <section className="flex w-full flex-col items-center justify-center gap-6">
      <div className="mt-48 flex w-full max-w-2xl flex-col flex-wrap justify-center gap-5  px-4 lg:flex-row lg:px-0">
        <div className="flex w-full flex-1 flex-col justify-start gap-4 rounded bg-tappen-blue-900/20 p-4">
          <UpdateName currentName={userData?.name} />
          <UpdateMail
            currentMail={userData?.email}
            isVerified={userData?.emailVerified !== null}
          />
          <DeleteAccount
            user={{
              id: userData?.id ?? "",
              name: userData?.name ?? "anonymous",
            }}
          />
        </div>
        <div className="flex aspect-video size-full flex-1 flex-col justify-between gap-4 rounded bg-tappen-blue-900/20 p-4">
          <h5 className="text-2xl font-bold">Tappen Premium</h5>
          <div className="flex flex-col gap-2 text-center">
            <span className={entitlement.premium ? "text-tappen-green-400" : "text-tappen-blue-400"}>
              {entitlement.premium ? entitlementCopy.premiumOn : entitlementCopy.premiumOff}
            </span>
            <span>
              {entitlement.ownsPremiumSkin ? entitlementCopy.skinOn : entitlementCopy.skinOff}{" "}
              {entitlement.ownsPremiumSkin ? entitlementCopy.equip : ""}
            </span>
          </div>
          {!entitlement.premium ? (
            <Link href="/shop/subscribe">
              Get Premium
            </Link>
          ) : (
            <i></i>
          )}
        </div>
      </div>
    </section>
  );
}
