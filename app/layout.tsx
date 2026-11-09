import type { Metadata } from "next";
import Link from "next/link";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@fontsource-variable/geist";
import "../tokens.css";
import "./globals.css";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Co zamawiamy? - Zdecydujcie razem",
  description: "Zaproponuj lunch, udostępnij link i sprawdź, na co ma ochotę ekipa. Bez logowania.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pl"><body>
    <a className="skip-link" href="#main">Przejdź do treści</a>
    <header className="site-header"><Link href="/" className="wordmark" aria-label="Co zamawiamy? - strona główna"><span className="brand-icon"><Icon name="plate" /></span>Co zamawiamy?</Link><span className="header-note">Lunch ustalony.</span></header>
    <main id="main" className="main-column">{children}</main>
    <footer className="site-footer"><span>Małe głosowanie. Wspólny lunch.</span><a href="https://superhero.tech">superhero.tech</a></footer>
    <SpeedInsights />
  </body></html>;
}
