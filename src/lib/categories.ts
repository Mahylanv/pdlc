export const ALL_CATEGORIES = [
  { key: "tous", name: "Tout le monde", color: "#916D09" },
  { key: "un_joueur", name: "Un joueur", color: "#0C7A76" },
  { key: "vote", name: "Vote", color: "#583178" },
  { key: "culture_g", name: "Culture G", color: "#4B7303" },
  { key: "mort_subite", name: "Mort subite", color: "#3B3B3B" },
  { key: "regle", name: "Règle", color: "#267078" },
  { key: "emoji_film", name: "Emoji Film", color: "#8C6F14" },
  { key: "encheres", name: "Enchères", color: "#992E47" }
] as const;

export type CatKey = typeof ALL_CATEGORIES[number]["key"];
export type CategoryDef = { key: CatKey; name: string; color: string };

export const CAT_STORAGE = "pdlc_selected_categories_v5";

export function loadSelectedCats(): CatKey[] {
  const fallback = ALL_CATEGORIES.map(c => c.key) as CatKey[];
  try {
    const raw = localStorage.getItem(CAT_STORAGE);
    if (!raw) return fallback;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return fallback;

    const allowed = new Set<CatKey>(fallback);
    const filtered = arr.filter((k: unknown): k is CatKey =>
      typeof k === "string" && allowed.has(k as CatKey)
    );
    return filtered.length ? filtered : fallback;
  } catch {
    return fallback;
  }
}

export function saveSelectedCats(keys: CatKey[]) {
  try { localStorage.setItem(CAT_STORAGE, JSON.stringify(keys)); } catch { }
}
