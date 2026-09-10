/** Tipos do domínio. Uma "coisa" é qualquer competidor: jogador, fruta, videogame. */

export type Competitor = {
  id: string;
  pot: number;          // 1..4
  name: string;
  attrA: string;        // atributo com regra de unicidade no grupo (ex.: clube)
  attrB: string;        // atributo com regra de variedade no grupo (ex.: período)
  imagePath: string | null;
};

export type EditionConfig = {
  groupCount: number;   // 8 no padrão clássico
  potSize: number;      // = groupCount
  ruleA: boolean;       // um por attrA em cada grupo
  ruleB: boolean;       // mínimo de 3 valores distintos de attrB por grupo
};

/** Uma bola do sorteio: quem saiu e para qual grupo foi. */
export type DrawSlot = { competitorId: string; group: number };

export type Stage = "group" | "r16" | "qf" | "sf" | "final" | "third";

export type Match = {
  id: string;
  stage: Stage;
  groupIndex: number | null;   // só para stage "group"
  roundIndex: number;          // rodada no grupo, ou índice do confronto no mata-mata
  homeId: string | null;
  awayId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePens: number | null;
  awayPens: number | null;
};

export type StandingRow = {
  competitorId: string;
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; goalDiff: number; points: number;
};
