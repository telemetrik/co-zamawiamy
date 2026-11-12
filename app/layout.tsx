import type { Metadata } from "next";
import Link from "next/link";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@fontsource-variable/geist";
import "@fontsource/comic-relief/400.css";
import "@fontsource/comic-relief/700.css";
import "../tokens.css";
import "./globals.css";
import { Icon } from "@/components/icons";
import { EarlyAccess } from "@/components/early-access";

export const metadata: Metadata = {
  title: "Co zamawiamy? - Zdecydujcie razem",
  description: "Zaproponuj lunch, udostępnij link i sprawdź, na co ma ochotę ekipa. Bez logowania.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  const isProduction = environment === "production";
  const isPreview = environment === "preview";

  return <html lang="pl" data-environment={isProduction ? "production" : isPreview ? "preview" : "development"}><body>
    <a className="skip-link" href="#main">Przejdź do treści</a>
    <div className="environment-bar" aria-label="Środowisko aplikacji">{isProduction ? "PRODUKCJA" : isPreview ? "PREVIEW" : "DEV"}</div>
    <header className="site-header"><Link href="/" className="wordmark" aria-label="Co zamawiamy? - strona główna"><span className="brand-icon"><Icon name="plate" /></span>Co zamawiamy?</Link><span className="header-note">Lunch ustalony.</span></header>
    <main id="main" className="main-column">{children}</main>
    <footer className="site-footer">
      <span>Małe głosowanie. Wspólny lunch.</span>
      <div className="footer-links">
        <EarlyAccess />
        <a href="https://superhero.tech">superhero.tech</a>
      </div>
    </footer>
    <SpeedInsights />
  </body></html>;
}
