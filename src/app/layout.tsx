import "./globals.css";
import type { Metadata, Viewport } from "next";
import SwRegister from "./components/SwRegister";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const displayFont = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

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
      <body className={`portrait-lock min-h-dvh bg-black text-white ${displayFont.variable} ${bodyFont.variable}`}>
        <SwRegister />
        <div className="orientation-guard">
          <div>
            <h1>Tourne ton ecran</h1>
            <p>Passe en mode paysage pour jouer en plein ecran.</p>
          </div>
        </div>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
