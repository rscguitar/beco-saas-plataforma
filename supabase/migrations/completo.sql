-- ===================================================================
-- Copa do Mundo das Coisas — estrutura completa
-- Cole ISTO INTEIRO no SQL Editor do Supabase e execute uma vez.
-- (É a junção de 0001_init.sql e 0002_storage.sql, na ordem certa.)
-- ===================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- edições
create table editions (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null default 'Copa do Mundo das Coisas',
  subtitle     text not null default '',
  label_a      text not null default 'Categoria',   -- rótulo do atributo 1
  label_b      text not null default 'Época',       -- rótulo do atributo 2
  group_count  int  not null default 8 check (group_count between 2 and 12),
  pot_size     int  not null default 8,
  rule_a       boolean not null default true,       -- um por atributo 1 no grupo
  rule_b       boolean not null default true,       -- 3+ valores do atributo 2
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------- competidores
create table competitors (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references editions(id) on delete cascade,
  pot         int  not null check (pot between 1 and 4),
  name        text not null,
  attr_a      text not null default '',
  attr_b      text not null default '',
  image_path  text,                                  -- caminho no Storage
  position    int  not null default 0,               -- ordem dentro do pote
  unique (edition_id, pot, position)
);
create index on competitors (edition_id);

-- --------------------------------------------------------------- sorteios
-- A solução inteira é resolvida antes da primeira bola e guardada aqui;
-- revealed_count controla quantas já foram mostradas no ar.
create table draws (
  id             uuid primary key default gen_random_uuid(),
  edition_id     uuid not null references editions(id) on delete cascade,
  slots          jsonb not null,                     -- [{competitorId, group}]
  revealed_count int not null default 0 check (revealed_count >= 0),
  rules_applied  jsonb not null default '{}'::jsonb, -- regras que couberam
  created_at     timestamptz not null default now()
);
create index on draws (edition_id, created_at desc);

-- ---------------------------------------------------------------- partidas
create table matches (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references editions(id) on delete cascade,
  stage       text not null check (stage in ('group','r16','qf','sf','final','third')),
  group_index int,                                   -- 0..7, só na fase de grupos
  round_index int not null,                          -- rodada, ou índice do confronto
  home_id     uuid references competitors(id) on delete set null,
  away_id     uuid references competitors(id) on delete set null,
  home_score  int check (home_score between 0 and 99),
  away_score  int check (away_score between 0 and 99),
  home_pens   int check (home_pens between 0 and 99),
  away_pens   int check (away_pens between 0 and 99),
  updated_at  timestamptz not null default now(),
  unique (edition_id, stage, group_index, round_index),
  constraint grupo_tem_indice check (
    (stage = 'group' and group_index is not null) or
    (stage <> 'group' and group_index is null)
  )
);
create index on matches (edition_id, stage);

-- ------------------------------------------------- o que está no ar agora
-- Uma linha por edição. O painel escreve, o overlay escuta por Realtime.
create table broadcast_state (
  edition_id uuid primary key references editions(id) on delete cascade,
  view       text not null default 'tables' check (view in ('tables','match','bracket')),
  match_id   uuid references matches(id) on delete set null,
  frames     jsonb not null default '{}'::jsonb,     -- molduras por arte
  background text not null default 'verde',
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------ classificação (view)
-- Em SQL, não em código: um só lugar para os critérios de desempate.
create view group_standings as
with jogos as (
  select edition_id, group_index, home_id as cid, home_score as gp, away_score as gc from matches
   where stage = 'group' and home_score is not null and away_score is not null
  union all
  select edition_id, group_index, away_id as cid, away_score as gp, home_score as gc from matches
   where stage = 'group' and home_score is not null and away_score is not null
)
select
  c.edition_id,
  c.id as competitor_id,
  c.name,
  count(j.cid)::int                                              as played,
  coalesce(sum((j.gp > j.gc)::int), 0)::int                       as won,
  coalesce(sum((j.gp = j.gc)::int), 0)::int                       as drawn,
  coalesce(sum((j.gp < j.gc)::int), 0)::int                       as lost,
  coalesce(sum(j.gp), 0)::int                                     as goals_for,
  coalesce(sum(j.gc), 0)::int                                     as goals_against,
  coalesce(sum(j.gp - j.gc), 0)::int                              as goal_diff,
  coalesce(sum((j.gp > j.gc)::int * 3 + (j.gp = j.gc)::int), 0)::int as points
from competitors c
left join jogos j on j.cid = c.id
group by c.edition_id, c.id, c.name;

-- --------------------------------------------------------------------- RLS
-- Nesta fatia tudo é público: o overlay precisa ler sem login e ainda não há
-- autenticação. A escrita fecha na próxima fatia, junto com o Auth.
alter table editions        enable row level security;
alter table competitors     enable row level security;
alter table draws           enable row level security;
alter table matches         enable row level security;
alter table broadcast_state enable row level security;

create policy leitura_publica on editions        for select using (true);
create policy leitura_publica on competitors     for select using (true);
create policy leitura_publica on draws           for select using (true);
create policy leitura_publica on matches         for select using (true);
create policy leitura_publica on broadcast_state for select using (true);

create policy escrita_aberta on editions        for all using (true) with check (true);
create policy escrita_aberta on competitors     for all using (true) with check (true);
create policy escrita_aberta on draws           for all using (true) with check (true);
create policy escrita_aberta on matches         for all using (true) with check (true);
create policy escrita_aberta on broadcast_state for all using (true) with check (true);

-- Realtime: o overlay reage a estas duas tabelas
alter publication supabase_realtime add table broadcast_state;
alter publication supabase_realtime add table draws;
-- Bucket dos avatares.
-- Público na leitura: o overlay do OBS precisa carregar as imagens sem login,
-- e o navegador do OBS não carrega nada de host externo autenticado.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars: leitura pública"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Escrita aberta nesta fatia, como no resto do banco. Fecha junto com o Auth.
create policy "avatars: escrita aberta"
  on storage.objects for insert
  with check (bucket_id = 'avatars');

create policy "avatars: sobrescrita aberta"
  on storage.objects for update
  using (bucket_id = 'avatars');
