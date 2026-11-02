import { ChevronLeftIcon, HomeIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

const LAST_UPDATED = new Date("9.12.2024").toLocaleDateString()
const EFFECTIVE_DATE = new Date("9.12.2024").toLocaleDateString()

const Headline = ({ level, children }: { level: number; children: React.ReactNode }) => {
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    let fontStyle = "text-4xl font-bold "
    switch(level){
        case 1:
            fontStyle="text-5xl font-semibold font-bang"
        break;
        case 2:
            fontStyle="text-3xl font-bold"
        break;
        case 5:
            fontStyle="text-xl font-light uppercase"
        break;
        default:
            fontStyle ="text-3xl font-bol"
        break;
    }
    return <Tag className={`${fontStyle} mt-6 mb-4`}>{children}</Tag>;
};

const Paragraph = ({ children }: { children: React.ReactNode }) => {
    return <p className="text-tappen-blue-200 mb-4 text-xl">{children}</p>;
};

const Navigation = () => {
    return (
        <nav className="mb-6">
            <h2 className="text-2xl font-semibold">Table of Contents</h2>
            <ul className="list-disc ml-6 text-xl">
                <li><a href="#terms-of-service" className="text-tappen-blue-400 hover:underline">Terms of Service</a></li>
                <li><a href="#privacy-policy" className="text-tappen-blue-400 hover:underline">Privacy Policy</a></li>
                <li><a href="#contact" className="text-tappen-blue-400 hover:underline">Contact</a></li>
            </ul>
        </nav>
    );
};

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => {
    return (
        <section id={id} className="mb-16">
            <h2 className="text-6xl font-semibold  font-bang text-center mt-6 mb-4">{title}</h2>
            {children}
        </section>
    );
};

export default async function Legal() {
    return <main className="flex min-h-dvh flex-col items-center justify-between bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 text-tappen-blue-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
            <header className="mb-8 w-full text-center">
                <Link className="w-full flex justify-center items-center" href={"/"}>
                    <ChevronLeftIcon className="size-8" /><HomeIcon className="size-8" />
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
                        By accessing or using the Platform, you agree to be bound by these Terms of
                        Service and any additional terms we provide.
                    </Paragraph>

                    <Headline level={2}>2. Use of the Platform</Headline>
                    <Paragraph>
                        You must be at least 18 years old or have parental consent to use the
                        Platform. Prohibited activities include unauthorized access and malicious
                        activity.
                    </Paragraph>
                </Section>

                <Section id="privacy-policy" title="Privacy Policy">
                    <Headline level={2}>1. Information We Collect</Headline>
                    <Paragraph>
                        We collect personal information such as your name, email address, and usage
                        data to improve our service.
                    </Paragraph>

                    <Headline level={2}>2. How We Use Your Information</Headline>
                    <Paragraph>
                        Your information helps us enhance the platform, send updates, and improve
                        security.
                    </Paragraph>
                </Section>
                <Section id="submission-terms" title="Submission Terms">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
<div>
<Headline level={3}>1. What Makes a Great Card?</Headline>
<Headline level={5}>We encourage you to unleash your creativity while following these principles:</Headline>

<Paragraph><b> Thought-Provoking and Fun: </b><br /> Submit questions or prompts that inspire conversation, laughter, or friendly debate. 
<br />
<b>For example: </b><br />
{`- "What's the strangest thing you've ever eaten?"`}<br />
{`- "If you were a superhero, what would your power be?"`} <br />
<b>Inclusive and Friendly:</b><br/> Avoid topics that might alienate or offend. Keep your cards welcoming for diverse groups. <br/>
<b>Appropriate for the Setting:</b><br /> While the game may include drinking, ensure prompts remain playful and steer clear of harmful or overly explicit themes.</Paragraph>
</div>
<div>
<Headline level={3}>2. Content to Avoid</Headline>
<Headline level={5}>To keep Tappen App enjoyable for everyone, avoid submitting the following:</Headline>

<Paragraph><b>Harmful or Offensive Topics:</b> This includes prompts that promote hate, discrimination, or inflammatory remarks based on race, religion, gender, or identity.
<br />
<b> Excessively Personal or Embarrassing Questions:</b> While it’s fun to get real, don’t submit questions designed to humiliate or invade privacy.
<br />
<b> Explicit or Inappropriate Content: </b> Avoid overtly sexual, graphic, or violent prompts that could make players uncomfortable.
<br />
<b> Promotional or Spammy Content: </b> Cards should not be used for advertising or self-promotion.</Paragraph>
</div>
<div>
<Headline level={3}>3. Submission Guidelines</Headline>
<Headline level={5} >Original Ideas Only:</Headline>
<Paragraph>
Submit questions or prompts you’ve created yourself. Avoid plagiarizing content from other games or sources.<br/>
<b>Community Spirit:</b> Contribute cards that match the lively and inclusive vibe of Tappen App, creating moments of joy and connection.<br/>
<b>Language and Tone:</b> Keep language casual and fun, but avoid profanity unless it’s contextually appropriate and not offensive.
</Paragraph>
</div>
<div>
<Headline level={3}>4. Moderation and Enforcement</Headline>
<Headline level={5} >Content Review:</Headline> 
<Paragraph>Every card submission will be reviewed to ensure it aligns with these Submission Terms.<br />
<b>Removal of Violating Content:</b> Any card deemed inappropriate or violating these terms may be removed at our discretion.<br />
<b>User Accountability:</b> Repeated violations may lead to restrictions on your account or removal from the platform.</Paragraph>
</div>
                </div>
                <div className="py-16">
                <Headline level={3}> 5. Keep It Playful, Keep It Respectful</Headline>
                <Paragraph>
Tappen App is about breaking the ice, not breaking the vibe! Your submissions should contribute to fun and lively interactions that bring people together.
By submitting content, you agree to abide by these Submission Terms and join us in making Tappen App the go-to party game for icebreaking moments.
                </Paragraph>

                </div>
                </Section>

                <Section id="contact" title="Contact">
                    <Paragraph>
                        For any questions, contact us at <Link href="mailto:info@tappen.app" className="text-tappen-blue-400 hover:underline">info@tappen.app</Link>.
                    </Paragraph>
                </Section>
            </main>

            <footer className="text-center mt-8">
                <Paragraph>&copy; {year} Mio Mideal. All rights reserved.</Paragraph>
            </footer>
        </div>
    </main>
}

const year = new Date().getFullYear()