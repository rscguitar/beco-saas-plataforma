import { describe, it, expect } from "vitest";
import { solveDraw, DrawError, shuffle } from "./draw";
import { groupStandings, GROUP_FIXTURES, played } from "./standings";
import { seedRoundOf16, winnerOf, loserOf, KO_ROUNDS, R16_PAIRS } from "./bracket";
import type { Competitor, EditionConfig, Match } from "./types";

const CFG: EditionConfig = { groupCount: 8, potSize: 8, ruleA: true, ruleB: true };

/** Elenco real da edição "Camisas 10 BR, de 2000 em diante". */
const ROSTER: Array<[number, string, string, string]> = [
  [1,"Ronaldinho Gaúcho","Grêmio","05-09"],[1,"Djalminha","Dep. La Coruña","00-04"],
  [1,"Rivaldo","Barcelona","00-04"],[1,"Paulo Henrique Ganso","Santos","10-14"],
  [1,"Carlos Alberto","Fluminense","05-09"],[1,"Kaká","São Paulo","05-09"],
  [1,"Diego Ribas","Werder Bremen","05-09"],[1,"Felipe","Vasco","00-04"],
  [2,"Juninho Pernambucano","Lyon","05-09"],[2,"Alex de Souza","Cruzeiro","00-04"],
  [2,"Philippe Coutinho","Liverpool","15-19"],[2,"Marcelinho Carioca","Corinthians","00-04"],
  [2,"Juninho Paulista","Middlesbrough","00-04"],[2,"Oscar","Chelsea","10-14"],
  [2,"Renato Augusto","Corinthians","15-19"],[2,"Éverton Ribeiro","Flamengo","15-19"],
  [3,"Hernanes","São Paulo","05-09"],[3,"Nenê","PSG","10-14"],
  [3,"Thiago Neves","Fluminense","05-09"],[3,"Jádson","Shakhtar","05-09"],
  [3,"Elano","Santos","05-09"],[3,"Ricardinho","Corinthians","00-04"],
  [3,"Lucas Paquetá","Flamengo","20-25"],[3,"Diego Souza","Sport","10-14"],
  [4,"Douglas","Grêmio","10-14"],[4,"Lucas Lima","Santos","15-19"],
  [4,"Gustavo Scarpa","Palmeiras","20-25"],[4,"Raphael Veiga","Palmeiras","20-25"],
  [4,"Giuliano","Internacional","10-14"],[4,"Alan Patrick","Internacional","20-25"],
  [4,"Claudinho","Bragantino","20-25"],[4,"Marcelinho Paraíba","Atlético-PR","00-04"],
];

const pool: Competitor[] = ROSTER.map(([pot, name, attrA, attrB], i) => ({
  id: `c${i}`, pot, name, attrA, attrB, imagePath: null,
}));
const byId = new Map(pool.map((c) => [c.id, c]));

function groupsFrom(slots: { competitorId: string; group: number }[]) {
  const g: Competitor[][] = Array.from({ length: 8 }, () => []);
  for (const s of slots) g[s.group].push(byId.get(s.competitorId)!);
  return g;
}

describe("sorteio", () => {
  it("respeita as duas regras em 300 execuções", () => {
    for (let t = 0; t < 300; t++) {
      const { slots, rulesApplied } = solveDraw(pool, CFG);
      expect(rulesApplied).toEqual({ ruleA: true, ruleB: true });
      expect(slots).toHaveLength(32);
      for (const members of groupsFrom(slots)) {
        expect(members).toHaveLength(4);
        expect(new Set(members.map((m) => m.attrA)).size).toBe(4);
        expect(new Set(members.map((m) => m.attrB)).size).toBeGreaterThanOrEqual(3);
        expect(new Set(members.map((m) => m.pot)).size).toBe(4);
      }
    }
  });

  it("produz chaves diferentes a cada vez", () => {
    const chaves = new Set(
      Array.from({ length: 30 }, () => JSON.stringify(solveDraw(pool, CFG).slots)),
    );
    expect(chaves.size).toBeGreaterThan(25);
  });

  it("afrouxa a regra B quando a lista não permite, e avisa", () => {
    // três valores de attrB só, com o terceiro raro demais para 8 grupos
    const magro = pool.map((c, i) => ({ ...c, attrB: i < 30 ? (i % 2 ? "x" : "y") : "z" }));
    const r = solveDraw(magro, CFG);
    expect(r.rulesApplied.ruleB).toBe(false);
    expect(r.rulesApplied.ruleA).toBe(true);
  });

  it("recusa potes de tamanho errado", () => {
    expect(() => solveDraw(pool.slice(0, 31), CFG)).toThrow(DrawError);
  });
});

describe("classificação", () => {
  it("ordena por pontos, saldo e gols marcados", () => {
    const m = pool.slice(0, 4);
    const mk = (i: number, h: number, a: number): Match => ({
      id: `m${i}`, stage: "group", groupIndex: 0, roundIndex: i,
      homeId: m[GROUP_FIXTURES[i][0]].id, awayId: m[GROUP_FIXTURES[i][1]].id,
      homeScore: h, awayScore: a, homePens: null, awayPens: null,
    });
    // 0 vence os três; 1 vence dois; 2 vence um; 3 perde todos
    const ms = [mk(0,1,0), mk(1,3,0), mk(2,2,0), mk(3,0,1), mk(4,1,0), mk(5,1,0)];
    const t = groupStandings(m, ms);
    expect(t[0].competitorId).toBe(m[0].id);
    expect(t[0].points).toBe(9);
    expect(t[3].points).toBe(0);
    expect(t.map((r) => r.points)).toEqual([...t.map((r) => r.points)].sort((a, b) => b - a));
  });

  it("conta empate como um ponto para cada lado", () => {
    const m = pool.slice(0, 4);
    const ms: Match[] = [{
      id: "x", stage: "group", groupIndex: 0, roundIndex: 0,
      homeId: m[0].id, awayId: m[1].id, homeScore: 2, awayScore: 2,
      homePens: null, awayPens: null,
    }];
    const t = groupStandings(m, ms);
    expect(t.filter((r) => r.points === 1)).toHaveLength(2);
    expect(t.filter((r) => r.drawn === 1)).toHaveLength(2);
  });
});

describe("mata-mata", () => {
  const qualifiers: Array<[string, string]> =
    Array.from({ length: 8 }, (_, g) => [`g${g}-1`, `g${g}-2`]);

  it("pareia no padrão clássico 1A×2B", () => {
    const r16 = seedRoundOf16(qualifiers);
    expect(r16).toHaveLength(8);
    expect(r16[0]).toEqual(["g0-1", "g1-2"]);
    expect(r16[4]).toEqual(["g1-1", "g0-2"]);
    r16.forEach(([h, a], i) => {
      expect(h).toBe(qualifiers[R16_PAIRS[i][0]][0]);
      expect(a).toBe(qualifiers[R16_PAIRS[i][1]][1]);
    });
  });

  it("mantém os dois do mesmo grupo em metades opostas", () => {
    const r16 = seedRoundOf16(qualifiers);
    const metade = (i: number) => (i < 4 ? "cima" : "baixo");
    for (let g = 0; g < 8; g++) {
      const onde = r16
        .map((par, i) => (par.some((x) => x.startsWith(`g${g}-`)) ? metade(i) : null))
        .filter(Boolean);
      expect(new Set(onde).size).toBe(2);
    }
  });

  it("resolve empate pelos pênaltis e nunca antes deles", () => {
    const base: Match = {
      id: "m", stage: "r16", groupIndex: null, roundIndex: 0,
      homeId: "A", awayId: "B", homeScore: 1, awayScore: 1,
      homePens: null, awayPens: null,
    };
    expect(winnerOf(base)).toBeNull();
    expect(winnerOf({ ...base, homePens: 4, awayPens: 2 })).toBe("A");
    expect(loserOf({ ...base, homePens: 4, awayPens: 2 })).toBe("B");
    expect(winnerOf({ ...base, homePens: 3, awayPens: 3 })).toBeNull();
  });

  it("a chave tem 16 confrontos somando as rodadas e o terceiro lugar", () => {
    const total = KO_ROUNDS.reduce((n, r) => n + r.size, 0) + 1;
    expect(total).toBe(16);
  });
});

describe("shuffle", () => {
  it("preserva os elementos", () => {
    const a = [1, 2, 3, 4, 5];
    expect([...shuffle([...a])].sort()).toEqual(a);
  });
});
