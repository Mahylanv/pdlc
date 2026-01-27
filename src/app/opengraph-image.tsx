import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "radial-gradient(1200px 600px at -10% -20%, rgba(241,176,76,0.35), transparent 60%)," +
            "radial-gradient(1000px 600px at 110% -10%, rgba(107,31,42,0.45), transparent 65%)," +
            "linear-gradient(160deg, #0b0908 0%, #120e0b 45%, #1a120d 100%)",
          color: "#f7e8d2",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 8, textTransform: "uppercase", opacity: 0.8 }}>
          Jeu d'alcool PWA
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 160, fontWeight: 800, lineHeight: 0.9 }}>PDLC</div>
          <div style={{ fontSize: 54, fontWeight: 600, opacity: 0.95 }}>Princes de la Cuite</div>
        </div>
        <div style={{ fontSize: 32, opacity: 0.85 }}>
          Picolo-like • Mobile paysage • Mahylan Veclin
        </div>
      </div>
    ),
    size
  );
}

