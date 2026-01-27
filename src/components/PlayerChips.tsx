"use client";
type Props = { players: string[]; onRemove: (name: string) => void };
export default function PlayerChips({ players, onRemove }: Props) {
  return (
    <div className="flex flex-nowrap gap-2 mt-3 overflow-x-auto whitespace-nowrap pb-2">
      {players.map((p, idx) => (
        <span
          key={`${p}-${idx}`}
          className="home-chip inline-flex items-center gap-2 rounded-full text-white px-3 py-1 text-sm"
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
