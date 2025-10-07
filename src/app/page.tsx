"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import PlayerChips from "@/components/PlayerChips";
import { useRouter } from "next/navigation";
import { loadPlayers, savePlayers, touchPlayers, clearPlayers } from "@/lib/playerStore";

export default function Home() {
  const [players, setPlayers] = useState<string[]>([]);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // charger + rafraîchir le TTL à l’ouverture
  useEffect(() => {
    setPlayers(loadPlayers());
    touchPlayers();
  }, []);

  // persister + rafraîchir TTL à chaque modif
  useEffect(() => {
    savePlayers(players);
  }, [players]);

  // rafraîchir TTL quand l’onglet redevient actif
  useEffect(() => {
    const onVis = () => document.visibilityState === "visible" && touchPlayers();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  const canStart = useMemo(() => players.length >= 1, [players]);

  function sanitize(s: string) {
    return s.trim().replace(/\s+/g, " ").slice(0, 40);
  }

  function addPlayer() {
    const val = sanitize(name);
    if (!val) return;
    if (players.includes(val)) {
      setName("");
      inputRef.current?.focus();
      return;
    }
    setPlayers((p) => [...p, val]);
    setName("");
    inputRef.current?.focus();
  }

  function removePlayer(n: string) {
    setPlayers((p) => p.filter((x) => x !== n));
    inputRef.current?.focus();
  }

  async function startGame() {
    if (!canStart) return;
    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ players: players.map((name) => ({ name })) }),
      });
      const json = await res.json();
      if (!res.ok || !json?.game?.code) throw new Error(json?.error || "create failed");
      touchPlayers(); // on relance le TTL au départ d’une partie
      router.push(`/play?code=${encodeURIComponent(json.game.code)}`);
    } catch {
      alert("Erreur lors de la création de la partie.");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6 bg-black text-white">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">PDLC</h1>
        <p className="opacity-80 mb-4">
          Ajoute des joueurs. Ils sont gardés pour relancer dans la nuit, puis effacés après une période d’inactivité.
        </p>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPlayer(); } }}
            placeholder="Nom du joueur"
            className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-3 outline-none focus:border-white/40"
            inputMode="text"
            autoComplete="name"
          />
          <button
            onClick={addPlayer}
            aria-label="Ajouter le joueur"
            className="rounded-xl px-4 py-3 bg-white/15 hover:bg-white/25 border border-white/20"
            title="Ajouter (↵/→)"
          >
            →
          </button>
        </div>

        <PlayerChips players={players} onRemove={removePlayer} />

        <div className="mt-6 flex items-center gap-3">
          <button
            disabled={!canStart}
            onClick={startGame}
            className={`rounded-xl px-5 py-3 font-semibold ${canStart ? "bg-white text-black hover:bg-zinc-200" : "bg-white/20 text-white/60 cursor-not-allowed"
              }`}
          >
            Lancer la partie
          </button>

          <button
            onClick={() => { clearPlayers(); setPlayers([]); }}
            className="rounded-xl px-4 py-3 font-medium bg-white/10 hover:bg-white/20 border border-white/20"
            title="Vider la liste des joueurs"
          >
            Nouvelle soirée (vider)
          </button>
        </div>
      </div>
    </main>
  );
}
