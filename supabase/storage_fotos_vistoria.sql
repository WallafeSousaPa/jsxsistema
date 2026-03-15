-- Bucket para fotos da vistoria
-- Execute no SQL Editor do Supabase.
-- RLS está desativado: execute disable_rls.sql para que o upload funcione sem políticas.

-- Criar bucket público (leitura pública para os links das fotos)
insert into storage.buckets (id, name, public)
values ('Fotos_vistoria', 'Fotos_vistoria', true)
on conflict (id) do update set public = true;
