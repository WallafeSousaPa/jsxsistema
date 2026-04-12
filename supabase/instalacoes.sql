-- Instalações, responsáveis e campos dinâmicos (espelha o modelo de vistorias).
-- Execute no SQL Editor do Supabase após clientes.sql e usuarios.sql.

create table if not exists public.instalacoes (
  id uuid primary key default gen_random_uuid(),
  cpf_cliente text not null references public.clientes(cpf) on delete restrict,
  id_usuario uuid not null references public.usuarios(id) on delete restrict,
  data_criacao timestamptz not null default now(),
  status text not null default 'Novo' check (status in ('Novo', 'Em andamento', 'Concluído', 'Cancelado'))
);

create table if not exists public.instalacao_responsaveis (
  instalacao_id uuid not null references public.instalacoes(id) on delete cascade,
  id_usuario uuid not null references public.usuarios(id) on delete cascade,
  primary key (instalacao_id, id_usuario)
);

create table if not exists public.instalacao_campos (
  id bigint generated always as identity primary key,
  chave text not null unique,
  nome_campo text not null,
  tipo_campo text not null default 'texto' check (tipo_campo in ('foto', 'texto', 'numero')),
  permitir_fotos boolean not null default false,
  permite_multiplas_fotos boolean not null default false,
  ordem int not null default 0,
  grupo text not null default 'Outros'
);

create table if not exists public.instalacao_campo_valores (
  instalacao_id uuid not null references public.instalacoes(id) on delete cascade,
  campo_id bigint not null references public.instalacao_campos(id) on delete restrict,
  valor_texto text null,
  link_foto text null,
  primary key (instalacao_id, campo_id)
);

create index if not exists idx_instalacoes_cpf_cliente on public.instalacoes(cpf_cliente);
create index if not exists idx_instalacoes_id_usuario on public.instalacoes(id_usuario);
create index if not exists idx_instalacao_responsaveis_instalacao on public.instalacao_responsaveis(instalacao_id);
create index if not exists idx_instalacao_campo_valores_campo on public.instalacao_campo_valores(campo_id);
