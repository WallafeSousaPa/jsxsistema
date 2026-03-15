-- Tabelas Clientes e Kit Solar
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/_/sql

-- Tabela clientes: chave única é o CPF; se não informado no cadastro, gera valor aleatório
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  cpf text unique not null default ('RND-' || gen_random_uuid()::text),
  nome text not null,
  telefone text,
  email text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  criado_em timestamptz default now()
);

-- Tabela kit_solar: vários registros por cliente (associado pelo CPF)
create table if not exists public.kit_solar (
  id uuid primary key default gen_random_uuid(),
  cpf_cliente text not null references public.clientes(cpf) on delete cascade,
  marca_inversor text,
  modelo_inversor text,
  quantidade_inversor int,
  marca_painel text,
  modelo_painel text,
  quantidade_painel int,
  criado_em timestamptz default now()
);

-- RLS desativado: execute disable_rls.sql no Supabase.

-- Índice para buscar cliente por CPF
create index if not exists idx_kit_solar_cpf_cliente on public.kit_solar(cpf_cliente);
