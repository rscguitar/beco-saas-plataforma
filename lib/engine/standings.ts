import type { Match, StandingRow, Competitor } from "./types";

/** As 6 partidas de um grupo de 4, em 3 rodadas de 2 (método do círculo). */
export const GROUP_FIXTURES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 3],
  [0, 2], [3, 1],
  [0, 3], [1, 2],
];

export const played = (m: Match) => m.homeScore !== null && m.awayScore !== null;

/**
 * Classificação de um grupo. Vitória 3, empate 1.
 * Desempate: pontos, saldo, gols marcados, ordem alfabética.
 */
export function groupStandings(members: Competitor[], matches: Match[]): StandingRow[] {
  const byId = new Map<string, StandingRow>();
  for (const c of members) {
    byId.set(c.id, {
      competitorId: c.id, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
    });
  }

  for (const m of matches) {
    if (!played(m) || !m.homeId || !m.awayId) continue;
    const h = byId.get(m.homeId), a = byId.get(m.awayId);
    if (!h || !a) continue;
    const hs = m.homeScore!, as = m.awayScore!;
    h.played++; a.played++;
    h.goalsFor += hs; h.goalsAgainst += as;
    a.goalsFor += as; a.goalsAgainst += hs;
    if (hs > as) { h.won++; a.lost++; h.points += 3; }
    else if (hs < as) { a.won++; h.lost++; a.points += 3; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }

  const names = new Map(members.map((c) => [c.id, c.name]));
  return [...byId.values()]
    .map((r) => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst }))
    .sort((x, y) =>
      y.points - x.points ||
      y.goalDiff - x.goalDiff ||
      y.goalsFor - x.goalsFor ||
      (names.get(x.competitorId) ?? "").localeCompare(names.get(y.competitorId) ?? "", "pt"),
    );
}
