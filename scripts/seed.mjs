#!/usr/bin/env node
/**
 * Popula uma edição: sobe os avatares para o Storage e grava elenco e
 * configuração no banco. Idempotente — rodar de novo atualiza no lugar.
 *
 *   export $(grep -v '^#' .env.local | xargs)
 *   node scripts/seed.mjs seed/camisas-10.json
 *
 * Usa a chave anon, que basta enquanto a escrita está aberta. Quando o Auth
 * entrar, este script passa a precisar de uma sessão autenticada.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  console.error("Rode:  export $(grep -v '^#' .env.local | xargs) && node scripts/seed.mjs seed/camisas-10.json");
  process.exit(1);
}

const arquivo = process.argv[2];
if (!arquivo || !existsSync(arquivo)) {
  console.error("Uso: node scripts/seed.mjs <edição.json>");
  process.exit(1);
}

const db = createClient(URL, KEY);
const ed = JSON.parse(readFileSync(arquivo, "utf8"));
const pasta = join(dirname(arquivo), "avatars");
const indice = existsSync(join(pasta, "_index.json"))
  ? JSON.parse(readFileSync(join(pasta, "_index.json"), "utf8"))
  : {};

const TIPOS = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

async function subirAvatar(nome) {
  const arq = indice[nome];
  if (!arq) return null;
  const origem = join(pasta, arq);
  if (!existsSync(origem)) return null;

  const destino = `${ed.slug}/${arq}`;
  const ext = arq.split(".").pop().toLowerCase();
  const { error } = await db.storage
    .from("avatars")
    .upload(destino, readFileSync(origem), {
      contentType: TIPOS[ext] ?? "application/octet-stream",
      upsert: true,
    });
  if (error) {
    console.warn(`  ! ${nome}: ${error.message}`);
    return null;
  }
  return db.storage.from("avatars").getPublicUrl(destino).data.publicUrl;
}

console.log(`Edição "${ed.slug}" — ${ed.competitors.length} competidores`);

const { data: edicao, error: e1 } = await db
  .from("editions")
  .upsert(
    {
      slug: ed.slug, title: ed.title, subtitle: ed.subtitle,
      label_a: ed.label_a, label_b: ed.label_b,
      group_count: ed.group_count, pot_size: ed.pot_size,
      rule_a: ed.rule_a, rule_b: ed.rule_b,
    },
    { onConflict: "slug" },
  )
  .select()
  .single();
if (e1) { console.error("Falhou ao gravar a edição:", e1.message); process.exit(1); }

console.log("Subindo avatares…");
const urls = {};
const semFoto = [];
for (const c of ed.competitors) {
  const url = await subirAvatar(c.name);
  if (url) urls[c.name] = url;
  else semFoto.push(c.name);
}

// Troca o conjunto inteiro para não deixar sobra de uma execução anterior.
await db.from("competitors").delete().eq("edition_id", edicao.id);
const posicao = {};
const linhas = ed.competitors.map((c) => {
  posicao[c.pot] = (posicao[c.pot] ?? -1) + 1;
  return {
    edition_id: edicao.id, pot: c.pot, name: c.name,
    attr_a: c.attr_a, attr_b: c.attr_b,
    image_path: urls[c.name] ?? null, position: posicao[c.pot],
  };
});
const { error: e2 } = await db.from("competitors").insert(linhas);
if (e2) { console.error("Falhou ao gravar o elenco:", e2.message); process.exit(1); }

await db.from("broadcast_state").upsert({ edition_id: edicao.id, view: "tables" });

console.log("\nPronto.");
console.log(`  elenco gravado: ${linhas.length}`);
console.log(`  com avatar: ${Object.keys(urls).length}`);
if (semFoto.length) {
  console.log(`  sem avatar: ${semFoto.join(", ")}`);
  console.log(`  → ponha o arquivo em ${pasta}/ e registre o nome no _index.json`);
}
console.log(`\n  painel:  /controle/${ed.slug}`);
console.log(`  overlay: /overlay/${ed.slug}`);
