"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { touchPlayers, savePlayers } from "@/lib/playerStore";

export const dynamic = "force-dynamic";

type Player = { id: string; name: string; order: number };
const INITIAL_PROGRESS = { played: 0, total: 30, remaining: 30, finished: false };

// --- Preload de la première carte entre pages (sessionStorage) ---
const PRELOAD_KEY = "pdlc_preload_v1";
type PreloadMap = Record<string, { cardText: string; progress: { played:number; total:number; remaining:number; finished:boolean } }>;

function setPreload(code: string, data: { cardText: string; progress: { played:number; total:number; remaining:number; finished:boolean } }) {
  try {
    const raw = sessionStorage.getItem(PRELOAD_KEY);
    const map: PreloadMap = raw ? JSON.parse(raw) : {};
    map[code] = data;
    sessionStorage.setItem(PRELOAD_KEY, JSON.stringify(map));
  } catch {}
}
function getPreload(code: string) {
  try {
    const raw = sessionStorage.getItem(PRELOAD_KEY);
    if (!raw) return undefined;
    const map: PreloadMap = JSON.parse(raw);
    return map[code];
  } catch { return undefined; }
}
function clearPreload(code: string) {
  try {
    const raw = sessionStorage.getItem(PRELOAD_KEY);
    if (!raw) return;
    const map: PreloadMap = JSON.parse(raw);
    delete map[code];
    sessionStorage.setItem(PRELOAD_KEY, JSON.stringify(map));
  } catch {}
}

function PlayInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const code = sp.get("code") || "";

  const [card, setCard] = useState<string>("");
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [loading, setLoading] = useState(false);

  // Drawer joueurs
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState("");

  // Overlay fin
  const [showEnd, setShowEnd] = useState(false);

  const tapBlock = useRef<number>(0); // anti double-tap

  function resetState() {
    setCard("");
    setProgress(INITIAL_PROGRESS);
    setShowEnd(false);
  }

  async function fetchPlayers() {
    if (!code) return;
    const res = await fetch(`/api/game/players?code=${encodeURIComponent(code)}`, { cache: "no-store" });
    const json = await res.json();
    if (json?.ok) {
      const list = json.players as Player[];
      setPlayers(list);
      // synchronise l'accueil (localStorage) avec la liste courante
      savePlayers(list.map(p => p.name));
    }
  }

  async function addPlayer() {
    const name = newName.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!name) return;
    const res = await fetch("/api/game/players/add", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ code, name }),
    });
    const json = await res.json();
    if (json?.ok) {
      setNewName("");
      await fetchPlayers();
      touchPlayers();
    } else {
      alert(json?.error || "Erreur ajout joueur");
    }
  }

  async function removePlayer(id: string) {
    const res = await fetch("/api/game/players/remove", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ code, id }),
    });
    const json = await res.json();
    if (json?.ok) {
      await fetchPlayers();
      touchPlayers();
    } else {
      alert(json?.error || "Erreur suppression joueur");
    }
  }

  async function nextCard() {
    if (!code || loading || progress.finished) return;
    const now = Date.now();
    if (now - tapBlock.current < 300) return; // anti spam
    tapBlock.current = now;

    setLoading(true);
    try {
      const res = await fetch("/api/game/next", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (json?.ok) {
        touchPlayers();
        const played = json.played ?? progress.played;
        const total = json.total ?? progress.total;
        const remaining = json.remaining ?? Math.max(0, total - played);
        const finished = Boolean(json.finished);
        setProgress({ played, total, remaining, finished });
        if (json.card?.text) setCard(json.card.text);
        setShowEnd(finished);
      }
    } finally {
      setLoading(false);
    }
  }

  // Rejouer : précréer la game + PRELOAD de la 1ère carte, puis navigation
  async function replay() {
    try {
      const resCreate = await fetch("/api/game/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ players: players.map(p => ({ name: p.name })) }),
      });
      const jsonCreate = await resCreate.json();
      const newCode = jsonCreate?.game?.code as string | undefined;
      if (!newCode) return;

      // Précharge la 1ère carte pour éviter "Tire une carte…"
      const resNext = await fetch("/api/game/next", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: newCode }),
      });
      const jsonNext = await resNext.json();
      if (jsonNext?.ok) {
        const played = jsonNext.played ?? 1;
        const total = jsonNext.total ?? 30;
        const remaining = jsonNext.remaining ?? Math.max(0, total - played);
        setPreload(newCode, {
          cardText: jsonNext.card?.text ?? "",
          progress: { played, total, remaining, finished: Boolean(jsonNext.finished) },
        });
      }

      router.replace(`/play?code=${encodeURIComponent(newCode)}`);
    } catch {}
  }

  // Quitter : supprime la partie en cours, ne touche pas aux joueurs (localStorage déjà sync)
  async function quitGame() {
    try {
      await fetch("/api/game/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
    } catch {}
    router.push("/");
  }

  // Au changement de code : si preload dispo, l'utiliser; sinon reset + première carte
  useEffect(() => {
    if (!code) return;
    const preload = getPreload(code);
    if (preload) {
      setCard(preload.cardText);
      setProgress(preload.progress);
      setShowEnd(preload.progress.finished);
      clearPreload(code);
      fetchPlayers();
      return;
    }
    // sinon : reset et charge normalement
    resetState();
    nextCard();
    fetchPlayers();
  }, [code]);

  return (
    <main
      className="flex min-h-dvh items-center justify-center p-6 bg-black text-white select-none relative"
      onClick={nextCard}
      role="button"
      aria-label="Suivant"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") nextCard(); }}
    >
      <div className="w-full max-w-4xl text-center">
        <div className="flex items-center justify-between mb-3 text-sm text-white/70">
          <span>Partie {code}</span>
          <span>{progress.played}/{progress.total}</span>
        </div>

        <div className="rounded-2xl border border-white/20 p-6 min-h-32 mb-4 text-xl leading-relaxed">
          {progress.finished ? "🎉 Fin de partie !" : (card || "Tire une carte…")}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); nextCard(); }}
          disabled={progress.finished || loading}
          className={`rounded-xl px-5 py-3 font-semibold ${progress.finished ? "bg-white/20 text-white/60 cursor-not-allowed" : "bg-white text-black hover:bg-zinc-200"}`}
        >
          {progress.finished ? "Terminé" : (loading ? "..." : "Suivant")}
        </button>
      </div>

      {/* FAB joueurs (bas droite) */}
      <button
        onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); fetchPlayers(); }}
        aria-label="Gérer les joueurs"
        className="fixed right-4 bottom-5 rounded-full w-12 h-12 grid place-items-center bg-white text-black text-2xl shadow-lg"
      >
        +
      </button>

      {/* Bouton Quitter (bas gauche) */}
      <button
        onClick={(e) => { e.stopPropagation(); quitGame(); }}
        aria-label="Quitter la partie"
        title="Quitter la partie"
        className="fixed left-4 bottom-5 rounded-full w-12 h-12 grid place-items-center bg-white/10 text-white text-lg border border-white/20 hover:bg-white/20"
      >
        ⟵
      </button>

      {/* Drawer joueurs */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[85%] max-w-sm h-full bg-zinc-900 border-l border-white/15 p-4 flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Joueurs</h2>
              <button onClick={() => setDrawerOpen(false)} aria-label="Fermer">✕</button>
            </div>

            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPlayer(); } }}
                placeholder="Nom du joueur"
                className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-2 outline-none focus:border-white/40"
                autoFocus
              />
              <button
                onClick={addPlayer}
                className="rounded-lg px-3 py-2 bg-white text-black font-medium"
              >
                Ajouter
              </button>
            </div>

            <div className="mt-4 space-y-2 overflow-auto">
              {players.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span>{p.name}</span>
                  <button
                    onClick={() => removePlayer(p.id)}
                    className="text-sm bg-white/10 hover:bg-white/20 rounded px-2 py-1"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
              {players.length === 0 && <p className="text-white/50 text-sm">Aucun joueur pour le moment.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Overlay fin de partie */}
      {showEnd && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm grid place-items-center p-6"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-zinc-900 border border-white/15 rounded-2xl p-6 text-center">
            <h3 className="text-2xl font-bold mb-2">🎉 Fin de partie !</h3>
            <p className="text-white/70 mb-6">{progress.played} cartes jouées.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); replay(); }}
                className="rounded-xl px-5 py-3 font-semibold bg-white text-black hover:bg-zinc-200"
              >
                Rejouer
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); router.push('/'); }}
                className="rounded-xl px-5 py-3 font-semibold bg-white/10 hover:bg-white/20 border border-white/20"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense>
      <PlayInner />
    </Suspense>
  );
}
