-- Tabela de vistorias e responsáveis
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/_/sql
-- Crie o bucket "Fotos_vistoria" em Storage (Dashboard > Storage > New bucket) para as fotos.

-- Tabela vistorias
create table if not exists public.vistorias (
  id uuid primary key default gen_random_uuid(),
  cpf_cliente text not null references public.clientes(cpf) on delete restrict,
  id_usuario uuid not null references public.usuarios(id) on delete restrict,
  data_criacao timestamptz not null default now(),
  status text not null default 'Novo' check (status in ('Novo', 'Em andamento', 'Aprovado', 'Aprovado com obra', 'Cancelado')),
  tipo_padrao text check (tipo_padrao in ('monofásico', 'bifásico', 'trifásico')),
  onde_ligado_inversor text,
  percurso_cabo_inversor text,
  qtd_eletrodutos_inversor_cc int,
  qtd_eletrodutos_inversor_ca int,
  qtd_conduletes_inversor int,
  qtd_eletrodutos_padrao int,
  metragem_total_cabos_padrao numeric,
  link_foto_fachada text,
  link_foto_padrao_entrada text,
  link_foto_disjuntor_padrao text,
  link_foto_poste_mais_proximo text,
  link_foto_ramal_entrada text,
  link_foto_local_inversor text,
  link_foto_aterramento text,
  link_foto_estrutura_telhado text,
  link_foto_telhado text,
  link_foto_print_mapa text,
  observacao text
);

-- Tabela de responsáveis por vistoria (N:N)
create table if not exists public.vistoria_responsaveis (
  vistoria_id uuid not null references public.vistorias(id) on delete cascade,
  id_usuario uuid not null references public.usuarios(id) on delete cascade,
  primary key (vistoria_id, id_usuario)
);

-- RLS desativado: execute disable_rls.sql no Supabase.

-- Índices
create index if not exists idx_vistorias_cpf_cliente on public.vistorias(cpf_cliente);
create index if not exists idx_vistorias_id_usuario on public.vistorias(id_usuario);
create index if not exists idx_vistorias_status on public.vistorias(status);
create index if not exists idx_vistoria_responsaveis_vistoria on public.vistoria_responsaveis(vistoria_id);
