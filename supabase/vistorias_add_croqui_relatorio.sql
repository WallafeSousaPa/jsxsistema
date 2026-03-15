-- Adiciona colunas para foto do croqui e do relatório técnico
-- Execute no SQL Editor do Supabase se a tabela vistorias já existir

alter table public.vistorias
  add column if not exists link_foto_croqui text,
  add column if not exists link_foto_relatorio_tecnico text;
