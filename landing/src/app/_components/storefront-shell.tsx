import type { ReactNode } from "react";

import Footer from "@/app/_components/footer";
import Navigation from "@/app/_components/navigation";

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 text-tappen-blue-100">
      <Navigation />
      {children}
      <Footer />
    </main>
  );
}
