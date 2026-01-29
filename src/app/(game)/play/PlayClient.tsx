"use client";

import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { touchPlayers, savePlayers } from "@/lib/playerStore";
import { loadSelectedCats, saveSelectedCats, type CatKey } from "@/lib/categories";
import { loadRounds } from "@/lib/settings";

type Player = { id: string; name: string; order: number };
type Cat = { key: string; name: string; color: string };
const INITIAL_PROGRESS = { played: 0, total: 30, remaining: 30, finished: false };
type NextPayload = {
  played: number;
  total: number;
  remaining: number;
  finished: boolean;
  card?: {
    text?: string;
    answer?: string | null;
    answerNote?: string | null;
    categories?: Cat[];
  };
};

// PRELOAD first card between navigations
const PRELOAD_KEY = "pdlc_preload_v1";
type PreloadMap = Record<string, { cardText: string; progress: { played:number; total:number; remaining:number; finished:boolean }, cats: Cat[], answer?: string|null, answerNote?: string|null, prefetched?: NextPayload[] }>;
function setPreload(code: string, data: PreloadMap[string]) { try {
  const raw = sessionStorage.getItem(PRELOAD_KEY);
  const map: PreloadMap = raw ? JSON.parse(raw) : {};
  map[code] = data; sessionStorage.setItem(PRELOAD_KEY, JSON.stringify(map));
} catch {} }
function getPreload(code: string) { try {
  const raw = sessionStorage.getItem(PRELOAD_KEY); if (!raw) return;
  const map: PreloadMap = JSON.parse(raw); return map[code];
} catch {} }
function clearPreload(code: string) { try {
  const raw = sessionStorage.getItem(PRELOAD_KEY); if (!raw) return;
  const map: PreloadMap = JSON.parse(raw); delete map[code];
  sessionStorage.setItem(PRELOAD_KEY, JSON.stringify(map));
} catch {} }

function PlayInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const code = sp.get("code") || "";
  const selectedCats = loadSelectedCats();

  const [card, setCard] = useState<string>("");
  const [answer, setAnswer] = useState<string|undefined|null>(null);
  const [answerNote, setAnswerNote] = useState<string|undefined|null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [rounds] = useState(() => loadRounds());

  // Drawer joueurs
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState("");

  // Overlay fin
  const [showEnd, setShowEnd] = useState(false);

  const tapBlock = useRef<number>(0);
  const playersRef = useRef<Player[]>([]);
  const [prefetched, setPrefetched] = useState<NextPayload[]>([]);
  const prefetchedRef = useRef<NextPayload[]>([]);
  const prefetching = useRef(false);

  function resetState() {
    setCard(""); setAnswer(null); setAnswerNote(null); setCats([]);
    setProgress(INITIAL_PROGRESS); setShowEnd(false);
  }

  async function fetchPlayers() {
    if (!code) return;
    const res = await fetch(`/api/game/players?code=${encodeURIComponent(code)}`, { cache: "no-store" });
    const json = await res.json();
    if (json?.ok) {
      const list = json.players as Player[];
      setPlayers(list);
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
    if (json?.ok) { setNewName(""); await fetchPlayers(); touchPlayers(); }
    else alert(json?.error || "Erreur ajout joueur");
  }

  async function removePlayer(id: string) {
    const res = await fetch("/api/game/players/remove", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ code, id }),
    });
    const json = await res.json();
    if (json?.ok) { await fetchPlayers(); touchPlayers(); }
    else alert(json?.error || "Erreur suppression joueur");
  }

  function desiredPrefetchCount(played: number) {
    return played <= 1 ? 6 : 12;
  }

  async function fetchNextCard() {
    const res = await fetch("/api/game/next/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, categories: selectedCats, rounds, batchSize: 1 }),
    });
    const json = await res.json();
    const first = (json?.cards ?? [])[0];
    return first as NextPayload & { ok?: boolean };
  }

  async function fetchNextBatch(batchSize: number) {
    const res = await fetch("/api/game/next/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, categories: selectedCats, rounds, batchSize }),
    });
    return res.json() as Promise<{ ok?: boolean; cards?: NextPayload[] }>;
  }

  function applyNext(json: NextPayload & { ok?: boolean }) {
    if (!json || (!json.card && json.ok === false)) return null;
    touchPlayers();
    const played = json.played ?? progress.played;
    const total = json.total ?? progress.total;
    const remaining = json.remaining ?? Math.max(0, total - played);
    const finished = Boolean(json.finished);
    setProgress({ played, total, remaining, finished });
    if (json.card?.text) setCard(json.card.text);
    setAnswer(json.card?.answer ?? null);
    setAnswerNote(json.card?.answerNote ?? null);
    setShowAnswer(false);
    setCats(json.card?.categories ?? []);
    setShowEnd(finished);
    return { played, finished };
  }

  async function prefetchToTarget(target: number, finished: boolean) {
    if (prefetching.current || finished) return;
    prefetching.current = true;
    try {
      const missing = Math.max(0, target - prefetchedRef.current.length);
      if (missing === 0) return;
      const batch = Math.min(missing, 8);
      const json = await fetchNextBatch(batch);
      const list = (json?.cards ?? []).filter((c) => c && c.card);
      if (list.length) {
        prefetchedRef.current = [...prefetchedRef.current, ...list];
        setPrefetched(prefetchedRef.current);
      }
    } finally {
      prefetching.current = false;
    }
  }

  async function nextCard() {
    if (!code || loading || progress.finished) return;
    const now = Date.now();
    if (now - tapBlock.current < 300) return;
    tapBlock.current = now;

    if ((answer || answerNote) && !showAnswer) {
      setShowAnswer(true);
      return;
    }

    setLoading(true);
    try {
      if (prefetchedRef.current.length > 0) {
        const [cached, ...rest] = prefetchedRef.current;
        prefetchedRef.current = rest;
        setPrefetched(rest);
        const applied = applyNext(cached);
        if (applied) {
          void prefetchToTarget(desiredPrefetchCount(applied.played), applied.finished);
        }
      } else {
        const json = await fetchNextCard();
        const applied = applyNext(json);
        if (applied) {
          void prefetchToTarget(desiredPrefetchCount(applied.played), applied.finished);
        }
      }
    } finally {
      setLoading(false);
    }
  }

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

      // Précharge 1ère carte avec catégories sélectionnées
      const resNext = await fetch("/api/game/next", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: newCode, categories: selectedCats }),
      });
      const jsonNext = await resNext.json();
      if (jsonNext?.ok) {
        const played = jsonNext.played ?? 1;
        const total = jsonNext.total ?? 30;
        const remaining = jsonNext.remaining ?? Math.max(0, total - played);
        setPreload(newCode, {
          cardText: jsonNext.card?.text ?? "",
          cats: jsonNext.card?.categories ?? [],
          answer: jsonNext.card?.answer ?? null,
          answerNote: jsonNext.card?.answerNote ?? null,
          progress: { played, total, remaining, finished: Boolean(jsonNext.finished) },
        });
      }

      router.replace(`/play?code=${encodeURIComponent(newCode)}`);
    } catch {}
  }

  async function quitGame() {
    if (players.length > 0) {
      savePlayers(players.map((p) => p.name));
      touchPlayers();
    }
    saveSelectedCats(selectedCats);
    try {
      await fetch("/api/game/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
    } catch {}
    router.push("/");
  }

  useEffect(() => {
    if (!code) return;
    setPrefetched([]);
    prefetchedRef.current = [];
    const preload = getPreload(code);
    if (preload && preload.cardText) {
      setCard(preload.cardText);
      setCats(preload.cats || []);
      setAnswer(preload.answer ?? null);
      setAnswerNote(preload.answerNote ?? null);
      setShowAnswer(false);
      setProgress(preload.progress);
      setShowEnd(preload.progress.finished);
      if (preload.prefetched?.length) {
        prefetchedRef.current = preload.prefetched;
        setPrefetched(preload.prefetched);
      } else {
        void prefetchToTarget(
          desiredPrefetchCount(preload.progress.played),
          preload.progress.finished
        );
      }
      clearPreload(code);
      fetchPlayers();
      return;
    }
    if (preload) {
      clearPreload(code);
    }
    resetState();
    nextCard();
    fetchPlayers();
  }, [code]);

  useEffect(() => {
    if (!code || progress.finished) return;
    const interval = setInterval(() => {
      void prefetchToTarget(desiredPrefetchCount(progress.played), progress.finished);
    }, 2500);
    return () => clearInterval(interval);
  }, [code, progress.played, progress.finished]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const list = playersRef.current;
      if (list.length > 0) {
        savePlayers(list.map((p) => p.name));
        touchPlayers();
      }
      saveSelectedCats(selectedCats);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      const list = playersRef.current;
      if (list.length > 0) {
        savePlayers(list.map((p) => p.name));
        touchPlayers();
      }
      saveSelectedCats(selectedCats);
    };
  }, [selectedCats]);

  // Couleur de fond = 1ère catégorie si dispo
  let bg = cats[0]?.color || "#000000";
  if (showAnswer && (answerNote ?? "").toLowerCase().includes("fond rouge")) {
    bg = "#4b0f18";
  } else if (showAnswer && (answerNote ?? "").toLowerCase().includes("fond noir")) {
    bg = "#070707";
  }

  return (
    <main
      className="game-stage flex h-dvh items-center justify-center p-0 md:p-6 text-white select-none relative"
      style={{ "--accent": bg } as CSSProperties}
      onClick={nextCard}
      role="button"
      aria-label="Suivant"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") nextCard(); }}
    >
      <div className="bubble-layer" aria-hidden="true">
        <span className="bubble b2" />
        <span className="bubble b3" />
        <span className="bubble b4" />
        <span className="bubble b5" />
        <span className="bubble b6" />
      </div>
      <div className="glow-ring" aria-hidden="true" />

      <div className="game-content w-full max-w-xl text-center">
        <div className="flex items-center justify-between mb-3 text-sm text-white/90 uppercase tracking-widest">
          <div
            className="flex-1 min-w-0 flex gap-2 overflow-x-auto whitespace-nowrap pb-1 pr-2"
            style={{ touchAction: "pan-x" }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {cats.map((c) => (
              <span
                key={c.key}
                className="badge-chip px-2 py-0.5 rounded-full text-xs shrink-0"
                style={{ background: "#00000030" }}
              >
                {c.name}
              </span>
            ))}
          </div>
          <span>{progress.played}/{progress.total}</span>
        </div>

        <div className="glass-card card-float rounded-3xl p-7 min-h-36 mb-4 text-xl leading-relaxed">
          <div className="text-sm text-white/60 mb-2 font-display">
            {cats[0]?.name ?? "Catégorie"}
          </div>
          {!showAnswer ? (card || "Lancement de la partie") : (
            <div className="text-left">
              {answer && <p><span className="opacity-80">Réponse :</span> {answer}</p>}
              {answerNote && <p className="mt-2 opacity-90">{answerNote}</p>}
            </div>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); nextCard(); }}
          disabled={progress.finished || loading}
          className={`rounded-2xl px-6 py-3 font-semibold ${progress.finished ? "bg-white/15 text-white/60 cursor-not-allowed" : "spark-button"}`}
        >
          {progress.finished ? "Terminé" : (loading ? "..." : "Suivant")}
        </button>
      </div>

      {/* FAB joueurs */}
      <button
        onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); fetchPlayers(); }}
        aria-label="Gérer les joueurs"
        className="fixed right-4 bottom-5 rounded-full w-12 h-12 grid place-items-center bg-white text-black text-2xl shadow-lg hover:scale-105 transition"
      >
        +
      </button>

      {/* Quitter */}
      <button
        onClick={(e) => { e.stopPropagation(); quitGame(); }}
        aria-label="Quitter la partie"
        title="Quitter la partie"
        className="fixed left-4 bottom-5 rounded-full w-12 h-12 grid place-items-center bg-white/10 text-white text-lg border border-white/30 hover:bg-white/20 hover:scale-105 transition"
      >
        ⟵
      </button>

      {/* Drawer joueurs */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50"
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
              {players.length === 0 && <p className="text-white/70 text-sm">Aucun joueur pour le moment.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Overlay fin */}
      {showEnd && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md grid place-items-center p-6 z-50"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card w-full max-w-md rounded-2xl p-6 text-center border border-white/20 shadow-2xl">
            <h3 className="text-2xl font-bold mb-2 font-display uppercase tracking-wider">🎉 Fin de partie !</h3>
            <p className="text-white/95 mb-6">{progress.played} cartes jouées.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); replay(); }}
                className="rounded-xl px-5 py-3 font-semibold bg-white text-black hover:bg-zinc-200"
              >
                Rejouer
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); quitGame(); }}
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

export default function PlayClient() {
  return (
    <Suspense>
      <PlayInner />
    </Suspense>
  );
}
