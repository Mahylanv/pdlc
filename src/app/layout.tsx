import "./globals.css";
import type { Metadata, Viewport } from "next";
import SwRegister from "./components/SwRegister";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "PDLC – Jeu",
  description: "Jeu type Picolo en PWA (paysage).",
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "icon", url: "/icons/icon-192.png" }],
  openGraph: { title: "PDLC", images: ["/og-image.png"] },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
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
