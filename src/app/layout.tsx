// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import SwRegister from "./components/SwRegister";

export const metadata: Metadata = {
  title: "PDLC – Jeu",
  description: "Jeu type Picolo en PWA (paysage).",
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "icon", url: "/icons/icon-192.png" }],
  themeColor: "#0b0b0b",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "PDLC" },
  openGraph: { title: "PDLC", images: ["/og-image.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="portrait-lock min-h-dvh bg-black text-white">
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
