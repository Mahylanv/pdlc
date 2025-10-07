import type { Player } from "@prisma/client";

export function pickTwoDistinct<T>(arr: T[]) {
  if (arr.length < 2) throw new Error("Need at least 2 players");
  const i = Math.floor(Math.random() * arr.length);
  let j = Math.floor(Math.random() * arr.length);
  if (j === i) j = (j + 1) % arr.length;
  return [arr[i], arr[j]];
}

export function renderCardText(text: string, players: Player[]) {
  const [p1, p2] = players.length >= 2 ? pickTwoDistinct(players) : [players[0], players[0]];
  return text
    .replace(/{player}/g, p1?.name ?? "Joueur 1")
    .replace(/{other}/g, p2?.name ?? "Joueur 2");
}
