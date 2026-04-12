-- Campos dinâmicos da vistoria e valores por vistoria.
-- Execute no SQL Editor do Supabase após vistorias.sql.

-- Definição dos campos (configurável no app)
create table if not exists public.vistoria_campos (
  id bigint generated always as identity primary key,
  chave text not null unique,
  nome_campo text not null,
  tipo_campo text not null default 'texto' check (tipo_campo in ('foto', 'texto', 'numero')),
  permitir_fotos boolean not null default false,
  permite_multiplas_fotos boolean not null default false,
  ordem int not null default 0,
  grupo text not null default 'Outros'
);

-- Valores por vistoria: texto quando permitir_fotos = false; link(s) quando true (várias URLs com ||| se multi)
create table if not exists public.vistoria_campo_valores (
  vistoria_id uuid not null references public.vistorias(id) on delete cascade,
  campo_id bigint not null references public.vistoria_campos(id) on delete restrict,
  valor_texto text null,
  link_foto text null,
  primary key (vistoria_id, campo_id)
);

create index if not exists idx_vistoria_campo_valores_campo on public.vistoria_campo_valores(campo_id);

-- Seed: todos os campos do modal Editar vistoria (ordem e grupos alinhados à UI anterior)
insert into public.vistoria_campos (chave, nome_campo, tipo_campo, permitir_fotos, permite_multiplas_fotos, ordem, grupo) values
  ('tipo_padrao', 'Tipo do padrão', 'texto', false, false, 10, 'Padrão e inversor'),
  ('onde_ligado_inversor', 'Onde será ligado o inversor', 'texto', false, false, 20, 'Padrão e inversor'),
  ('percurso_cabo_inversor', 'Percurso cabo inversor (m)', 'numero', false, false, 30, 'Padrão e inversor'),
  ('qtd_eletrodutos_inversor_cc', 'Qtd. eletrod. inv. CC', 'numero', false, false, 40, 'Eletrodutos e cabos'),
  ('qtd_eletrodutos_inversor_ca', 'Qtd. eletrod. inv. CA', 'numero', false, false, 50, 'Eletrodutos e cabos'),
  ('qtd_conduletes_inversor', 'Qtd. conduletes inv.', 'numero', false, false, 60, 'Eletrodutos e cabos'),
  ('qtd_eletrodutos_padrao', 'Qtd. eletrod. padrão', 'numero', false, false, 70, 'Eletrodutos e cabos'),
  ('metragem_total_cabos_padrao', 'Metragem total cabos padrão (m)', 'numero', false, false, 80, 'Eletrodutos e cabos'),
  ('link_foto_fachada', 'Foto fachada do local', 'foto', true, false, 100, 'Fotos'),
  ('link_foto_padrao_entrada', 'Foto padrão de entrada', 'foto', true, false, 110, 'Fotos'),
  ('link_foto_disjuntor_padrao', 'Foto disjuntor do padrão de entrada', 'foto', true, false, 120, 'Fotos'),
  ('link_foto_poste_mais_proximo', 'Foto do poste mais próximo', 'foto', true, false, 130, 'Fotos'),
  ('link_foto_ramal_entrada', 'Foto do ramal de entrada', 'foto', true, false, 140, 'Fotos'),
  ('link_foto_local_inversor', 'Foto do local do inversor', 'foto', true, false, 150, 'Fotos'),
  ('link_foto_aterramento', 'Foto do aterramento do sistema', 'foto', true, false, 160, 'Fotos'),
  ('link_foto_estrutura_telhado', 'Foto da estrutura do telhado', 'foto', true, true, 170, 'Fotos'),
  ('link_foto_telhado', 'Foto do telhado', 'foto', true, true, 180, 'Fotos'),
  ('link_foto_print_mapa', 'Foto do print do mapa', 'foto', true, false, 190, 'Fotos'),
  ('link_foto_croqui', 'Foto do croqui', 'foto', true, false, 200, 'Fotos'),
  ('link_foto_relatorio_tecnico', 'Foto do relatório técnico', 'foto', true, false, 210, 'Fotos'),
  ('observacao', 'Observação', 'texto', false, false, 300, 'Observação')
on conflict (chave) do nothing;

-- Migração única: copiar dados existentes da tabela vistorias para vistoria_campo_valores
insert into public.vistoria_campo_valores (vistoria_id, campo_id, valor_texto, link_foto)
select v.id, c.id,
  case when c.permitir_fotos then null else
    case c.chave
      when 'tipo_padrao' then v.tipo_padrao
      when 'onde_ligado_inversor' then v.onde_ligado_inversor
      when 'percurso_cabo_inversor' then v.percurso_cabo_inversor
      when 'qtd_eletrodutos_inversor_cc' then v.qtd_eletrodutos_inversor_cc::text
      when 'qtd_eletrodutos_inversor_ca' then v.qtd_eletrodutos_inversor_ca::text
      when 'qtd_conduletes_inversor' then v.qtd_conduletes_inversor::text
      when 'qtd_eletrodutos_padrao' then v.qtd_eletrodutos_padrao::text
      when 'metragem_total_cabos_padrao' then v.metragem_total_cabos_padrao::text
      when 'observacao' then v.observacao
      else null
    end
  end,
  case when c.permitir_fotos then
    case c.chave
      when 'link_foto_fachada' then v.link_foto_fachada
      when 'link_foto_padrao_entrada' then v.link_foto_padrao_entrada
      when 'link_foto_disjuntor_padrao' then v.link_foto_disjuntor_padrao
      when 'link_foto_poste_mais_proximo' then v.link_foto_poste_mais_proximo
      when 'link_foto_ramal_entrada' then v.link_foto_ramal_entrada
      when 'link_foto_local_inversor' then v.link_foto_local_inversor
      when 'link_foto_aterramento' then v.link_foto_aterramento
      when 'link_foto_estrutura_telhado' then v.link_foto_estrutura_telhado
      when 'link_foto_telhado' then v.link_foto_telhado
      when 'link_foto_print_mapa' then v.link_foto_print_mapa
      when 'link_foto_croqui' then v.link_foto_croqui
      when 'link_foto_relatorio_tecnico' then v.link_foto_relatorio_tecnico
      else null
    end
  else null
  end
from public.vistorias v
cross join public.vistoria_campos c
where (
  (c.chave = 'tipo_padrao' and v.tipo_padrao is not null)
  or (c.chave = 'onde_ligado_inversor' and v.onde_ligado_inversor is not null)
  or (c.chave = 'percurso_cabo_inversor' and v.percurso_cabo_inversor is not null)
  or (c.chave = 'qtd_eletrodutos_inversor_cc' and v.qtd_eletrodutos_inversor_cc is not null)
  or (c.chave = 'qtd_eletrodutos_inversor_ca' and v.qtd_eletrodutos_inversor_ca is not null)
  or (c.chave = 'qtd_conduletes_inversor' and v.qtd_conduletes_inversor is not null)
  or (c.chave = 'qtd_eletrodutos_padrao' and v.qtd_eletrodutos_padrao is not null)
  or (c.chave = 'metragem_total_cabos_padrao' and v.metragem_total_cabos_padrao is not null)
  or (c.chave = 'observacao' and trim(coalesce(v.observacao, '')) <> '')
  or (c.permitir_fotos and trim(coalesce(
    case c.chave
      when 'link_foto_fachada' then v.link_foto_fachada
      when 'link_foto_padrao_entrada' then v.link_foto_padrao_entrada
      when 'link_foto_disjuntor_padrao' then v.link_foto_disjuntor_padrao
      when 'link_foto_poste_mais_proximo' then v.link_foto_poste_mais_proximo
      when 'link_foto_ramal_entrada' then v.link_foto_ramal_entrada
      when 'link_foto_local_inversor' then v.link_foto_local_inversor
      when 'link_foto_aterramento' then v.link_foto_aterramento
      when 'link_foto_estrutura_telhado' then v.link_foto_estrutura_telhado
      when 'link_foto_telhado' then v.link_foto_telhado
      when 'link_foto_print_mapa' then v.link_foto_print_mapa
      when 'link_foto_croqui' then v.link_foto_croqui
      when 'link_foto_relatorio_tecnico' then v.link_foto_relatorio_tecnico
      else null
    end, '')) <> '')
)
on conflict (vistoria_id, campo_id) do nothing;
