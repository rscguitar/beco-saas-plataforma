"use client";

import { use, useMemo, useState } from "react";
import { useEdition } from "@/lib/useEdition";
import { supabase } from "@/lib/supabase";
import { solveDraw, DrawError } from "@/lib/engine/draw";
import { Stage, FRAMES } from "@/components/Stage";
import { GroupTables } from "@/components/GroupTables";
import type { Competitor } from "@/lib/engine/types";

export default function Controle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { loading, error, edition, competitors, draw, broadcast, recarregar } = useEdition(slug);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");

  const grupos = useMemo<Competitor[][]>(() => {
    const n = edition?.group_count ?? 8;
    const g: Competitor[][] = Array.from({ length: n }, () => []);
    if (!draw) return g;
    const byId = new Map(competitors.map((c) => [c.id, c]));
    for (const s of draw.slots.slice(0, draw.revealed_count)) {
      const c = byId.get(s.competitorId);
      if (c) g[s.group].push(c);
    }
    return g;
  }, [draw, competitors, edition]);

  async function sortear() {
    if (!edition) return;
    setOcupado(true); setAviso("");
    try {
      const r = solveDraw(competitors, {
        groupCount: edition.group_count, potSize: edition.pot_size,
        ruleA: edition.rule_a, ruleB: edition.rule_b,
      });
      if (!r.rulesApplied.ruleB && edition.rule_b) {
        setAviso(`A regra de "${edition.label_b}" não fecha com esta lista — a chave saiu sem ela.`);
      }
      await supabase().from("draws").insert({
        edition_id: edition.id, slots: r.slots,
        revealed_count: 0, rules_applied: r.rulesApplied,
      });
      await recarregar();
    } catch (e) {
      setAviso(e instanceof DrawError ? e.message : (e as Error).message);
    } finally { setOcupado(false); }
  }

  async function revelar(quantas: number) {
    if (!draw) return;
    const alvo = Math.min(draw.slots.length, draw.revealed_count + quantas);
    setOcupado(true);
    await supabase().from("draws").update({ revealed_count: alvo }).eq("id", draw.id);
    await recarregar();
    setOcupado(false);
  }

  async function porNoAr(view: "tables" | "match" | "bracket") {
    if (!edition) return;
    await supabase().from("broadcast_state")
      .upsert({ edition_id: edition.id, view, updated_at: new Date().toISOString() });
  }

  if (loading) return <Aviso texto="Carregando…" />;
  if (error)   return <Aviso texto={error} />;
  if (!edition) return <Aviso texto="Edição não encontrada." />;

  const revelado = draw?.revealed_count ?? 0;
  const total = competitors.length;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[--color-apagado]">
        {edition.subtitle || "Painel de controle"}
      </p>
      <h1 className="mt-1 text-3xl font-extrabold uppercase">{edition.title}</h1>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Botao onClick={sortear} disabled={ocupado} destaque>Novo sorteio</Botao>
        <Botao onClick={() => revelar(1)} disabled={ocupado || !draw || revelado >= total}>
          Revelar bola
        </Botao>
        <Botao onClick={() => revelar(total)} disabled={ocupado || !draw || revelado >= total}>
          Revelar tudo
        </Botao>
        <span className="ml-2 font-mono text-[12px] tabular-nums text-[--color-apagado]">
          {revelado} / {total}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[--color-apagado]">No ar:</span>
        {(["tables", "match", "bracket"] as const).map((v) => (
          <Botao key={v} onClick={() => porNoAr(v)} ativo={(broadcast?.view ?? "tables") === v}>
            {v === "tables" ? "Tabela" : v === "match" ? "Confronto" : "Chaveamento"}
          </Botao>
        ))}
      </div>

      {aviso && (
        <p className="mt-4 border-l-2 border-[--color-laranja] pl-3 font-mono text-[12px] text-[--color-laranja]">
          {aviso}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] uppercase tracking-wider text-[--color-apagado]">
        Prévia — o que o OBS está mostrando
      </p>
      <div className="mt-2 aspect-video w-full overflow-hidden rounded border border-[--color-linha] bg-black">
        <Stage frame={FRAMES.conteudo}>
          <GroupTables groups={grupos} columns={4} />
        </Stage>
      </div>
    </main>
  );
}

function Botao({
  children, onClick, disabled, destaque, ativo,
}: {
  children: React.ReactNode; onClick: () => void;
  disabled?: boolean; destaque?: boolean; ativo?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded border px-3.5 py-2 text-[13px] font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-40",
        destaque || ativo
          ? "border-[--color-laranja] bg-[--color-laranja] text-[#1e0c01]"
          : "border-[--color-linha] bg-[--color-superf] hover:border-[--color-tinta-2]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <p className="font-mono text-sm leading-relaxed text-[--color-tinta-2]">{texto}</p>
    </main>
  );
}
