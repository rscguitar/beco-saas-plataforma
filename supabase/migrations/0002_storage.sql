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
