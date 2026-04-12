-- Adiciona tipo_campo (foto | texto | numero) para bancos que já tinham vistoria_campos sem essa coluna.
-- Execute uma vez no SQL Editor do Supabase.

alter table public.vistoria_campos
  add column if not exists tipo_campo text;

update public.vistoria_campos
set tipo_campo = case
  when permitir_fotos then 'foto'
  when chave in (
    'percurso_cabo_inversor',
    'qtd_eletrodutos_inversor_cc',
    'qtd_eletrodutos_inversor_ca',
    'qtd_conduletes_inversor',
    'qtd_eletrodutos_padrao',
    'metragem_total_cabos_padrao'
  ) then 'numero'
  else 'texto'
end
where tipo_campo is null;

update public.vistoria_campos set tipo_campo = 'texto' where tipo_campo is null;

alter table public.vistoria_campos alter column tipo_campo set default 'texto';

alter table public.vistoria_campos alter column tipo_campo set not null;

alter table public.vistoria_campos drop constraint if exists vistoria_campos_tipo_campo_check;

alter table public.vistoria_campos
  add constraint vistoria_campos_tipo_campo_check check (tipo_campo in ('foto', 'texto', 'numero'));
