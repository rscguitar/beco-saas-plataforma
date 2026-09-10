import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Copa do Mundo das Coisas",
  description: "Sorteio, tabela e arte de transmissão do programa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
