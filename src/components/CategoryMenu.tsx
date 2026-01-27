"use client";
import { ALL_CATEGORIES, type CatKey } from "@/lib/categories";
import { ROUND_OPTIONS } from "@/lib/settings";

type Props = {
  selected: CatKey[];
  onToggle: (key: CatKey) => void;
  onAll: () => void;
  onNone: () => void;
  onClose: () => void;
  rounds: number;
  onRoundsChange: (rounds: number) => void;
};

export default function CategoryMenu({
  selected,
  onToggle,
  onAll,
  onNone,
  onClose,
  rounds,
  onRoundsChange,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-label="Catégories"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-900/95 shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-white/80">Paramètres</p>
          <div className="flex gap-2">
            <button onClick={onAll} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">Tout</button>
            <button onClick={onNone} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">Aucun</button>
            <button onClick={onClose} aria-label="Fermer" className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">✕</button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest text-white/60 mb-2">Cartes par partie</p>
          <div className="grid grid-cols-4 gap-2">
            {ROUND_OPTIONS.map((opt) => {
              const checked = rounds === opt;
              return (
                <label
                  key={opt}
                  className={`text-sm rounded-lg px-2 py-2 text-center border cursor-pointer ${
                    checked ? "border-white bg-white text-black" : "border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="radio"
                    name="rounds"
                    className="sr-only"
                    checked={checked}
                    onChange={() => onRoundsChange(opt)}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        </div>

        <div className="max-h-64 overflow-auto pr-1 h-36 space-y-2">
          <p className="text-xs uppercase tracking-widest text-white/60 mb-1">Catégories</p>
          {ALL_CATEGORIES.map((c) => {
            const checked = selected.includes(c.key);
            return (
              <label key={c.key} className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={checked} onChange={() => onToggle(c.key)} className="accent-white" />
                <span className="inline-flex items-center gap-2 px-2 py-1 rounded border border-white/20"
                  style={{ background: c.color }} title={c.name}>
                  <span className="text-white drop-shadow">{c.name}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
