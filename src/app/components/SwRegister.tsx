"use client";
import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // En prod (ou localhost), on enregistre le SW
      navigator.serviceWorker
        .register("/sw.js")
        .catch((e) => console.error("SW registration failed:", e));
    }
    // Best-effort landscape lock (works mostly in installed PWA/fullscreen)
    const orientation = screen.orientation as ScreenOrientation | undefined;
    if (orientation?.lock) {
      orientation.lock("landscape").catch(() => {});
    }
  }, []);
  return null;
}
