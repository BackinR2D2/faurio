import type { Metadata } from "next";
import "@fontsource-variable/oswald";
import "./globals.css";
import "./marketplace.css";
import { AuthProvider } from "@/components/auth-provider";
import { ShopProvider } from "@/components/shop-provider";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Faurio — obiecte handmade alese cu sens", template: "%s — Faurio" },
  description: "Descoperă ceramică, textile, lumânări și obiecte handmade create în ateliere locale.",
  openGraph: { title: "Faurio", description: "Obiecte handmade alese printr-o căutare care înțelege povestea ta.", type: "website", locale: "ro_RO" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body><AuthProvider><ShopProvider><a className="skip-link" href="#continut">Sari la conținut</a><SiteHeader /><div id="continut">{children}</div><SiteFooter year={new Date().getUTCFullYear()} /></ShopProvider></AuthProvider></body>
    </html>
  );
}
