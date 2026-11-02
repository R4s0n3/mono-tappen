import { DashNavigation } from "@/app/_components/dash-navigation";
import { api } from "@/trpc/server";
import { ArchiveBoxXMarkIcon } from "@heroicons/react/24/solid";
import PaymentHistoryList from "./_components/payment-history-list";


export default async function History() {
    const paymentHistory = await api.payment.getHistory()

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-tappen-blue-50">
      <DashNavigation page={"profile"} session={true} />
      <div className="size-full min-h-screen flex justify-center items-center">
        {paymentHistory.length > 0 ? <PaymentHistoryList history={paymentHistory.map(item => ({id: item.id, type:item.type ?? "" , shopId: item.shopId ?? "", status: item.status as string, purchasedAt: item.purchasedAt, receiptUrl: ""}))} /> : <div className="w-full flex flex-col justify-center items-center">
<h2 className="w-full max-w-sm border-2 text-center border-tappen-blue-400 p-4 flex gap-4 justify-center items-center">
    <ArchiveBoxXMarkIcon className="size-8" />
    NO PAYMENTS YET.
    </h2>
            </div>}
      </div>
    </main>
  );
}
