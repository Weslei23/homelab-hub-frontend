# Documentação do Frontend — Homelab Homepage

Dashboard de homelab que reúne os atalhos dos serviços (Proxmox, Jellyfin, Portainer etc.) em uma única página. As categorias e os cards são salvos em um backend Spring Boot + PostgreSQL ([`homepage-backend`](../../homepage-backend/README.md)) e podem ser criados, editados e excluídos pela própria interface.

## Sumário

1. [Stack](#1-stack)
2. [Como rodar](#2-como-rodar)
3. [Estrutura do projeto](#3-estrutura-do-projeto)
4. [Funcionalidades](#4-funcionalidades)
5. [Arquitetura e fluxo de dados](#5-arquitetura-e-fluxo-de-dados)
6. [Referência dos componentes](#6-referência-dos-componentes)
7. [Camada de dados](#7-camada-de-dados)
8. [Contrato da API](#8-contrato-da-api)
9. [Ícones](#9-ícones)
10. [Estilo e responsividade](#10-estilo-e-responsividade)
11. [Configuração e deploy](#11-configuração-e-deploy)
12. [Receitas comuns](#12-receitas-comuns)
13. [Limitações conhecidas e próximos passos](#13-limitações-conhecidas-e-próximos-passos)

---

## 1. Stack

| Item | Versão / detalhe |
|------|------------------|
| Vue | 3.5 (Composition API, `<script setup>`) |
| Vite | 8, com `@vitejs/plugin-vue` e `vite-plugin-vue-devtools` |
| Node | `^22.18.0` ou `>=24.12.0` |
| Linguagem | JavaScript (sem TypeScript, sem router, sem Pinia) |
| Estilo | CSS escopado em cada componente + `main.css` global |
| Dependências de runtime | apenas `vue` |

O estado é compartilhado por um módulo simples com `ref` (veja [useCategories.js](#usecategoriesjs)), sem biblioteca de estado.

## 2. Como rodar

```sh
npm install
npm run dev       # servidor de desenvolvimento em http://localhost:5173
npm run build     # build de produção em dist/
npm run preview   # serve o build localmente
```

O frontend precisa do backend para editar. Suba o backend em `http://localhost:8080` (veja o README dele). Em desenvolvimento o Vite encaminha `/api` para essa porta (`vite.config.js`), então não há problema de CORS.

Sem backend, a página abre normalmente com o catálogo padrão (somente leitura) e um aviso vermelho.

## 3. Estrutura do projeto

```
Homepage/
├── index.html                 # página única; monta #app e carrega src/main.js
├── vite.config.js             # plugins, alias "@" -> src, proxy /api -> :8080
├── jsconfig.json              # suporte do editor ao alias "@"
├── package.json
├── docs/
│   └── FRONTEND.md            # este documento
└── src/
    ├── main.js                # cria o app Vue e importa main.css
    ├── App.vue                # layout: sidebar + dashboard, menu mobile
    ├── assets/
    │   └── main.css           # reset global, fonte e cor de fundo
    ├── components/
    │   ├── Sidebar.vue        # barra lateral "Acesso rápido"
    │   ├── Dashboard.vue      # cabeçalho, busca, categorias e grid de cards
    │   ├── ServiceCard.vue    # card individual (link + botão de editar)
    │   ├── CardModal.vue      # modal de criar/editar/excluir card
    │   ├── CategoryModal.vue  # modal de criar/renomear categoria
    │   └── icons/             # svg/png dos serviços (fonte do seletor de ícones)
    └── data/
        ├── services.js        # catálogo padrão (fallback offline)
        ├── useCategories.js   # estado global do catálogo + ações
        ├── catalogApi.js      # chamadas HTTP ao backend
        └── icons.js           # mapa chave -> URL do ícone embutido
```

O alias `@` aponta para `src/` (ex.: `import ... from '@/data/icons'`).

## 4. Funcionalidades

### 4.1 Dashboard
- **Saudação dinâmica** conforme o horário: madrugada (< 6h), dia (< 12h), tarde (< 18h) e noite.
- **Data e hora** em pt-BR (ex.: "domingo, 11 de outubro · 19:30"), atualizadas a cada 30 s.
- **Cards agrupados por categoria**, em grid responsivo (`repeat(auto-fill, minmax(240px, 1fr))`).
- Clicar em um card abre o serviço em **nova aba** (`target="_blank"` com `rel="noopener"`).

### 4.2 Busca
- Campo "Buscar serviço..." filtra em tempo real por **nome** e **descrição** (sem diferenciar maiúsculas).
- Categorias sem resultado somem durante a busca.
- Sem resultados: mensagem "Nenhum serviço encontrado para ...".
- Durante a busca os botões de adicionar/renomear/excluir ficam ocultos mesmo no modo edição, para evitar ações sobre uma lista parcial.

### 4.3 Modo de edição
Por padrão a página é só de leitura: nenhum controle de edição aparece. O botão **✎ Editar** no cabeçalho (ao lado da busca) liga o modo de edição, que exibe **+ Categoria**, **+ Novo card**, os botões ✎/🗑 das categorias e o ✎ de cada card. O botão vira **✓ Concluir** para sair. O modo não é persistido: ao recarregar a página ele volta desligado. Sem backend, o botão não aparece.

### 4.4 Gerenciamento de cards
| Ação | Como |
|------|------|
| Criar | (modo edição) botão tracejado **"+ Novo card"** no fim de cada categoria |
| Editar | (modo edição) botão **✎** no canto do card |
| Excluir | Dentro do modal de edição, botão **Excluir** (pede confirmação) |
| Definir link | (modo edição) cards sem link mostram "Clique para definir o link"; clicar neles abre o editor. Fora do modo edição, clicar neles não faz nada |

Campos do card: **nome** (obrigatório), **URL** (obrigatória, `http://` ou `https://`), **descrição** (opcional) e **ícone** (opcional).

### 4.5 Gerenciamento de categorias
| Ação | Como |
|------|------|
| Criar | (modo edição) botão **"+ Categoria"** no topo, ao lado da busca |
| Renomear | (modo edição) **✎** ao lado do título da categoria |
| Excluir | (modo edição) **🗑** ao lado do título; confirma e informa quantos cards serão removidos junto |

### 4.6 Sidebar "Acesso rápido"
Lista os serviços da **primeira categoria** (por padrão, Infraestrutura), com ícone e nome, em um grupo que pode ser recolhido/expandido. Em telas ≤ 900 px ela vira um menu deslizante aberto pelo botão ☰ e fechado pelo ✕ ou clicando no fundo escuro.

### 4.7 Modo offline
Se `GET /api/catalog` falhar, o app usa o catálogo de `services.js`, mostra o aviso *"Backend indisponível — exibindo o catálogo padrão; não é possível editar."* e esconde todos os controles de edição. A tentativa é feita uma vez no carregamento da página (atualize para tentar de novo).

### 4.8 Validações no cliente
- Nome do card e nome da categoria não podem ficar vazios.
- URL do card deve casar com `^https?://\S+$` (bloqueia `javascript:` e similares).
- Ícone personalizado também deve ser URL `http(s)`.
- O backend repete as validações; as mensagens de erro dele aparecem no modal.

## 5. Arquitetura e fluxo de dados

```
┌────────────┐   ações    ┌────────────────┐   fetch    ┌──────────────┐
│ Dashboard  │ ─────────► │ useCategories  │ ─────────► │ catalogApi   │ ─► /api/*
│ Sidebar    │ ◄───────── │ (refs globais) │ ◄───────── │              │
│ ServiceCard│  categories│                │   JSON     └──────────────┘
└────────────┘            └────────────────┘
```

1. `Dashboard` chama `loadCatalog()` ao montar.
2. `loadCatalog()` busca `GET /api/catalog` e grava em `categories` (ou usa o fallback e marca `apiOnline = false`).
3. `Dashboard` e `Sidebar` leem o mesmo `categories`, então refletem as mudanças juntos.
4. Cada alteração (criar, editar, excluir) chama a API e, em seguida, **recarrega o catálogo inteiro**. É simples e garante ids e ordem reais vindos do servidor.
5. Os modais recebem uma função `onSubmit` (e `onDelete`) do `Dashboard`, aguardam a promessa e exibem o erro dela, se houver, sem fechar.

## 6. Referência dos componentes

### `App.vue`
Layout raiz. Renderiza `Sidebar` e `Dashboard` lado a lado (flex). Guarda `sidebarOpen` para o menu mobile: botão ☰ (visível ≤ 900 px), wrapper com `translateX` e overlay escuro.

### `Dashboard.vue`
Tela principal. Responsabilidades: cabeçalho (saudação, relógio, busca, botão Editar, "+ Categoria"), aviso offline, listagem de categorias/cards, e abertura dos modais.

Estado local: `search`, `editMode`, `cardTarget`, `categoryTarget`, `now`.
Computeds: `canEdit` (backend online e modo edição ligado), `greeting`, `formattedDate`, `formattedTime`, `filteredCategories`.

`cardTarget` descreve o que o `CardModal` deve mostrar:
- `{ mode: 'create', categoryId }` — novo card
- `{ mode: 'edit', card }` — edição
- `null` — fechado

`categoryTarget` segue a mesma ideia: `{ mode: 'create' }`, `{ mode: 'edit', category }` ou `null`.

### `ServiceCard.vue`
Card de um serviço.

| Prop | Tipo | Descrição |
|------|------|-----------|
| `service` | Object (obrigatória) | `{ id?, name, url, description?, icon? }` |
| `editable` | Boolean (padrão `false`) | Mostra o botão ✎ e permite abrir o editor (o `Dashboard` passa `true` só no modo edição) |

Evento: `edit` (emite o `service`).

Comportamento: `<a>` para a `url`; se `url === '#'`, o clique é interceptado e abre o editor (apenas se `editable`). Sem ícone, mostra a inicial do nome. O botão ✎ usa `@click.prevent.stop` para não navegar.

### `CardModal.vue`
Modal de criar/editar card.

| Prop | Descrição |
|------|-----------|
| `target` | `{ mode, ... }` ou `null` (veja acima) |
| `onSubmit(payload)` | Função assíncrona; recebe `{ name, url, description, icon }` |
| `onDelete()` | Função assíncrona de exclusão (só no modo edição) |

Evento: `close`. O seletor de ícone oferece: *Automático (inicial do nome)*, todos os ícones embutidos e *URL personalizada...* (que revela um campo extra). Ao abrir um card sem link, o foco vai direto para o campo URL. `Esc` e clique no fundo fecham.

### `CategoryModal.vue`
Modal de criar/renomear categoria. Props: `target` e `onSubmit(label)`. Evento: `close`.

### `Sidebar.vue`
Props: `title` (padrão `"Homelab"`). Evento: `close` (usado no mobile). Mostra a primeira categoria; o estado recolhido/expandido fica em `closedCategories`.

## 7. Camada de dados

### `useCategories.js`
Módulo com estado **compartilhado** (refs fora da função), exportando:

| Export | Descrição |
|--------|-----------|
| `loadCatalog()` | Carrega do backend; em erro usa o padrão e põe `apiOnline = false` |
| `useCategories()` | Retorna `{ categories, apiOnline, addCategory, renameCategory, removeCategory, addCard, updateCard, removeCard }` |

Todas as ações de escrita seguem o padrão *chama a API → recarrega o catálogo*; erros são propagados (o chamador decide como exibir).

### `catalogApi.js`
Wrapper fino sobre `fetch`. Usa `import.meta.env.VITE_API_URL` como prefixo (vazio por padrão = mesma origem / proxy do Vite). Respostas não-OK viram `Error` com o campo `message` do corpo JSON.

### `services.js`
Catálogo padrão com imports diretos dos ícones. Hoje serve **somente de fallback offline**; a fonte de verdade é o banco. (Exporta também `allServices`, uma lista plana atualmente sem uso.)

### `icons.js`
Veja a próxima seção.

## 8. Contrato da API

Base: `/api`. Detalhes completos no README do backend.

| Método | Rota | Corpo | Resposta |
|--------|------|-------|----------|
| GET | `/catalog` | — | `[{ id, label, services: [{ id, name, url, description, icon }] }]` |
| POST | `/categories` | `{ label }` | 201 + categoria |
| PUT | `/categories/{id}` | `{ label }` | categoria |
| DELETE | `/categories/{id}` | — | 204 (remove também os cards) |
| POST | `/categories/{id}/cards` | `{ name, url, description?, icon? }` | 201 + card |
| PUT | `/cards/{id}` | idem | card |
| DELETE | `/cards/{id}` | — | 204 |

Erros: `400 { "message": "..." }` (validação) e `404 { "message": "..." }`.

## 9. Ícones

Cada card guarda em `icon` **uma chave** (nome do arquivo sem extensão, ex.: `proxmox`) **ou uma URL** `http(s)`.

`icons.js` usa `import.meta.glob('@/components/icons/*.{svg,png}')` para montar o mapa `chave -> URL final do asset`:

- `iconMap` — o mapa.
- `iconKeys` — chaves ordenadas (alimenta o `<select>`).
- `resolveIcon(icon)` — chave → URL do asset; URL → ela mesma; vazio → `null` (o card mostra a inicial).

Para adicionar um ícone ao seletor, basta colocar o arquivo `.svg` ou `.png` em `src/components/icons/` e reiniciar o `npm run dev`.

Chaves disponíveis hoje: adguard-home, cubecoders-amp, docker, downtify, excalidraw, grafana, home-assistant, immich, jellyfin, jenkins, metube, navidrome, nextcloud, nginx-proxy-manager, openspeedtest, pihole, portainer-dark, prometheus, proxmox, servidor, stirling-pdf, tailscale-light, truenas, uptime-kuma, vaultwarden, wireguard, zimaos.

> As chaves ficam gravadas no banco. Renomear ou apagar um arquivo de ícone faz os cards que o usam voltarem a exibir a inicial do nome (ou uma imagem quebrada, no caso de uma chave que vire URL inválida).

## 10. Estilo e responsividade

- Tema escuro fixo, com cores definidas diretamente nos componentes (paleta slate/azul: fundo `#0f172a`, cards `#1e293b`, bordas `#334155`, destaque `#2563eb`, texto `#f8fafc`).
- `main.css`: reset (`margin`, `padding`, `box-sizing`), altura 100 % e fonte `Segoe UI`/system-ui.
- Breakpoints:
  - **≤ 900 px**: sidebar vira menu deslizante; botão ☰ aparece.
  - **≤ 640 px**: padding do dashboard reduz de 40 px para 20 px.
- Animações: leve elevação (`translateY(-2px)`) e troca de borda no hover do card; transição de 0,25 s no menu mobile.

## 11. Configuração e deploy

| Variável | Onde | Efeito |
|----------|------|--------|
| `VITE_API_URL` | build do frontend | Prefixo das chamadas à API (ex.: `http://192.168.3.146:8080`). Vazio = mesma origem |

**Desenvolvimento:** proxy do Vite (`/api` → `http://localhost:8080`), nada a configurar.

**Produção:** `npm run build` gera arquivos estáticos em `dist/`. Duas opções:
1. Servir `dist/` e a API sob o mesmo domínio via proxy reverso (ex.: Nginx Proxy Manager encaminhando `/api` ao backend). Não precisa de `VITE_API_URL`.
2. Definir `VITE_API_URL` no build e liberar a origem do frontend no backend com `CORS_ALLOWED_ORIGINS`.

## 12. Receitas comuns

**Adicionar um serviço** — pela interface: **+ Novo card** na categoria desejada.

**Mudar o catálogo inicial** — edite `seed-catalog.json` no backend; só vale para banco vazio. Atualize também `services.js` se quiser manter o fallback offline igual.

**Mudar qual categoria aparece na sidebar** — em `Sidebar.vue`, ajuste `quickCategories` (hoje `categories.value.slice(0, 1)`).

**Mudar o intervalo do relógio** — `setInterval(..., 1000 * 30)` em `Dashboard.vue`.

**Trocar as cores** — procure os hex nos blocos `<style scoped>`; não há variáveis CSS centralizadas.

**Nova chamada à API** — adicione a função em `catalogApi.js`, exponha a ação em `useCategories.js` (usando `mutate`) e consuma no componente.

## 13. Limitações conhecidas e próximos passos

- **Sem autenticação**: qualquer pessoa na rede com acesso à página pode editar o catálogo.
- **Sem reordenação** de cards e categorias (a ordem é a de criação).
- **Não é possível mover** um card para outra categoria (só recriar).
- **Recarga completa** do catálogo após cada alteração (simples, mas faz uma requisição a mais).
- **Sem indicador de carregamento** inicial nem retentativa automática quando o backend volta.
- **Cores duplicadas** nos componentes; um tema com variáveis CSS facilitaria claro/escuro.
- **Sem testes** automatizados nem linter configurado.
- **Status online/offline** dos serviços ainda não existe.
