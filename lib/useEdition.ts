"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isConfigured } from "./supabase";
import type { Competitor } from "./engine/types";

export type Edition = {
  id: string; slug: string; title: string; subtitle: string;
  label_a: string; label_b: string;
  group_count: number; pot_size: number; rule_a: boolean; rule_b: boolean;
};

export type Draw = {
  id: string;
  slots: { competitorId: string; group: number }[];
  revealed_count: number;
  rules_applied: { ruleA?: boolean; ruleB?: boolean };
};

export type Broadcast = {
  edition_id: string;
  view: "tables" | "match" | "bracket";
  match_id: string | null;
  background: string;
};

type State = {
  loading: boolean;
  error: string | null;
  edition: Edition | null;
  competitors: Competitor[];
  draw: Draw | null;
  broadcast: Broadcast | null;
};

const VAZIO: State = {
  loading: true, error: null, edition: null, competitors: [], draw: null, broadcast: null,
};

/**
 * Carrega a edição e mantém sorteio e estado de transmissão sincronizados.
 *
 * O overlay depende disto para reagir ao painel. Se a conexão cair no meio da
 * gravação, o último estado recebido continua na tela em vez de sumir — a arte
 * congela, que é muito melhor do que apagar no ar.
 */
export function useEdition(slug: string) {
  const [state, setState] = useState<State>(VAZIO);
  const editionId = useRef<string | null>(null);

  const carregar = useCallback(async () => {
    if (!isConfigured()) {
      setState({ ...VAZIO, loading: false, error: "Supabase não configurado. Veja .env.example." });
      return;
    }
    try {
      const db = supabase();
      const { data: ed, error: e1 } = await db
        .from("editions").select("*").eq("slug", slug).maybeSingle();
      if (e1) throw e1;
      if (!ed) {
        setState({ ...VAZIO, loading: false, error: `Edição "${slug}" não existe ainda.` });
        return;
      }
      editionId.current = ed.id;

      const [{ data: comps }, { data: draws }, { data: bc }] = await Promise.all([
        db.from("competitors").select("*").eq("edition_id", ed.id)
          .order("pot").order("position"),
        db.from("draws").select("*").eq("edition_id", ed.id)
          .order("created_at", { ascending: false }).limit(1),
        db.from("broadcast_state").select("*").eq("edition_id", ed.id).maybeSingle(),
      ]);

      setState({
        loading: false, error: null, edition: ed as Edition,
        competitors: (comps ?? []).map((c) => ({
          id: c.id, pot: c.pot, name: c.name,
          attrA: c.attr_a, attrB: c.attr_b, imagePath: c.image_path,
        })),
        draw: (draws?.[0] as Draw) ?? null,
        broadcast: (bc as Broadcast) ?? null,
      });
    } catch (err) {
      setState({ ...VAZIO, loading: false, error: (err as Error).message });
    }
  }, [slug]);

  useEffect(() => { void carregar(); }, [carregar]);

  // Realtime: o overlay reage sem recarregar
  useEffect(() => {
    if (!isConfigured() || !state.edition) return;
    const db = supabase();
    const id = state.edition.id;
    const canal = db
      .channel(`edicao:${id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "broadcast_state", filter: `edition_id=eq.${id}` },
        (p) => setState((s) => ({ ...s, broadcast: (p.new as Broadcast) ?? s.broadcast })))
      .on("postgres_changes",
        { event: "*", schema: "public", table: "draws", filter: `edition_id=eq.${id}` },
        (p) => setState((s) => ({ ...s, draw: (p.new as Draw) ?? s.draw })))
      .subscribe();
    return () => { void db.removeChannel(canal); };
  }, [state.edition]);

  return { ...state, recarregar: carregar };
}
