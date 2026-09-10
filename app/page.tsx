import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[--color-apagado]">
        Copa do Mundo das Coisas
      </p>
      <h1 className="mt-2 text-4xl font-extrabold uppercase tracking-tight">
        Duas telas, um estado
      </h1>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-[--color-tinta-2]">
        O painel conduz o sorteio; a camada de transmissão desenha o que está no ar e
        reage em tempo real. Ponha o overlay como Browser Source do OBS em 1920×1080.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/controle/camisas-10" className="rounded border border-[--color-linha] bg-[--color-superf] p-4 hover:border-[--color-laranja]">
          <span className="block font-semibold">Painel de controle</span>
          <span className="mt-1 block font-mono text-[11px] text-[--color-apagado]">/controle/camisas-10</span>
        </Link>
        <Link href="/overlay/camisas-10" className="rounded border border-[--color-linha] bg-[--color-superf] p-4 hover:border-[--color-laranja]">
          <span className="block font-semibold">Camada de transmissão</span>
          <span className="mt-1 block font-mono text-[11px] text-[--color-apagado]">/overlay/camisas-10</span>
        </Link>
      </div>
    </main>
  );
}
