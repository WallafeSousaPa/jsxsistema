-- Tabela de usuários do sistema (login controlado pelo código)
-- Execute no SQL Editor do seu projeto Supabase: https://supabase.com/dashboard/project/_/sql

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  senha_hash text not null,
  nome text,
  tipo_usuario text check (tipo_usuario in ('Vistoriador', 'Instalador', 'Administrativo', 'Administrador')),
  criado_em timestamptz default now()
);

-- RLS desativado: execute disable_rls.sql no Supabase para garantir que nenhuma política está ativa.

-- Exemplo: inserir um usuário de teste (senha: 123456)
-- A senha deve ser gravada como hash. No primeiro login você pode usar o sistema
-- para gerar o hash e depois inserir manualmente, ou criar uma tela de cadastro.
-- Hash SHA-256 de '123456' (hex): 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
insert into public.usuarios (email, senha_hash, nome)
values (
  'admin@jsxsistema.com',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'Administrador'
)
on conflict (email) do nothing;
