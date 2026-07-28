# Elo - Assistente Conversacional de Sócio-Terapia (PWA)

O **Elo** é um aplicativo Web / PWA de sócio-terapia alimentado por Inteligência Artificial (Google Gemini API), projetado para oferecer conversas acolhedoras, estruturadas e fundamentadas na psicologia clínica baseada em evidências.

---

## 📁 Estrutura do Projeto

```
Terapia-main/
├── api/
│   └── chat.js          # Function Serverless da Vercel (Endpoint /api/chat)
├── icons/               # Ícones da aplicação (PWA e favicon)
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── maskable-512.png
├── index.html           # Interface do aplicativo Elo (HTML, CSS e JavaScript)
├── manifest.json        # Manifesto PWA para instalação no celular e desktop
├── sw.js                # Service Worker para cache e funcionamento offline
├── package.json         # Configurações do projeto
└── README.md            # Documentação
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js (v18 ou superior)
- Vercel CLI (opcional, mas recomendado para testar a Serverless Function)

### Passos
1. Instale a Vercel CLI se ainda não tiver:
   ```bash
   npm i -g vercel
   ```
2. Na raiz do projeto, execute:
   ```bash
   vercel dev
   ```
3. Defina a variável de ambiente `GEMINI_API_KEY` quando solicitado ou em um arquivo `.env.local`:
   ```env
   GEMINI_API_KEY=sua_chave_gemini_aqui
   ```
4. Acesse `http://localhost:3000` no seu navegador.

---

## 🌐 Implantação na Vercel

1. Faça o push do repositório para o GitHub/GitLab.
2. Importe o projeto no painel da **Vercel**.
3. Vá em **Project Settings > Environment Variables** e adicione:
   - `GEMINI_API_KEY`: Sua chave de API da Google AI Studio.
   - `GEMINI_MODEL` (opcional): Modelo desejado (ex: `gemini-2.5-flash`).
4. Faça o **Deploy**.

---

## 📱 Suporte a PWA

O aplicativo já inclui suporte nativo a **Progressive Web App (PWA)**:
- Pode ser instalado na tela inicial de dispositivos iOS, Android e Desktop.
- Suporta funcionamento offline para a interface estática através do `sw.js`.