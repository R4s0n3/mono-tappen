import { DashNavigation } from "@/app/_components/dash-navigation";
import PaymentSuccess from "@/app/_components/payment-success";

export default function SuccessPage({ searchParams }: { searchParams: { session_id:string } }) {
  const { session_id } = searchParams
  return (
    <main className="relative flex min-h-screen w-full flex-col bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-800 text-tappen-blue-50">
      <DashNavigation page={"profile"} session={true} />
      <div className="size-full min-h-screen flex justify-center items-center">
      <PaymentSuccess shopId={session_id}  />
      </div>
    </main>
  );
}

