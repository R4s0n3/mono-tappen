import type { Metadata } from "next";
import Link from "next/link";

import { StorefrontShell } from "@/app/_components/storefront-shell";
import { HOME_SHIP_BY_LABEL } from "@/lib/home/product";

export const metadata: Metadata = {
  title: "Withdrawal notice — Tappen",
  description:
    "Right of withdrawal for the Tappen Home printed card set, sold to customers in Germany and the European Union.",
};

export default function WithdrawalPage() {
  return (
    <StorefrontShell>
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-24 pt-32 text-left text-lg leading-relaxed">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-tappen-sunset-300">
          Physical goods
        </p>
        <h1 className="font-bang text-5xl uppercase sm:text-6xl">
          Withdrawal notice
        </h1>
        <p className="text-tappen-blue-200">
          Widerrufsbelehrung for the Tappen Home preorder. This notice is in
          English. The seller’s name and postal address are on the{" "}
          <Link className="underline underline-offset-4" href="/legal#imprint">
            imprint
          </Link>
          . Email for a withdrawal:{" "}
          <a
            className="underline underline-offset-4"
            href="mailto:info@tappen.app"
          >
            info@tappen.app
          </a>
          .
        </p>

        <section className="flex flex-col gap-3 rounded-3xl bg-tappen-blue-900/70 p-6">
          <h2 className="text-2xl font-bold">In short</h2>
          <p>
            Tappen Home is a preorder of a physical box. We expect to ship by{" "}
            {HOME_SHIP_BY_LABEL}. You can change your mind within 14 days after
            the box arrives, without giving a reason. If you tell us before we
            ship, we refund the payment and do not send the box.
          </p>
          <p>
            You can use the model form below or write your own message. Send it
            by email or by post to the seller address on the imprint.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Right of withdrawal</h2>
          <p>
            You have the right to withdraw from this contract within 14 days
            without giving any reason.
          </p>
          <p>
            The withdrawal period will expire after 14 days from the day on
            which you acquire, or a third party other than the carrier and
            indicated by you acquires, physical possession of the goods.
          </p>
          <p>
            To exercise the right of withdrawal, you must inform us — [Legal
            name of the seller], [Street and house number], [Postal code and
            city], Germany, email info@tappen.app — of your decision to withdraw
            from this contract by an unequivocal statement (for example a letter
            sent by post or email). You may use the model withdrawal form below,
            but it is not obligatory.
          </p>
          <p>
            To meet the withdrawal deadline, it is sufficient for you to send
            your communication concerning your exercise of the right of
            withdrawal before the withdrawal period has expired.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Effects of withdrawal</h2>
          <p>
            If you withdraw from this contract, we shall reimburse to you all
            payments received from you, including the costs of delivery (with
            the exception of the supplementary costs resulting from your choice
            of a type of delivery other than the least expensive type of
            standard delivery offered by us), without undue delay and in any
            event not later than 14 days from the day on which we are informed
            about your decision to withdraw from this contract. We will carry
            out such reimbursement using the same means of payment as you used
            for the initial transaction, unless you have expressly agreed
            otherwise; in any event, you will not incur any fees as a result of
            such reimbursement.
          </p>
          <p>
            We may withhold reimbursement until we have received the goods back
            or you have supplied evidence of having sent back the goods,
            whichever is the earliest.
          </p>
          <p>
            You shall send back the goods or hand them over to us without undue
            delay and in any event not later than 14 days from the day on which
            you communicate your withdrawal from this contract to us. The
            deadline is met if you send back the goods before the period of 14
            days has expired. Send them to [Legal name of the seller], [Street
            and house number], [Postal code and city], Germany.
          </p>
          <p>You will have to bear the direct cost of returning the goods.</p>
          <p>
            You are only liable for any diminished value of the goods resulting
            from the handling other than what is necessary to establish the
            nature, characteristics and functioning of the goods.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold">Model withdrawal form</h2>
          <p>
            Complete and return this form only if you wish to withdraw from the
            contract.
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-3xl bg-tappen-blue-900 p-6 font-sans text-base leading-relaxed text-tappen-blue-100">
            {`To [Legal name of the seller], [Street and house number], [Postal code and city], Germany, info@tappen.app:

I/We hereby give notice that I/We withdraw from my/our contract of sale of the following goods:

Tappen Home (printed card set)

Ordered on:
Received on:
Name of consumer(s):
Address of consumer(s):
Signature of consumer(s) (only if this form is notified on paper):
Date:`}
          </pre>
        </section>

        <p>
          <Link
            className="font-bold underline underline-offset-4"
            href="/home-edition"
          >
            Back to Tappen Home
          </Link>
        </p>
      </article>
    </StorefrontShell>
  );
}
