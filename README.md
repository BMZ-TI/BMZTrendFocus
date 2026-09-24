# BMZ Trend Focus ⚡

> **Central de Comando e Automação Inteligente de Redes Sociais**

O **BMZ Trend Focus** é uma plataforma full-stack para planejamento, geração orientada por inteligência artificial, agendamento e análise de performance de conteúdo para múltiplas redes sociais (Instagram, TikTok, LinkedIn, YouTube e Facebook).

Desenvolvido com uma interface imersiva no conceito *Command Deck* (paleta Deep Navy e Laranja Neon), oferece fluxo de ponta a ponta desde a concepção criativa até a mensuração de métricas.

---

## 🚀 Principais Funcionalidades

### 1. 📊 Painel Geral de Operações (Dashboard)
- **Métricas Consolidadas:** Alcance total acumulado, taxa média de engajamento e contagem de publicações agendadas.
- **Feed de Próximos Posts:** Visualização cronológica dos próximos disparos por rede social e status de preparação.
- **Acesso Rápido:** Atalho direto para composição instantânea com IA.

### 2. 🤖 Composição & Estúdio de Conteúdo com IA
- **Geração Multiformato:** Criação automática de roteiros para Reels/TikTok, carrosséis, threads, legendas e artigos.
- **Ajuste de Tom de Voz:** Configuração de estilos (direto, autoritário, storytelling, provocativo, educacional).
- **Ações Diretas:** Agendamento imediato com data/hora, salvamento como rascunho ou arquivamento na biblioteca.

### 3. 🗓️ Calendário Editorial Interativo
- **Visão Mensal:** Grid completo de distribuição de conteúdo ao longo do mês.
- **Identificação por Cores:** Badges específicos para cada rede social e status (*Rascunho*, *Agendado*, *Publicado*).
- **Detalhamento de Publicações:** Consulta rápida dos posts programados para cada dia.

### 4. 🗄️ Biblioteca de Ativos & Criativos
- **Repositório Centralizado:** Armazenamento de ganchos (*hooks*), aberturas, copys validadas, listas de hashtags e roteiros.
- **Filtros por Categoria:** Organização de conteúdo de apoio para reutilização ágil.

### 5. 📈 Relatórios & Métricas de Performance
- **Distribuição de Alcance:** Gráficos comparativos de entrega entre as plataformas conectadas.
- **Ranking de Top Posts:** Classificação dos conteúdos de maior tração por número de impressões e interações.

### 6. 🔗 Gestão de Contas Sociais
- **Central Multiplataforma:** Gerenciamento de status de conexão de perfis (Instagram, LinkedIn, TikTok, YouTube e Facebook).
- **Controle de Integração:** Ativação e alternância rápida de canais ativos.

### 7. 🔐 Segurança & Multi-inquilino
- **Autenticação:** Suporte a e-mail/senha e login social via Google OAuth.
- **Isolamento de Dados:** Políticas de segurança a nível de linha (*Row Level Security* — RLS) no banco de dados, garantindo privacidade total entre contas.
- **Acesso Demo Integrado:** Botão para acesso e exploração imediata com dados pré-populados.

---

## 🛠️ Tecnologias Utilizadas

- **Framework Web:** [TanStack Start v1](https://tanstack.com/start) (React 19, SSR/SSG & Edge Runtime)
- **Roteamento & Dados:** `@tanstack/react-router` & `@tanstack/react-query`
- **Estilização:** Tailwind CSS v4 com sistema de design tokens semânticos (OKLCH)
- **Backend & Banco de Dados:** PostgreSQL com Lovable Cloud (Auth, Storage & RLS)
- **Inteligência Artificial:** Integração via AI SDK com modelos generativos de linguagem de última geração
- **Ícones & Notificações:** Lucide React & Sonner

---

## 🎨 Identidade Visual

- **Conceito:** *Kinetic Glass Command Deck*
- **Base:** Deep Navy (`oklch(0.13 0.028 258)`) com painéis translúcidos foscos
- **Contraste & Acento:** Laranja Neon (`oklch(0.72 0.22 45)`)
- **Tipografia:** 
  - Títulos: **Anton** (impacto e presença)
  - Corpo: **Inter** (clareza e legibilidade)
  - Métricas e Rótulos: **JetBrains Mono** (precisão técnica)

---

## 🏁 Como Executar Localmente

### Pré-requisitos
- Node.js 20+ ou Bun
- Gerenciador de pacotes (`npm`, `pnpm` ou `bun`)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/bmz-trend-focus.git
cd bmz-trend-focus
