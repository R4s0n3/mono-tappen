import Image from "next/image";
import Link from "next/link";

const socialLinks: SocialListItem[] = [
  {
    id: "discord",
    link: "https://discord.gg/WnmbAu8jfx",
    icon: "discord",
  },
  {
    id: "instagram",
    link: "https://instagram.com/tappen_app",
    icon: "insta",
  },
  {
    id: "tiktok",
    link: "https://tiktok.com/@tappen_app",
    icon: "tiktok",
  },
  {
    id: "twitter",
    link: "https://x.com/tappen_app",
    icon: "x",
  },
];

export default function Footer() {
  return (
    <footer className="flex w-full items-center  justify-center gap-8 bg-tappen-blue-900 p-8 pt-24 font-sans lg:pb-24">
      <div className="grid w-full max-w-screen-xl grid-cols-2 gap-8 gap-y-16 lg:grid-cols-4">
        <div className="order-3 flex flex-1 flex-col justify-between gap-5 lg:order-1">
          <div className="flex flex-col gap-5">
            <h5 className="text-start font-bold uppercase">
              Come hang with us!
            </h5>
            <div className="flex w-full gap-4">
              {socialLinks.map((link) => (
                <Link key={link.id} href={link.link}>
                  <Image
                    className="size-7"
                    src={`/assets/social-media/${link.icon}.svg`}
                    alt={link.id}
                    width={50}
                    height={50}
                  />
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4">
              <div className="relative size-12">
                <Image fill src="/logo.svg" alt="logo" />
              </div>
              <div className="flex flex-col text-start">
                <span className="text-xs">powered by</span>
                <h3 className="text-sm font-bold">Mio Mideal</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 flex flex-1 flex-col gap-5 uppercase lg:order-2">
          <h5 className="text-start font-bold">Links</h5>
          <div className="flex flex-col gap-4">
            <Link
              className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
              href="/home-edition"
            >
              Home edition
            </Link>
            {["play", "info", "features"].map((link) =>
              link === "play" ? (
                <Link
                  className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
                  key={link}
                  href={`https://play.tappen.app`}
                >
                  {link}
                </Link>
              ) : (
                <Link
                  className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
                  key={link}
                  href={`/#${link}`}
                >
                  {link}
                </Link>
              ),
            )}
          </div>
        </div>
        <div className="order-2 flex flex-1 flex-col gap-5 uppercase lg:order-3">
          <h5 className="text-start font-bold">Tappen Hub</h5>
          <div className="flex flex-col gap-4">
            {["login", "cards", "decks"].map((link) =>
              link === "login" ? (
                <Link
                  className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
                  key={link}
                  href={`https://hub.tappen.app/api/auth/signin`}
                >
                  {link}
                </Link>
              ) : (
                <Link
                  className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
                  key={link}
                  href={`https://hub.tappen.app/?page=${link}`}
                >
                  {link}
                </Link>
              ),
            )}
            <Link
              className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
              key={"shop"}
              href={`https://hub.tappen.app/shop`}
            >
              Skins
            </Link>
          </div>
        </div>
        <div className="order-4 flex flex-1 flex-col gap-4">
          <h5 className="text-start font-bold uppercase">Legal</h5>
          <div className="flex flex-col gap-4 uppercase">
            <Link
              className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
              href="/legal#terms-of-service"
            >
              terms of use
            </Link>
            <Link
              className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
              href="/legal#privacy-policy"
            >
              privacy policy
            </Link>
            <Link
              className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
              href="/legal#submission-terms"
            >
              submission terms
            </Link>
            <Link
              className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
              href="/legal#imprint"
            >
              imprint
            </Link>
            <Link
              className="text-start underline underline-offset-4 transition duration-300 hover:text-tappen-blue-400"
              href="/legal/withdrawal"
            >
              withdrawal notice
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

type SocialListItem = {
  id: string;
  link: string;
  icon: string;
};

// const year = new Date().getFullYear()
