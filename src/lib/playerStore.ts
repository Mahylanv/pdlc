const KEY = "pdlc_players_v1";
const TTL_HOURS = 16; // ajuste à 12/18/24 si tu veux

type Payload = { players: string[]; lastSeen: number }; // timestamp (ms)

function isExpired(lastSeen: number, ttlHours = TTL_HOURS) {
    return Date.now() - lastSeen > ttlHours * 3600_000;
}

export function loadPlayers(): string[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const data = JSON.parse(raw) as Payload;
        if (!data?.lastSeen || !Array.isArray(data.players) || isExpired(data.lastSeen)) {
            localStorage.removeItem(KEY);
            return [];
        }
        return data.players;
    } catch {
        return [];
    }
}

export function savePlayers(players: string[]) {
    try {
        const payload: Payload = { players, lastSeen: Date.now() };
        localStorage.setItem(KEY, JSON.stringify(payload));
    } catch { }
}

// rafraîchir le timer sans changer la liste
export function touchPlayers() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const data = JSON.parse(raw) as Payload;
        if (!data?.players) return;
        data.lastSeen = Date.now();
        localStorage.setItem(KEY, JSON.stringify(data));
    } catch { }
}

export function clearPlayers() {
    localStorage.removeItem(KEY);
}
