import "@/styles/globals.css";

import { TRPCReactProvider } from "@/trpc/react";
import { Playfair_Display, Titillium_Web, Lilita_One } from "next/font/google";
import type { Metadata } from "next";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-serif",
  style: ["normal", "italic"], // Add italic variant
});

const titilium = Titillium_Web({
  subsets: ["latin"],
  weight: ["200", "300", "400", "600", "700", "900"],
  variable: "--font-sans",
  style: ["normal"],
});

const lilitaOne = Lilita_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-lilita-one",
});

export const metadata: Metadata = {
  title: "Tappen App",
  description:
    "Tappen is a conversation party game. A game, not therapy. Preorder Tappen Home, the printed English set of 100 cards.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`
      ${playfair.variable} 
      ${titilium.variable} 
      ${lilitaOne.variable}
    `}
    >
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
