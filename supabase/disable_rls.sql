-- Desativa Row Level Security (RLS) em todas as tabelas do projeto.
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/_/sql
-- Assim nenhuma política será aplicada e o acesso usa apenas as permissões GRANT do banco.

-- Tabelas do schema public
alter table if exists public.usuarios disable row level security;
alter table if exists public.clientes disable row level security;
alter table if exists public.kit_solar disable row level security;
alter table if exists public.vistorias disable row level security;
alter table if exists public.vistoria_responsaveis disable row level security;

-- Storage (tabela de objetos do bucket)
alter table if exists storage.objects disable row level security;
