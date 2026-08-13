# Elo — Assistente Conversacional de Sócio-Terapia (PWA)

O **Elo** é um aplicativo Web / Progressive Web App (PWA) de acolhimento emocional e sócio-terapia com Inteligência Artificial (**Google Gemini 3.7 Flash** com fallback automático no **Gemini 3.6 Flash**), projetado para oferecer conversas acolhedoras, reflexivas e fundamentadas na psicologia clínica baseada em evidências (TCC, Terapias Contextuais ACT/DBT, regulação emocional e anamnese estruturada).

---

## ✨ Recursos Principais

- 🧠 **IA Avançada em Psicologia**: Modelo prioritário `gemini-3.7-flash` com fallback em `gemini-3.6-flash`, `gemini-2.5-flash` e `gemini-2.0-flash`.
- ⚡ **Streaming em Tempo Real (SSE)**: Respostas digitadas instantaneamente na tela.
- 🎨 **Interface Terapêutica & Acolhedora**:
  - Paleta relaxante em tons de Ameixa, Linho e Sálvia.
  - Suporte completo a **Modo Noturno (Descanso Visual)** e Modo Claro.
  - Renderizador nativo de **Markdown** (negrito, listas, citações, títulos).
  - Badges reflexivas com diferenciação de `[FATO]` e `[HIPÓTESE]`.
- 🧘 **Ferramentas de Apoio Emocional**:
  - Exercício interativo de **Respiração Relaxante (4-7-8)** com guia visual animado.
  - Pílulas de acesso rápido (Técnica 5-4-3-2-1, organização de pensamentos, desabafo).
- 🎙️ **Ditado por Voz**: Fale diretamente pelo microfone com transcrição automática.
- ⚙️ **Painel de Configurações Completo**:
  - Ajuste de tema e tamanho de fonte.
  - Ativação/desativação de streaming.
  - Exportação dos registros em formato Markdown (`.md`) ou cópia completa em JSON (`.json`).
  - Sincronização automática com repositório GitHub (opcional via Vercel).
- 🛡️ **Protocolo de Segurança e Acolhimento**:
  - Detecção de emergências e ideação (`[CRISE]`) com botões de chamada rápida para o **CVV (188)** e **SAMU (192)**.
- 📱 **100% PWA**:
  - Instalável no celular (iOS/Android) e Desktop.
  - Service Worker resiliente na raiz (`sw.js`) para carregamento instantâneo e offline do shell.

---

## 📁 Estrutura do Projeto

```
Terapia-main/
├── api/
│   ├── chat.js          # Serverless Function: Gemini 3.7/3.6 com SSE Streaming
│   └── sync.js          # Sincronização de backup com o GitHub
├── icons/               # Ícones de alta resolução e maskable (PWA / Favicon)
├── index.html           # Aplicação Elo (Interface, estilos e lógica de cliente)
├── manifest.json        # Manifesto PWA com suporte a instalação
├── sw.js                # Service Worker para cache e funcionamento offline
├── package.json         # Configurações do projeto
└── README.md            # Documentação
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js (v18 ou superior)
- Vercel CLI

### Passos
1. Instale a Vercel CLI (se ainda não tiver):
   ```bash
   npm i -g vercel
   ```
2. Na raiz do projeto, inicie o ambiente de desenvolvimento:
   ```bash
   vercel dev
   ```
3. Crie um arquivo `.env.local` na raiz com sua chave da Google AI Studio:
   ```env
   GEMINI_API_KEY=sua_chave_gemini_aqui
   GEMINI_MODEL=gemini-3.7-flash
   ```
4. Acesse `http://localhost:3000` no seu navegador.

---

## 🌐 Implantação na Vercel

1. Faça o push do repositório para o GitHub ou GitLab.
2. Importe o projeto no painel da **Vercel**.
3. Em **Project Settings > Environment Variables**, configure:
   - `GEMINI_API_KEY`: Sua chave de API da Google AI Studio.
   - `GEMINI_MODEL` (opcional): Modelo desejado (padrão: `gemini-3.7-flash`).
   - `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` (opcional): Para backup automático na nuvem.
4. Faça o **Deploy**.