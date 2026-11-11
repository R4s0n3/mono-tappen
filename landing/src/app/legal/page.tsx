import { ChevronLeftIcon, HomeIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

const LAST_UPDATED = new Date("9.12.2024").toLocaleDateString();
const EFFECTIVE_DATE = new Date("9.12.2024").toLocaleDateString();

const Headline = ({
  level,
  children,
}: {
  level: number;
  children: React.ReactNode;
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  let fontStyle = "text-4xl font-bold ";
  switch (level) {
    case 1:
      fontStyle = "text-5xl font-semibold font-bang";
      break;
    case 2:
      fontStyle = "text-3xl font-bold";
      break;
    case 5:
      fontStyle = "text-xl font-light uppercase";
      break;
    default:
      fontStyle = "text-3xl font-bol";
      break;
  }
  return <Tag className={`${fontStyle} mb-4 mt-6`}>{children}</Tag>;
};

const Paragraph = ({ children }: { children: React.ReactNode }) => {
  return <p className="mb-4 text-xl text-tappen-blue-200">{children}</p>;
};

const Navigation = () => {
  return (
    <nav className="mb-6">
      <h2 className="text-2xl font-semibold">Table of Contents</h2>
      <ul className="ml-6 list-disc text-xl">
        <li>
          <a
            href="#terms-of-service"
            className="text-tappen-blue-400 hover:underline"
          >
            Terms of Service
          </a>
        </li>
        <li>
          <a
            href="#privacy-policy"
            className="text-tappen-blue-400 hover:underline"
          >
            Privacy Policy
          </a>
        </li>
        <li>
          <a href="#imprint" className="text-tappen-blue-400 hover:underline">
            Imprint
          </a>
        </li>
        <li>
          <Link
            href="/legal/withdrawal"
            className="text-tappen-blue-400 hover:underline"
          >
            Withdrawal notice
          </Link>
        </li>
        <li>
          <a href="#contact" className="text-tappen-blue-400 hover:underline">
            Contact
          </a>
        </li>
      </ul>
    </nav>
  );
};

const Section = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <section id={id} className="mb-16">
      <h2 className="mb-4 mt-6  text-center font-bang text-6xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
};

export default async function Legal() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-between bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 text-tappen-blue-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 w-full text-center">
          <Link className="flex w-full items-center justify-center" href={"/"}>
            <ChevronLeftIcon className="size-8" />
            <HomeIcon className="size-8" />
          </Link>
          <Headline level={1}>Legal</Headline>
          <Paragraph>
            <strong>Effective Date:</strong> {EFFECTIVE_DATE} <br />
            <strong>Last Updated:</strong> {LAST_UPDATED}
          </Paragraph>
        </header>

        <Navigation />

        <main>
          <Section id="terms-of-service" title="Terms of Service">
            <Headline level={2}>1. Acceptance of Terms</Headline>
            <Paragraph>
              By accessing or using the Platform, you agree to be bound by these
              Terms of Service and any additional terms we provide.
            </Paragraph>

            <Headline level={2}>2. Use of the Platform</Headline>
            <Paragraph>
              You must be at least 18 years old or have parental consent to use
              the Platform. Prohibited activities include unauthorized access
              and malicious activity.
            </Paragraph>

            <Headline level={2}>3. Physical goods</Headline>
            <Paragraph>
              Tappen Home is a preorder of a boxed, printed card set. The price
              on the product page includes VAT. Shipping to Germany and to other
              EU member states is shown before you pay and is included in the
              total you confirm on Stripe. We expect to ship before Christmas
              2026, by 24 December 2026.
            </Paragraph>
            <Paragraph>
              Each box includes a single-use code that permanently unlocks
              Tappen Premium and the Premium card skin for one account. The code
              is claimed in the app after you sign in and confirm the account.
              Paying for the box does not unlock it by itself, and the code is
              not a room pass.
            </Paragraph>
            <Paragraph>
              You can withdraw from that contract within 14 days of receiving
              the goods. The withdrawal notice and model form are on the{" "}
              <Link
                href="/legal/withdrawal"
                className="text-tappen-blue-400 hover:underline"
              >
                withdrawal page
              </Link>
              .
            </Paragraph>
          </Section>

          <Section id="privacy-policy" title="Privacy Policy">
            <Headline level={2}>1. Information We Collect</Headline>
            <Paragraph>
              We collect personal information such as your name, email address,
              and usage data to improve our service.
            </Paragraph>

            <Headline level={2}>2. How We Use Your Information</Headline>
            <Paragraph>
              Your information helps us enhance the platform, send updates, and
              improve security.
            </Paragraph>
            <Headline level={2}>3. Tappen Home orders</Headline>
            <Paragraph>
              When you preorder Tappen Home we store the email, name, shipping
              address, quantity, amount, and order status needed to take payment
              and ship the box. Stripe processes the card payment. We do not use
              the product page to sign you up for a newsletter. When a code from
              the box is claimed we store a hash of that code and the account
              that claimed it. We do not store the code itself.
            </Paragraph>
          </Section>
          <Section id="submission-terms" title="Submission Terms">
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
              <div>
                <Headline level={3}>1. What Makes a Great Card?</Headline>
                <Headline level={5}>
                  We encourage you to unleash your creativity while following
                  these principles:
                </Headline>

                <Paragraph>
                  <b> Thought-Provoking and Fun: </b>
                  <br /> Submit questions or prompts that inspire conversation,
                  laughter, or friendly debate.
                  <br />
                  <b>For example: </b>
                  <br />
                  {`- "What's the strangest thing you've ever eaten?"`}
                  <br />
                  {`- "If you were a superhero, what would your power be?"`}{" "}
                  <br />
                  <b>Inclusive and Friendly:</b>
                  <br /> Avoid topics that might alienate or offend. Keep your
                  cards welcoming for diverse groups. <br />
                  <b>Appropriate for the Setting:</b>
                  <br /> Keep prompts playful, and steer clear of harmful or
                  overly explicit themes.
                </Paragraph>
              </div>
              <div>
                <Headline level={3}>2. Content to Avoid</Headline>
                <Headline level={5}>
                  To keep Tappen App enjoyable for everyone, avoid submitting
                  the following:
                </Headline>

                <Paragraph>
                  <b>Harmful or Offensive Topics:</b> This includes prompts that
                  promote hate, discrimination, or inflammatory remarks based on
                  race, religion, gender, or identity.
                  <br />
                  <b> Excessively Personal or Embarrassing Questions:</b> While
                  it’s fun to get real, don’t submit questions designed to
                  humiliate or invade privacy.
                  <br />
                  <b> Explicit or Inappropriate Content: </b> Avoid overtly
                  sexual, graphic, or violent prompts that could make players
                  uncomfortable.
                  <br />
                  <b> Promotional or Spammy Content: </b> Cards should not be
                  used for advertising or self-promotion.
                </Paragraph>
              </div>
              <div>
                <Headline level={3}>3. Submission Guidelines</Headline>
                <Headline level={5}>Original Ideas Only:</Headline>
                <Paragraph>
                  Submit questions or prompts you’ve created yourself. Avoid
                  plagiarizing content from other games or sources.
                  <br />
                  <b>Community Spirit:</b> Contribute cards that match the
                  lively and inclusive vibe of Tappen App, creating moments of
                  joy and connection.
                  <br />
                  <b>Language and Tone:</b> Keep language casual and fun, but
                  avoid profanity unless it’s contextually appropriate and not
                  offensive.
                </Paragraph>
              </div>
              <div>
                <Headline level={3}>4. Moderation and Enforcement</Headline>
                <Headline level={5}>Content Review:</Headline>
                <Paragraph>
                  Every card submission will be reviewed to ensure it aligns
                  with these Submission Terms.
                  <br />
                  <b>Removal of Violating Content:</b> Any card deemed
                  inappropriate or violating these terms may be removed at our
                  discretion.
                  <br />
                  <b>User Accountability:</b> Repeated violations may lead to
                  restrictions on your account or removal from the platform.
                </Paragraph>
              </div>
            </div>
            <div className="py-16">
              <Headline level={3}>
                {" "}
                5. Keep It Playful, Keep It Respectful
              </Headline>
              <Paragraph>
                Tappen App is about breaking the ice, not breaking the vibe!
                Your submissions should contribute to fun and lively
                interactions that bring people together. By submitting content,
                you agree to abide by these Submission Terms and join us in
                making Tappen App the go-to party game for icebreaking moments.
              </Paragraph>
            </div>
          </Section>

          <Section id="imprint" title="Imprint">
            <Paragraph>
              Legal notice (Impressum) for Tappen and for sales of physical
              goods to customers in Germany and the European Union.
            </Paragraph>
            <Headline level={2}>Information pursuant to § 5 DDG</Headline>
            <Paragraph>
              Pascal Schoenen, trading as „Mio Mideal“
              <br />
              Kaiser-Friedrich-Ring 17
              <br />
              66740 Saarlouis
              <br />
              Germany
            </Paragraph>
            <Headline level={2}>Contact</Headline>
            <Paragraph>
              Phone: +49 1567 9815927
              <br />
              Email:{" "}
              <Link
                href="mailto:legal@miomideal.com"
                className="text-tappen-blue-400 hover:underline"
              >
                legal@miomideal.com
              </Link>
            </Paragraph>
            <Headline level={2}>Responsible for content</Headline>
            <Paragraph>
              Responsible pursuant to § 18 Abs. 2 MStV: Pascal Schoenen,
              Kaiser-Friedrich-Ring 17, 66740 Saarlouis, Germany.
            </Paragraph>
            <Headline level={2}>Consumer dispute resolution</Headline>
            <Paragraph>
              We are neither willing nor obliged to participate in dispute
              resolution proceedings before a consumer arbitration board.
            </Paragraph>
            <Paragraph>
              Physical goods are sold on the{" "}
              <Link
                href="/home-edition"
                className="text-tappen-blue-400 hover:underline"
              >
                Tappen Home
              </Link>{" "}
              page.
            </Paragraph>
          </Section>

          <Section id="contact" title="Contact">
            <Paragraph>
              For any questions, contact us at{" "}
              <Link
                href="mailto:legal@miomideal.com"
                className="text-tappen-blue-400 hover:underline"
              >
                legal@miomideal.com
              </Link>
              .
            </Paragraph>
          </Section>
        </main>

        <footer className="mt-8 text-center">
          <Paragraph>&copy; {year} Mio Mideal. All rights reserved.</Paragraph>
        </footer>
      </div>
    </main>
  );
}

const year = new Date().getFullYear();
