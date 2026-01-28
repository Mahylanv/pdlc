"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PlayerChips from "@/components/PlayerChips";
import { useRouter } from "next/navigation";
import { loadPlayers, savePlayers, touchPlayers, clearPlayers } from "@/lib/playerStore";
import { ALL_CATEGORIES, loadSelectedCats, saveSelectedCats, type CatKey } from "@/lib/categories";
import CategoryMenu from "@/components/CategoryMenu";
import { Settings } from "lucide-react";
import { loadRounds, saveRounds } from "@/lib/settings";

export default function Home() {
  const [players, setPlayers] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [selectedCats, setSelectedCats] = useState<CatKey[]>([]);
  const [rounds, setRounds] = useState(30);
  const [showCats, setShowCats] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const didInitPlayers = useRef(false);
  const didInitCats = useRef(false);
  const didInitRounds = useRef(false);
  const router = useRouter();

  useEffect(() => {
    setPlayers(loadPlayers());
    touchPlayers();
    setSelectedCats(loadSelectedCats()); // CatKey[]
    setRounds(loadRounds());
  }, []);

  useEffect(() => {
    if (!didInitPlayers.current) { didInitPlayers.current = true; return; }
    savePlayers(players);
  }, [players]);
  useEffect(() => {
    if (!didInitCats.current) { didInitCats.current = true; return; }
    saveSelectedCats(selectedCats);
  }, [selectedCats]);
  useEffect(() => {
    if (!didInitRounds.current) { didInitRounds.current = true; return; }
    saveRounds(rounds);
  }, [rounds]);

  const canStart = useMemo(() => players.length >= 1, [players]);

  function sanitize(s: string) { return s.trim().replace(/\s+/g, " ").slice(0, 40); }

  function addPlayer() {
    const val = sanitize(name);
    if (!val) return;
    if (players.includes(val)) { setName(""); inputRef.current?.focus(); return; }
    setPlayers((p) => [...p, val]);
    setName("");
    inputRef.current?.focus();
  }

  function removePlayer(n: string) { setPlayers((p) => p.filter((x) => x !== n)); inputRef.current?.focus(); }

  function toggleCat(key: CatKey) {
    setSelectedCats((arr) => (arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key]));
  }
  function selectAll() {
    setSelectedCats(ALL_CATEGORIES.map(c => c.key) as CatKey[]);
  }
  function selectNone() {
    setSelectedCats([]);
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
      touchPlayers();
      router.push(`/play?code=${encodeURIComponent(json.game.code)}`);
    } catch {
      alert("Erreur lors de la création de la partie.");
    }
  }

  return (
    <main className="home-stage flex h-dvh items-center justify-center text-white relative p-0 md:p-6">
      <div className="game-content w-full max-w-2xl">
        <div className="home-panel rounded-3xl p-6">
          <h1 className="text-5xl font-display">PDLC</h1>
          <p className="text-white/80 mb-4 leading-relaxed">
            Ajoute des joueurs, choisis les catégories, puis lance la partie.
          </p>

          <div className="relative flex items-center gap-2 mb-2">
            {/* Bouton rouage (gauche) */}
            <div className="relative">
              <button
                onClick={() => setShowCats((s) => !s)}
                aria-label="Catégories"
                className="rounded-xl p-3 bg-white/10 border border-white/20 hover:bg-white/20"
                title="Catégories"
              >
                <Settings className="w-5 h-5" />
              </button>
            {showCats && (
              <CategoryMenu
                selected={selectedCats}
                onToggle={toggleCat}
                onAll={selectAll}
                onNone={selectNone}
                rounds={rounds}
                onRoundsChange={setRounds}
                onClose={() => setShowCats(false)}
              />
            )}
            </div>

            {/* Champ joueur + bouton ajouter */}
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPlayer(); } }}
              placeholder="Nom du joueur"
              className="home-input flex-1 rounded-xl px-4 py-3 outline-none transition"
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

        {/* Rappel compact : combien de catégories actives */}
          <div className="mb-3 text-sm text-white/70">
            {selectedCats.length === ALL_CATEGORIES.length
              ? "Toutes les catégories sélectionnées"
              : `${selectedCats.length} / ${ALL_CATEGORIES.length} catégories sélectionnées`}
          </div>

          <PlayerChips players={players} onRemove={removePlayer} />

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              disabled={!canStart}
              onClick={startGame}
              className="home-cta rounded-2xl px-6 py-3 font-semibold disabled:cursor-not-allowed"
            >
              Lancer la partie
            </button>
            <button
              onClick={() => { clearPlayers(); setPlayers([]); }}
              className="rounded-2xl px-4 py-3 font-medium bg-white/10 hover:bg-white/20 border border-white/20"
              title="Vider la liste des joueurs"
            >
              Nouvelle soirée (vider)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
