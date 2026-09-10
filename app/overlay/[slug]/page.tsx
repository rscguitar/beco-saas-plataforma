"use client";

import { use, useEffect, useMemo } from "react";
import { useEdition } from "@/lib/useEdition";
import { Stage, FRAMES } from "@/components/Stage";
import { GroupTables } from "@/components/GroupTables";
import type { Competitor } from "@/lib/engine/types";

/**
 * Camada de transmissão. Vai no OBS como Browser Source em 1920×1080.
 * Não tem controle nenhum: só desenha o que o painel mandou.
 */
export default function Overlay({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { loading, error, edition, competitors, draw, broadcast } = useEdition(slug);

  useEffect(() => {
    document.body.classList.add("overlay");
    return () => document.body.classList.remove("overlay");
  }, []);

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

  // Erro nunca aparece no ar: se algo falhar, a camada some em vez de
  // mostrar mensagem vermelha por cima da gravação.
  if (loading || error || !edition) return <div className="h-screen w-screen" />;

  const view = broadcast?.view ?? "tables";
  const frame = view === "match" ? FRAMES.painel : FRAMES.conteudo;

  return (
    <div className="h-screen w-screen">
      <Stage frame={frame} transparent>
        {view === "tables" ? (
          <GroupTables groups={grupos} columns={4} />
        ) : (
          <div className="grid place-items-center text-[34px] font-bold uppercase text-white/60">
            {view === "match" ? "Confronto" : "Chaveamento"} — próxima fatia
          </div>
        )}
      </Stage>
    </div>
  );
}
