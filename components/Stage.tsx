"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Frame = { l: number; r: number; t: number; b: number };

/** Molduras medidas sobre o layout real do programa, em coordenadas de 1920×1080. */
export const FRAMES: Record<string, Frame> = {
  conteudo: { l: 353, r: 31, t: 315, b: 92 },
  tira:     { l: 353, r: 31, t: 762, b: 92 },
  painel:   { l: 353, r: 31, t: 382, b: 336 },
};

/**
 * Palco fixo de 1920×1080 que escala para caber onde estiver.
 *
 * Não é layout fluido de propósito: o que o operador vê montando é o mesmo
 * que entra na timeline, pixel a pixel, em qualquer monitor.
 */
export function Stage({
  frame, children, transparent = false,
}: { frame: Frame; children: ReactNode; transparent?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    const alvo = box.current;
    if (!alvo) return;
    const ajustar = () => {
      const r = alvo.getBoundingClientRect();
      if (r.width && r.height) setEscala(Math.min(r.width / 1920, r.height / 1080));
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(alvo);
    window.addEventListener("resize", ajustar);
    return () => { ro.disconnect(); window.removeEventListener("resize", ajustar); };
  }, []);

  return (
    <div ref={box} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left"
        style={{ transform: `translate(${(1 - escala) * 0}px,0) scale(${escala})` }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: transparent
              ? "transparent"
              : "radial-gradient(ellipse 70% 60% at 52% 38%, #0F7434 0%, #0A5426 42%, #063A1B 72%, #04280F 100%)",
          }}
        >
          <div
            className="absolute flex flex-col justify-center gap-5"
            style={{ left: frame.l, right: frame.r, top: frame.t, bottom: frame.b }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
