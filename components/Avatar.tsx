"use client";

import type { Competitor } from "@/lib/engine/types";

/** Paleta da marca: cor derivada do nome, nunca a roda de matiz inteira. */
const CHIPS = [
  { bg: "#3FE04E", fg: "#04280F" }, { bg: "#FF7A1F", fg: "#1E0C01" },
  { bg: "#0C7A33", fg: "#EAFBED" }, { bg: "#C25207", fg: "#FFF2E6" },
  { bg: "#8CE89A", fg: "#04280F" }, { bg: "#FFB067", fg: "#2A1102" },
  { bg: "#136B2C", fg: "#DFF6E4" }, { bg: "#E8801C", fg: "#22150A" },
];

function chip(nome: string) {
  let h = 0;
  for (const ch of nome) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CHIPS[h % CHIPS.length];
}

function iniciais(nome: string) {
  const w = nome.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[w.length - 1][0]).toUpperCase();
}

/** Sem imagem não fica buraco: monograma na paleta, com a cor do próprio nome. */
export function Avatar({ competitor, size }: { competitor: Competitor; size: number }) {
  const url = competitor.imagePath;
  const c = chip(competitor.name);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" width={size} height={size}
        className="rounded object-cover" style={{ width: size, height: size, border: "2px solid #E8801C" }} />
    );
  }
  return (
    <span
      className="grid place-items-center rounded font-extrabold"
      style={{ width: size, height: size, background: c.bg, color: c.fg, fontSize: Math.round(size * 0.36), border: "2px solid #E8801C" }}
    >
      {iniciais(competitor.name)}
    </span>
  );
}
