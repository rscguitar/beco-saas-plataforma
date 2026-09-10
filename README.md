# Copa do Mundo das Coisas

Sorteio, tabela e arte de transmissão do programa. Duas telas, um estado
compartilhado: o **painel** conduz, a **camada de transmissão** desenha.

```
/controle/[slug]   painel do operador — sorteia e escolhe o que vai ao ar
/overlay/[slug]    camada para o OBS — 1920×1080, fundo transparente
```

O painel escreve em `broadcast_state`; o overlay assina Realtime e reage.
Latência típica na casa de 100 ms — imperceptível no ar.

## Colocar no ar

### 1. Supabase

Crie um projeto em [supabase.com](https://supabase.com), abra **SQL Editor** e
execute `supabase/migrations/0001_init.sql`.

Depois, em **Project Settings → API**, copie a URL do projeto e a chave `anon`.

> A chave `anon` é pública por design e pode ir para o navegador.
> A `service_role` **não** — ela não é usada em lugar nenhum deste código.

### 2. Local

```bash
cp .env.example .env.local   # preencha com a URL e a chave anon
npm install
npm run dev
```

### 3. Vercel

Importe o repositório, cole `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY` nas variáveis de ambiente e publique.

### 4. OBS

Adicione uma **Fonte de Navegador** apontando para
`https://SEU-DOMINIO/overlay/camisas-10`, com largura 1920 e altura 1080.
Marque *"Desligar a fonte quando não estiver visível"* como **desmarcado**,
para a camada não recarregar a cada troca de cena.

## Como o sorteio funciona

A chave inteira é resolvida **antes da primeira bola**, por backtracking com
reinícios aleatórios, e só então revelada bola a bola. Um sorteio ingênuo
trava: chega um momento em que a última bola só tem grupos que já contêm
alguém do mesmo atributo. Resolver antes mantém o sorteio genuinamente
aleatório sem nunca chegar a um beco sem saída.

Duas regras, ambas opcionais por edição:

- **Atributo 1** — um por grupo (ex.: um clube por grupo)
- **Atributo 2** — no mínimo três valores distintos por grupo

Se a lista não permitir as duas, o motor afrouxa na ordem `ruleB → ruleA` e
informa em `rules_applied` o que de fato coube.

## Mata-mata

Padrão clássico de 16: o primeiro de cada grupo enfrenta o segundo do grupo
vizinho — `1A×2B`, `1C×2D`, `1E×2F`, `1G×2H` na metade de cima; `1B×2A`,
`1D×2C`, `1F×2E`, `1H×2G` na de baixo. Dois classificados do mesmo grupo caem
em metades opostas e só podem se reencontrar na final.

## Testes

```bash
npm test
```

Cobrem o que quebra em silêncio: 300 execuções do sorteio verificando as duas
regras, o afrouxamento quando a lista não permite, os critérios de desempate,
o pareamento clássico das oitavas e a resolução por pênaltis.

## Estrutura

```
lib/engine/     motor puro, sem React nem rede — é o que os testes cobrem
lib/supabase.ts cliente; erro claro quando falta configuração
lib/useEdition  carrega a edição e mantém Realtime
components/     Stage (palco 1920×1080), GroupTables, Avatar
supabase/       migração: 5 tabelas, view de classificação, RLS
```

## Estado atual

Esta é a fatia mínima: sorteio ponta a ponta com overlay ao vivo.
Ainda não tem tabela de grupos, mata-mata, campeão nem upload de imagens —
e **a escrita no banco está aberta**, sem autenticação. Fechar isso é a
próxima fatia, junto com o Supabase Auth.
