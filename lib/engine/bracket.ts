import type { Match, Stage } from "./types";
import { played } from "./standings";

/**
 * Padrão clássico de 16: o primeiro de cada grupo enfrenta o segundo do grupo
 * vizinho. Os pares são [grupo do 1º colocado, grupo do 2º colocado].
 * As quatro primeiras linhas formam a metade de cima da chave; as quatro
 * últimas, a de baixo. Dois classificados do mesmo grupo caem em metades
 * opostas e só podem se reencontrar na final.
 */
export const R16_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7],   // 1A×2B  1C×2D  1E×2F  1G×2H
  [1, 0], [3, 2], [5, 4], [7, 6],   // 1B×2A  1D×2C  1F×2E  1H×2G
];

export const KO_ROUNDS: ReadonlyArray<{ stage: Stage; name: string; size: number }> = [
  { stage: "r16",   name: "Oitavas de final", size: 8 },
  { stage: "qf",    name: "Quartas de final", size: 4 },
  { stage: "sf",    name: "Semifinais",       size: 2 },
  { stage: "final", name: "Final",            size: 1 },
];

/** Vencedor do confronto, ou null se ainda não decidido. Empate vai a pênaltis. */
export function winnerOf(m: Match | undefined): string | null {
  if (!m || !m.homeId || !m.awayId || !played(m)) return null;
  if (m.homeScore! > m.awayScore!) return m.homeId;
  if (m.awayScore! > m.homeScore!) return m.awayId;
  if (m.homePens !== null && m.awayPens !== null && m.homePens !== m.awayPens) {
    return m.homePens > m.awayPens ? m.homeId : m.awayId;
  }
  return null;
}

export function loserOf(m: Match | undefined): string | null {
  const w = winnerOf(m);
  if (!w || !m) return null;
  return w === m.homeId ? m.awayId : m.homeId;
}

/** Quem entra em cada vaga do mata-mata, dado o 1º e 2º de cada grupo. */
export function seedRoundOf16(qualifiers: Array<[string, string]>): Array<[string, string]> {
  return R16_PAIRS.map(([first, second]) => [qualifiers[first][0], qualifiers[second][1]]);
}

/** Preenche as rodadas seguintes a partir dos vencedores já conhecidos. */
export function advance(matches: Match[]): Map<string, string | null> {
  const bySlot = new Map<string, Match>();
  for (const m of matches) bySlot.set(`${m.stage}-${m.roundIndex}`, m);

  const out = new Map<string, string | null>();
  for (let r = 0; r < KO_ROUNDS.length - 1; r++) {
    const cur = KO_ROUNDS[r], next = KO_ROUNDS[r + 1];
    for (let i = 0; i < cur.size; i++) {
      const w = winnerOf(bySlot.get(`${cur.stage}-${i}`));
      const side = i % 2 === 0 ? "home" : "away";
      out.set(`${next.stage}-${Math.floor(i / 2)}-${side}`, w);
    }
  }
  // disputa de terceiro: perdedores das semifinais
  out.set("third-0-home", loserOf(bySlot.get("sf-0")));
  out.set("third-0-away", loserOf(bySlot.get("sf-1")));
  return out;
}
