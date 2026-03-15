-- Adiciona a coluna tipo_usuario na tabela usuarios
-- Execute no SQL Editor do Supabase se a tabela já existir

alter table public.usuarios
  add column if not exists tipo_usuario text
  check (tipo_usuario is null or tipo_usuario in ('Vistoriador', 'Instalador', 'Administrativo', 'Administrador'));
