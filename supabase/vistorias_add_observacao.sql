-- Adiciona a coluna observacao na tabela vistorias (execute se a tabela já existir)
-- Execute no SQL Editor do Supabase

alter table public.vistorias
  add column if not exists observacao text;
