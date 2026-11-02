import Link from "next/link";
import { notFound } from "next/navigation";

import { DashNavigation } from "@/app/_components/dash-navigation";
import { getServerAuthSession } from "@/server/auth";
import { api } from "@/trpc/server";
import BundleCheckout from "../_components/bundle-checkout";

export default async function BundlePage({ params }: { params: { bundleId: string } }) {
  const session = await getServerAuthSession();
  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-[5rem]">Tappen Hub</h1>
          <Link
            href="/api/auth/signin"
            className="rounded-full bg-pirrot-blue-50/10 px-10 py-3 font-semibold no-underline transition hover:bg-pirrot-blue-50/20"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const products = await api.product.getAll();
  const bundle = products.find((product) => product.id === params.bundleId && product.type === "BUNDLE");
  if (!bundle) notFound();

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-tappen-blue-50">
      <DashNavigation page="cards" session={session !== null} />
      <div className="w-full h-full text-tappen-blue-100 min-h-screen flex items-center flex-col pt-48 pb-20 lg:pt-48 gap-8">
        <h2 className="text-6xl font-bang font-bold">PAYMENT</h2>
        <p className="text-2xl uppercase">{bundle.name}</p>
        <p>{(bundle.price / 100).toFixed(2)}€</p>
        <BundleCheckout productId={bundle.id} />
      </div>
    </main>
  );
}
