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
  }, []);
  return null;
}
