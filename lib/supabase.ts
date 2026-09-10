import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Falta de configuração vira erro claro, não tela branca sem explicação. */
export function supabase() {
  if (!url || !key) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copie .env.example para .env.local e preencha com os dados do painel do Supabase.",
    );
  }
  return createClient(url, key);
}

export const isConfigured = () => Boolean(url && key);
