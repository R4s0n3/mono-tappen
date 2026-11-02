import { Nunito, Playfair_Display } from "next/font/google";
import Image from "next/image";

import type { SamplePrompt } from "@/lib/home/samples";

import styles from "./original-card.module.css";

const playfair = Playfair_Display({
  weight: "800",
  subsets: ["latin"],
  variable: "--font-original-playfair",
});

const nunito = Nunito({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-original-nunito",
});

export function SampleCard({ card }: { card: SamplePrompt }) {
  return (
    <div className={`${styles.card} ${playfair.variable} ${nunito.variable}`}>
      <div className={styles.cardInner}>
        <div className={styles.content}>
          <p>{card.text}</p>
        </div>
        <div className={styles.footer}>
          <div className={styles.footerLeft}>@{card.author}</div>
          <div className={styles.footerRight}>
            <Image src="/flag.svg" alt="" width={15} height={15} />
          </div>
        </div>
      </div>
    </div>
  );
}
