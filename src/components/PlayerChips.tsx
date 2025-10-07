"use client";
type Props = { players: string[]; onRemove: (name: string) => void };
export default function PlayerChips({ players, onRemove }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {players.map((p) => (
        <span
          key={p + Math.random()}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 text-white px-3 py-1 text-sm"
        >
          {p}
          <button
            onClick={() => onRemove(p)}
            aria-label={`Supprimer ${p}`}
            className="rounded-full bg-white/20 hover:bg-white/30 px-2 leading-none"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
