const KEY = "pdlc_prefetch_next";

export type NextPayload = {
  ok: boolean;
  finished: boolean;
  played: number;
  total: number;
  remaining: number;
  card?: { text?: string };
};

export function setPrefetchedNext(code: string, payload: NextPayload) {
  try {
    const map = JSON.parse(sessionStorage.getItem(KEY) || "{}");
    map[code] = payload;
    sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

export function takePrefetchedNext(code: string): NextPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    const payload = map[code];
    if (!payload) return null;
    delete map[code];
    sessionStorage.setItem(KEY, JSON.stringify(map));
    return payload as NextPayload;
  } catch {
    return null;
  }
}
