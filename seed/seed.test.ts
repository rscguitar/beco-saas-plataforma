import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { solveDraw } from "../lib/engine/draw";
import type { Competitor, EditionConfig } from "../lib/engine/types";

const dir = join(__dirname);
const ed = JSON.parse(readFileSync(join(dir, "camisas-10.json"), "utf8"));
const indice: Record<string, string> = JSON.parse(
  readFileSync(join(dir, "avatars", "_index.json"), "utf8"),
);

describe("seed camisas-10", () => {
  it("tem 4 potes cheios", () => {
    expect(ed.competitors).toHaveLength(ed.group_count * 4);
    for (let pot = 1; pot <= 4; pot++) {
      expect(ed.competitors.filter((c: any) => c.pot === pot)).toHaveLength(ed.pot_size);
    }
  });

  it("não repete nome", () => {
    const nomes = ed.competitors.map((c: any) => c.name);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it("todo competidor tem os dois atributos preenchidos", () => {
    const vazios = ed.competitors.filter((c: any) => !c.attr_a || !c.attr_b);
    expect(vazios.map((c: any) => c.name)).toEqual([]);
  });

  it("respeita os tetos que o sorteio exige", () => {
    const porClube: Record<string, number> = {};
    for (const c of ed.competitors) porClube[c.attr_a] = (porClube[c.attr_a] ?? 0) + 1;
    // nenhum valor do atributo 1 pode passar do número de grupos
    expect(Math.max(...Object.values(porClube))).toBeLessThanOrEqual(ed.group_count);
    // a regra do atributo 2 precisa de ao menos 3 valores distintos
    expect(new Set(ed.competitors.map((c: any) => c.attr_b)).size).toBeGreaterThanOrEqual(3);
  });

  it("sorteia com as duas regras", () => {
    const pool: Competitor[] = ed.competitors.map((c: any, i: number) => ({
      id: `s${i}`, pot: c.pot, name: c.name,
      attrA: c.attr_a, attrB: c.attr_b, imagePath: null,
    }));
    const cfg: EditionConfig = {
      groupCount: ed.group_count, potSize: ed.pot_size,
      ruleA: ed.rule_a, ruleB: ed.rule_b,
    };
    for (let t = 0; t < 50; t++) {
      const r = solveDraw(pool, cfg);
      expect(r.rulesApplied).toEqual({ ruleA: true, ruleB: true });
    }
  });

  it("todo arquivo do índice existe e é leve", () => {
    for (const [nome, arq] of Object.entries(indice)) {
      const p = join(dir, "avatars", arq);
      expect(existsSync(p), `${nome} → ${arq} não existe`).toBe(true);
      // avatar pesado atrasa o overlay no OBS; 320px em WebP fica bem abaixo disto
      expect(statSync(p).size, `${arq} está grande demais`).toBeLessThan(60_000);
    }
  });

  it("não sobra avatar de quem saiu do elenco", () => {
    const nomes = new Set(ed.competitors.map((c: any) => c.name));
    const orfaos = Object.keys(indice).filter((n) => !nomes.has(n));
    expect(orfaos, "avatares sem dono no elenco").toEqual([]);
  });

  it("o índice cobre os arquivos que estão na pasta", () => {
    const naPasta = readdirSync(join(dir, "avatars"))
      .filter((f) => f.endsWith(".webp"));
    const noIndice = new Set(Object.values(indice));
    expect(naPasta.filter((f) => !noIndice.has(f)), "arquivo fora do índice").toEqual([]);
  });
});
