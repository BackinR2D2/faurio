import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fir de Poveste — obiecte handmade alese cu sens",
  description: "Descoperă ceramică, textile, lumânări și obiecte handmade create în ateliere locale.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
