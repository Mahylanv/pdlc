const ROUNDS_KEY = "pdlc_rounds_v1";
const ALLOWED = new Set([30, 50, 75, 100]);

export function loadRounds() {
  try {
    const raw = localStorage.getItem(ROUNDS_KEY);
    const val = raw ? Number(raw) : 30;
    return ALLOWED.has(val) ? val : 30;
  } catch {
    return 30;
  }
}

export function saveRounds(rounds: number) {
  try {
    const safe = ALLOWED.has(rounds) ? rounds : 30;
    localStorage.setItem(ROUNDS_KEY, String(safe));
  } catch {}
}

export const ROUND_OPTIONS = [30, 50, 75, 100] as const;

