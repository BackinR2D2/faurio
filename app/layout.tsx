import type { Metadata } from "next";
import "@fontsource-variable/oswald";
import "./globals.css";
import { ShopProvider } from "@/components/shop-provider";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  metadataBase: new URL("https://fir-de-poveste-handmade.elatedpine3.chatgpt.site"),
  title: { default: "Fir de Poveste — obiecte handmade alese cu sens", template: "%s — Fir de Poveste" },
  description: "Descoperă ceramică, textile, lumânări și obiecte handmade create în ateliere locale.",
  openGraph: { title: "Fir de Poveste", description: "Obiecte handmade alese printr-o căutare care înțelege povestea ta.", type: "website", locale: "ro_RO" },
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
      <body><ShopProvider><a className="skip-link" href="#continut">Sari la conținut</a><SiteHeader /><div id="continut">{children}</div><SiteFooter /></ShopProvider></body>
    </html>
  );
}
