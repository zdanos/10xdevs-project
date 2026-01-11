# FlashCard AI (MVP)

![version](https://img.shields.io/badge/version-0.0.1-blue)
![node](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js&logoColor=white)
![astro](https://img.shields.io/badge/Astro-5-BC52EE?logo=astro&logoColor=white)
![react](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=0B2231)

## Project description

FlashCard AI is a mobile-first MVP web application that drastically reduces the time required to create learning materials. Users paste notes, and AI (via the OpenAI API using the GPT-4o-mini model) generates text-only flashcards. The product is designed around spaced repetition using the SuperMemo 2 (SM-2) algorithm, with a user verification step (“Staging Area”) to ensure content quality.

### Table of contents

- [Project name](#flashcard-ai-mvp)
- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Tech stack

- **Frontend**:
  - **Astro 5** (with React islands)
  - **React 19**
  - **TypeScript 5**
  - **Tailwind CSS 4**
  - **shadcn/ui**
- **Backend**:
  - **Supabase** (PostgreSQL + Auth; can be self-hosted)
- **AI**:
  - **OpenAI API** (target model: **GPT-4o-mini**)
- **CI/CD & hosting (planned in PRD/tech stack)**:
  - **GitHub Actions**
  - **DigitalOcean** (Docker image deployment)

## Getting started locally

### Prerequisites

- **Node.js**: `22.14.0` (from `.nvmrc`)
- **npm**: comes with Node.js

### Setup

1. Install the Node version (if you use nvm):

```bash
nvm use
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

### Project structure

```md
.
├── src/
│   ├── components/          # UI components (Astro & React)
│   ├── layouts/             # Astro layouts
│   ├── lib/                 # Services and helpers
│   ├── pages/               # Astro routes
│   │   └── api/             # API endpoints
│   ├── styles/              # Global styles
│   └── env.d.ts             # TypeScript env typings
├── public/                  # Public static assets
└── astro.config.mjs         # Astro configuration
```

### Environment / external services

This MVP is designed to integrate with:

- **Supabase** (database + authentication)
- **OpenAI API** (flashcard generation; GPT-4o-mini)

## Available scripts

From `package.json`:

- **`npm run dev`**: start Astro dev server
- **`npm run build`**: build for production
- **`npm run preview`**: preview the production build
- **`npm run astro`**: run Astro CLI
- **`npm run lint`**: run ESLint
- **`npm run lint:fix`**: run ESLint with auto-fixes
- **`npm run format`**: format with Prettier

## Project scope

### In scope (MVP)

- **Web application** (mobile-first, responsive)
- **Text flashcard generation from pasted notes**
  - Input limit: **up to 5000 characters**
  - Daily generation limit: **10 requests per user**
  - **Staging Area** where users must verify AI-generated flashcards before saving
- **Study mode** using **SM-2 (SuperMemo 2)** with 4-grade evaluation:
  - **Again**, **Hard**, **Good**, **Easy**
  - Session ends with a summary screen encouraging users to return the next day
- **Flashcard management**:
  - Manual creation (text-only), edit, delete
  - Organization into simple **Decks**
- **Authentication**:
  - Email + password only (via Supabase Auth)
- **UI constraints**:
  - **English-only UI**
  - **Light mode only**

### Out of scope

- Images, audio, LaTeX, Markdown formatting
- File imports (PDF/DOCX) and OCR
- Social login (Google/Facebook/etc.)
- Sharing decks between users
- Native iOS/Android apps
- Custom repetition algorithm (other than SM-2)
- Regenerate button for a single incorrect card (manual edit instead)
- UI internationalization (only EN)

## Project status

- **Stage**: MVP specification defined (PRD) and project scaffold in place (`astro` + `react` + `tailwind`)
- **Product goal**: deliver a minimal, mobile-first flashcard generator with user verification and SM-2 spaced repetition

## License

MIT
