# Homelab Homepage

Dashboard em Vue 3 + Vite com os atalhos dos serviços do homelab. Categorias e cards são editáveis pela interface e ficam salvos no backend (Spring Boot + PostgreSQL, pasta `homepage-backend`).

## Início rápido

```sh
# 1. backend (outro projeto): Postgres + API em http://localhost:8080
# 2. frontend
npm install
npm run dev
```

Outros comandos: `npm run build` (gera `dist/`) e `npm run preview`.

## Documentação

Funcionalidades, estrutura, componentes, API e deploy: [docs/FRONTEND.md](docs/FRONTEND.md).
