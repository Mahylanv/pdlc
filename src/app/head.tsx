const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const title = "PDLC – Jeu d'alcool (Princes de la Cuite)";
const description =
  "PDLC (Princes de la Cuite) est un jeu d'alcool type Picolo en PWA, rapide, fun et pense pour mobile en mode paysage.";
const keywords =
  "jeu d'alcool, jeu alcool, PDLC, Princes de la Cuite, Picolo, Mahylan Veclin, jeu soiree, drinking game";

export default function Head() {
  return (
    <>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Mahylan Veclin" />
      <meta name="creator" content="Mahylan Veclin" />
      <meta name="publisher" content="Mahylan Veclin" />
      <meta name="application-name" content="PDLC" />
      <meta name="apple-mobile-web-app-title" content="PDLC" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="format-detection" content="telephone=no, address=no, email=no" />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="PDLC" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={appUrl} />
      <meta property="og:image" content={`${appUrl}/opengraph-image`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${appUrl}/twitter-image`} />
    </>
  );
}
