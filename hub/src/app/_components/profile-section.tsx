import { api } from "@/trpc/server";
import UpdateMail from "./update-mail";
import UpdateName from "./update-name";
import Link from "next/link";
import DeleteAccount from "./delete-account";

export async function ProfileSection() {
  const userData = await api.user.getData();

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
          <h5 className="text-2xl font-bold">Subscription:</h5>
          <span
            className={`w-full text-center ${userData?.subscription ? "text-tappen-green-400" : "text-tappen-blue-400"}`}
          >
            {userData?.subscription ? "**SUBSCRIBED**" : "**NOT SUBSCRIBED**"}
          </span>
          {!userData?.subscription ? (
            <Link target="_blank" href={`/shop/subscribe`}>
              manage subscription
            </Link>
          ) : (
            <i></i>
          )}
        </div>
      </div>
    </section>
  );
}
