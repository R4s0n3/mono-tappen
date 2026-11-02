import { DashNavigation } from "@/app/_components/dash-navigation";
import PaymentCancelled from "./payment-cancelled";

export default function CancelPage({
  searchParams,
}: {
  searchParams: { payment_id?: string };
}) {
  return (
    <main className="relative flex min-h-screen w-full flex-col bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-tappen-blue-50">
      <DashNavigation page={"profile"} session={true} />
      <PaymentCancelled paymentId={searchParams.payment_id} />
    </main>
  );
}
