# JSX Sistema

Sistema web com integração Supabase para base de dados.

## Telas (layouts)

- **Login** – Tela de autenticação
- **Vistorias** – Tela de vistorias
- **Instalação** – Tela de instalação

As funções e integrações serão implementadas por partes.

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

## Configuração

1. Instale as dependências:

```bash
npm install
```

2. Configure o Supabase: copie `.env.example` para `.env` e preencha com a URL e a chave anônima do seu projeto Supabase:

```bash
cp .env.example .env
```

Edite `.env`:

- `VITE_SUPABASE_URL` – URL do projeto (ex: `https://xxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` – Chave anônima (public) do projeto

## Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:5173

## Build

```bash
npm run build
```

## Criar repositório no GitHub

1. Crie um repositório vazio no GitHub (sem README, sem .gitignore).

2. Na pasta do projeto, execute:

```bash
git init
git add .
git commit -m "Initial commit: layouts Login, Vistorias, Instalação"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/jsxsistema.git
git push -u origin main
```

Substitua `SEU_USUARIO` pelo seu usuário do GitHub.
