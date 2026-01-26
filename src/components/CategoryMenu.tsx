"use client";
import { ALL_CATEGORIES, type CatKey } from "@/lib/categories";

type Props = {
  selected: CatKey[];
  onToggle: (key: CatKey) => void;
  onAll: () => void;
  onNone: () => void;
  onClose: () => void;
};

export default function CategoryMenu({ selected, onToggle, onAll, onNone, onClose }: Props) {
  return (
    <div className="absolute z-50 mt-2 w-72 rounded-xl border border-white/15 bg-zinc-900/95 shadow-xl backdrop-blur p-3"
      role="dialog" aria-label="Catégories" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-white/80">Catégories</p>
        <div className="flex gap-2">
          <button onClick={onAll} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">Tout</button>
          <button onClick={onNone} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">Aucun</button>
          <button onClick={onClose} aria-label="Fermer" className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">✕</button>
        </div>
      </div>

      <div className="max-h-64 overflow-auto pr-1 space-y-2">
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
  );
}
