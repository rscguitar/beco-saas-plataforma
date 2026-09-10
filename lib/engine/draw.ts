import type { Competitor, EditionConfig, DrawSlot } from "./types";

/** Embaralha no lugar (Fisher-Yates) usando a fonte de aleatoriedade dada. */
export function shuffle<T>(a: T[], rnd: () => number = Math.random): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class DrawError extends Error {}

type Attempt = { ruleA: boolean; ruleB: boolean };

/**
 * Resolve a chave INTEIRA antes da primeira bola, por backtracking.
 *
 * O sorteio ingênuo — sortear bola, escolher grupo, repetir — trava: chega um
 * momento em que a última bola só tem grupos que já contêm alguém do mesmo
 * attrA. Resolver antes e revelar depois mantém o sorteio genuinamente
 * aleatório sem nunca chegar a um beco sem saída.
 */
function solveOnce(
  order: Competitor[],
  cfg: EditionConfig,
  attempt: Attempt,
  budget: number,
  rnd: () => number,
): number[] | null {
  const groups: Competitor[][] = Array.from({ length: cfg.groupCount }, () => []);
  const assign = new Array<number>(order.length).fill(-1);
  let steps = 0;

  /** false = pode; "dup" = pode, mas repete o attrB; true = viola. */
  function check(g: number, p: Competitor, potIdx: number): boolean | "dup" {
    const members = groups[g];
    if (members.length !== potIdx) return true;
    if (attempt.ruleA && p.attrA) {
      for (const m of members) if (m.attrA && m.attrA === p.attrA) return true;
    }
    if (attempt.ruleB && p.attrB) {
      const seen = new Set(members.map((m) => m.attrB).filter(Boolean));
      const dup = seen.has(p.attrB);
      seen.add(p.attrB);
      const slotsLeft = 3 - potIdx;
      if (seen.size + slotsLeft < 3) return true;
      return dup ? "dup" : false;
    }
    return false;
  }

  function bt(i: number): boolean {
    if (++steps > budget) return false;
    if (i === order.length) return true;
    const p = order[i];
    const potIdx = p.pot - 1;
    const fresh: number[] = [];
    const dup: number[] = [];
    for (let g = 0; g < cfg.groupCount; g++) {
      const v = check(g, p, potIdx);
      if (v === true) continue;
      (v === "dup" ? dup : fresh).push(g);
    }
    // Grupos que ainda não têm o attrB do competidor vêm primeiro: fecha a
    // regra de variedade muito mais rápido do que a ordem puramente aleatória.
    for (const g of [...shuffle(fresh, rnd), ...shuffle(dup, rnd)]) {
      groups[g].push(p);
      assign[i] = g;
      if (bt(i + 1)) return true;
      groups[g].pop();
      assign[i] = -1;
    }
    return false;
  }

  return bt(0) ? assign : null;
}

function potOrder(pool: Competitor[], cfg: EditionConfig, rnd: () => number): Competitor[] {
  const out: Competitor[] = [];
  for (let pot = 1; pot <= 4; pot++) {
    out.push(...shuffle(pool.filter((p) => p.pot === pot), rnd));
  }
  return out;
}

export type DrawResult = {
  slots: DrawSlot[];
  /** Regras que de fato couberam. Menos que o pedido = a lista não permitia. */
  rulesApplied: { ruleA: boolean; ruleB: boolean };
};

/**
 * Reinícios aleatórios: seis buscas curtas resolvem mais do que uma longa,
 * porque cada reinício troca a ordem das bolas. Se as regras pedidas não
 * fecharem, afrouxa na ordem ruleB → ruleA e informa o que sobrou.
 */
export function solveDraw(
  pool: Competitor[],
  cfg: EditionConfig,
  rnd: () => number = Math.random,
): DrawResult {
  const counts = [1, 2, 3, 4].map((n) => pool.filter((p) => p.pot === n).length);
  if (counts.some((c) => c !== cfg.potSize)) {
    throw new DrawError(
      `Cada pote precisa de ${cfg.potSize} competidores. Agora: ${counts.join(" / ")}.`,
    );
  }

  const attempts: Attempt[] = [
    { ruleA: cfg.ruleA, ruleB: cfg.ruleB },
    { ruleA: cfg.ruleA, ruleB: false },
    { ruleA: false, ruleB: false },
  ];

  for (const attempt of attempts) {
    for (let t = 0; t < 6; t++) {
      const order = potOrder(pool, cfg, rnd);
      const assign = solveOnce(order, cfg, attempt, 120_000, rnd);
      if (assign) {
        return {
          slots: order.map((p, i) => ({ competitorId: p.id, group: assign[i] })),
          rulesApplied: attempt,
        };
      }
    }
  }
  throw new DrawError("Não foi possível montar a chave com esta lista.");
}
