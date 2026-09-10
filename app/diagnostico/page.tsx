"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Check = { nome: string; ok: boolean; detalhe: string; conserto?: string };

/**
 * Diz o que falta na configuração, em vez de deixar tela branca.
 * As verificações são encadeadas: sem conexão não adianta olhar tabela.
 */
export default function Diagnostico() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [rodando, setRodando] = useState(true);

  useEffect(() => {
    void (async () => {
      const out: Check[] = [];
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      out.push({
        nome: "Variáveis de ambiente",
        ok: Boolean(url && key),
        detalhe: url ? `${url.replace(/^https:\/\//, "").slice(0, 30)}…` : "não encontradas",
        conserto:
          "Vercel: Settings → Environment Variables (e publique de novo depois de alterar). " +
          "Local: copie .env.example para .env.local.",
      });
      if (!url || !key) { setChecks(out); setRodando(false); return; }

      const db = createClient(url, key);

      const tabelas = ["editions", "competitors", "draws", "matches", "broadcast_state"];
      const faltando: string[] = [];
      let conectou = true;
      for (const t of tabelas) {
        const { error } = await db.from(t).select("*", { head: true, count: "exact" }).limit(1);
        if (error) {
          if (/fetch|network|failed/i.test(error.message)) { conectou = false; break; }
          faltando.push(t);
        }
      }

      out.push({
        nome: "Conexão com o Supabase",
        ok: conectou,
        detalhe: conectou ? "respondeu" : "sem resposta",
        conserto: "Confira se a URL está inteira (https://xxxx.supabase.co) e se o projeto não está pausado.",
      });
      if (!conectou) { setChecks(out); setRodando(false); return; }

      out.push({
        nome: "Tabelas",
        ok: faltando.length === 0,
        detalhe: faltando.length ? `faltam ${faltando.join(", ")}` : `as ${tabelas.length} existem`,
        conserto: "Cole supabase/migrations/completo.sql no SQL Editor e execute.",
      });

      const { error: eView } = await db.from("group_standings").select("*", { head: true }).limit(1);
      out.push({
        nome: "View de classificação",
        ok: !eView,
        detalhe: eView ? eView.message.slice(0, 44) : "group_standings responde",
        conserto: "Faz parte do completo.sql — reexecute se faltar.",
      });

      const { data: buckets, error: eBucket } = await db.storage.listBuckets();
      const avatars = buckets?.find((b) => b.id === "avatars");
      out.push({
        nome: "Bucket de avatares",
        ok: Boolean(avatars?.public),
        detalhe: avatars
          ? avatars.public ? "existe e é público" : "existe, mas NÃO é público"
          : (eBucket?.message ?? "não encontrado").slice(0, 44),
        conserto:
          "Precisa ser público — o navegador do OBS não carrega imagem autenticada. " +
          "Storage → avatars → Settings → Public bucket.",
      });

      const { data: ed } = await db.from("editions").select("*").eq("slug", "camisas-10").maybeSingle();
      out.push({
        nome: 'Edição "camisas-10"',
        ok: Boolean(ed),
        detalhe: ed ? `${ed.title}` : "não existe ainda",
        conserto: "node scripts/seed.mjs seed/camisas-10.json",
      });

      if (ed) {
        const { data: comps } = await db.from("competitors").select("pot,image_path").eq("edition_id", ed.id);
        const total = comps?.length ?? 0;
        const comFoto = comps?.filter((c) => c.image_path).length ?? 0;
        const potes = [1, 2, 3, 4].map((p) => comps?.filter((c) => c.pot === p).length ?? 0);
        out.push({
          nome: "Elenco",
          ok: total === 32 && potes.every((n) => n === 8),
          detalhe: `${total} competidores · potes ${potes.join("/")} · ${comFoto} com foto`,
          conserto: "Rode o seed de novo — ele troca o conjunto inteiro.",
        });
      }

      setChecks(out);
      setRodando(false);
    })();
  }, []);

  const tudoOk = checks.length > 0 && checks.every((c) => c.ok);

  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[--color-apagado]">
        Copa do Mundo das Coisas
      </p>
      <h1 className="mt-1 text-3xl font-extrabold uppercase">Diagnóstico</h1>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-[--color-tinta-2]">
        Roda de cima para baixo e para na primeira falha que impede as seguintes.
        Cada item que falha mostra o conserto.
      </p>

      <div className="mt-8 grid gap-2">
        {checks.map((c) => (
          <div key={c.nome} className="rounded border border-[--color-linha] bg-[--color-superf] p-3.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span
                className="grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-bold"
                style={{ background: c.ok ? "#3FE04E" : "#FF7A1F", color: c.ok ? "#04280F" : "#1E0C01" }}
              >
                {c.ok ? "✓" : "!"}
              </span>
              <span className="font-semibold">{c.nome}</span>
              <span className="ml-auto font-mono text-[11px] text-[--color-apagado]">{c.detalhe}</span>
            </div>
            {!c.ok && c.conserto && (
              <p className="mt-2 border-l-2 border-[--color-laranja] pl-3 font-mono text-[11px] leading-relaxed text-[--color-tinta-2]">
                {c.conserto}
              </p>
            )}
          </div>
        ))}
        {rodando && <p className="font-mono text-[12px] text-[--color-apagado]">verificando…</p>}
        {tudoOk && (
          <p className="mt-2 font-mono text-[12px]" style={{ color: "#3FE04E" }}>
            Tudo pronto. Abra /controle/camisas-10 e ponha /overlay/camisas-10 no OBS.
          </p>
        )}
      </div>
    </main>
  );
}
