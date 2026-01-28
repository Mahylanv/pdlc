import "./globals.css";
import type { Metadata, Viewport } from "next";
import SwRegister from "./components/SwRegister";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const seoDescription =
  "PDLC (Princes de la Cuite) est un jeu d'alcool type Picolo en PWA, rapide, fun et pense pour mobile en mode paysage.";
const seoKeywords = [
  "jeu d'alcool",
  "jeu alcool",
  "PDLC",
  "Princes de la Cuite",
  "Picolo",
  "Mahylan Veclin",
  "jeu soiree",
  "drinking game",
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "PDLC",
      alternateName: "Princes de la Cuite",
      url: appUrl,
      description: seoDescription,
      inLanguage: "fr-FR",
      keywords: seoKeywords.join(", "),
      author: {
        "@type": "Person",
        name: "Mahylan Veclin",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${appUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Game",
      name: "PDLC",
      alternateName: "Princes de la Cuite",
      url: appUrl,
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      description: seoDescription,
      inLanguage: "fr-FR",
      author: {
        "@type": "Person",
        name: "Mahylan Veclin",
      },
      creator: {
        "@type": "Person",
        name: "Mahylan Veclin",
      },
      keywords: seoKeywords.join(", "),
      image: `${appUrl}/pdlc-bg.png`,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: appUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Jouer",
          item: `${appUrl}/play`,
        },
      ],
    },
  ],
};

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
  applicationName: "PDLC",
  title: {
    default: "PDLC – Jeu d'alcool (Princes de la Cuite)",
    template: "%s | PDLC",
  },
  description: seoDescription,
  keywords: seoKeywords,
  authors: [{ name: "Mahylan Veclin" }],
  creator: "Mahylan Veclin",
  publisher: "Mahylan Veclin",
  category: "games",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/pdlc-icon.png" }],
    shortcut: [{ url: "/pdlc-icon.png" }],
    apple: [{ url: "/pdlc-icon.png" }],
  },
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "PDLC",
    title: "PDLC – Jeu d'alcool (Princes de la Cuite)",
    description: seoDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "PDLC - Princes de la Cuite, jeu d'alcool PWA",
      },
    ],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDLC – Jeu d'alcool (Princes de la Cuite)",
    description: seoDescription,
    images: ["/twitter-image"],
    creator: "@mahylan",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`portrait-lock min-h-dvh bg-black text-white ${displayFont.variable} ${bodyFont.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
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
