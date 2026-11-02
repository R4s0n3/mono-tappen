import "@/styles/globals.css";

import { TRPCReactProvider } from "@/trpc/react";
import { Playfair_Display, Titillium_Web, Lilita_One } from "next/font/google";

import type { Metadata } from "next";


const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-serif",
  style: ['normal', 'italic'], // Add italic variant
});

const titilium = Titillium_Web({
  subsets: ['latin'],
  weight: ["200", "300", "400", "600", "700", "900"],
  variable: "--font-sans",
});

const lilitaOne = Lilita_One({
  subsets: ['latin'],
  weight: ["400"],
  variable: "--font-lilita-one",
});



export const metadata: Metadata = {
  title: "Tappen Admin HUB",
  description: "getting pumped here.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`
      ${playfair.variable} 
      ${titilium.variable} 
      ${lilitaOne.variable}
    `}>
        <head>
      <link
  rel="stylesheet"
  type="text/css"
  charSet="UTF-8"
  href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick.min.css"
/>
<link
  rel="stylesheet"
  type="text/css"
  href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick-theme.min.css"
/>
      </head>
      <body>
        <TRPCReactProvider>
          <div id="modal-hook"></div>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}
