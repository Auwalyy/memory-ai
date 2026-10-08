# MemoryAI

> **Our Stories, Our Languages, Our Memory.**

MemoryAI is a voice-first platform for preserving Nigerian indigenous knowledge. Elders, storytellers, artisans,
teachers and community members record knowledge in their own language. **N-ATLAS** transcribes, translates and
structures it, and people verify the result before it enters a searchable archive.

> AI should preserve Nigerian knowledge, not invent Nigerian culture.

---

## NAIC MVP (PS2 — Voice-First Access)

Primary language: **Hausa**. Secondary: **English / Nigerian English**. Yoruba and Igbo are wired through the
pipeline and switch on once an ASR model is configured for them.

### Pipeline

```
Hausa voice ─▶ N-ATLAS ASR ─▶ Hausa transcript ─▶ N-ATLAS LLM ─▶ translation + structured knowledge
   ─▶ source-grounding check ─▶ human verification ─▶ Knowledge Library ─▶ search / explorer
```

- **N-ATLAS is the core dependency.** All calls go through `backend/src/core/natlas/natlas.service.js`
  (`transcribeAudio`, `translateKnowledge`, `generateStructuredKnowledge`, `summarizeKnowledge`,
  `answerFromRetrievedKnowledge`). Endpoints and keys come from env vars and never reach the frontend.
- **No invented culture.** After extraction, any person, place, entity, cultural term or proverb that does not appear
  in the original transcript is removed and recorded in the item's provenance.
- **Retrieval first.** Search retrieves stored contributions (MongoDB text index + embeddings) and only then asks
  N-ATLAS to summarise *those* sources. With no matching sources, no answer is generated. Every answer shows
  "Based on X community contributions" with links to the sources.
- **Provenance.** Each record keeps its recording, consent statement, location, recording date, per-step models and
  timings, grounding results, and review history. Status flow: `PENDING → AI_PROCESSED → HUMAN_REVIEWED → VERIFIED`.
- **Privacy.** Explicit consent before recording; contributors can stay anonymous, edit, withdraw or delete
  (deleting removes the recording too).

### Running N-ATLAS

N-ATLAS has no public hosted API. `natlas-gateway/` is a small FastAPI service that serves `NCAIR1/Hausa-ASR` and
`NCAIR1/N-ATLaS` behind OpenAI-style endpoints — see [natlas-gateway/README.md](natlas-gateway/README.md). Then set in
`backend/.env`:

```
NATLAS_ASR_ENDPOINT=http://localhost:8080/v1/audio/transcriptions
NATLAS_LLM_ENDPOINT=http://localhost:8080/v1/chat/completions
NATLAS_API_KEY=<same as NATLAS_GATEWAY_API_KEY>
NATLAS_MODEL=NCAIR1/N-ATLaS
```

Recordings go to Cloudinary when it is configured, otherwise to `backend/uploads/audio` (served at `/media/audio`).
On ephemeral hosts (e.g. Render) configure Cloudinary so recordings survive restarts.

### Pages

| Route | Purpose |
| --- | --- |
| `/contribute` → `/contribute/processing` | Choose language & type, consent, record, watch N-ATLAS process it, rate fidelity |
| `/knowledge`, `/knowledge/[id]` | Knowledge Library and record view (transcript, translation, structure, provenance, reviews) |
| `/search` | Questions answered from retrieved community sources, with citations |
| `/explore` | Location → knowledge type → records, plus topics, people, proverbs, crafts |
| `/verify` | Contributor review queue; moderator verification queue |
| `/admin/analytics` | Validation dashboard + CSV/JSON export of per-session records |
| `/demo` | **MemoryAI — N-ATLAS Voice Preservation Demo**: the whole pipeline on one screen for judges |
| `/contributions` | My Contributions (edit, withdraw, delete) |

The earlier story/proverb tools remain under **More tools** (`/archive`, `/stories`, `/proverbs`, `/upload`, `/chat`, …).

### API (prefix `/api/v1`)

| Method & path | Auth | Description |
| --- | --- | --- |
| `POST /knowledge/upload` | user | multipart `audio` (or `text`), `language`, `knowledgeType`, `consent=true`, `town`, `state`, `community`, `isAnonymous`, `durationSec`, `sessionId` |
| `POST /knowledge/process` | owner | `{ contributionId }` → starts the N-ATLAS pipeline, returns a job |
| `GET /knowledge/jobs/:id` | owner | pipeline progress (+ the item when done) |
| `GET /knowledge` | public | library (`language`, `knowledgeType`, `status`, `q`, `location`, `topic`, `person`, `place`, `mine=true`) |
| `GET /knowledge/:id` | public* | item + provenance + reviews (*unpublished: owner/moderator only) |
| `POST /knowledge/:id/review` | owner/moderator | `{ fidelityScore 1-5, correctionText?, userFeedback? }` |
| `POST /knowledge/:id/verify` | moderator | `{ decision: verify\|reject, fidelityScore, correctionText? }` |
| `PATCH /knowledge/:id` · `POST /knowledge/:id/withdraw` · `DELETE /knowledge/:id` | owner | edit / withdraw / delete |
| `GET /knowledge/search?q=` | public | retrieval + optional N-ATLAS summary (`answer=false` for sources only) |
| `GET /knowledge/explore` | public | relationship tree and facets |
| `POST /natlas/transcribe` · `POST /natlas/process` · `GET /natlas/status` | user / public | direct N-ATLAS access for testing |
| `GET /analytics` · `GET /analytics/export?format=csv\|json` | user · moderator | evaluation metrics and validation export |

Export columns: `sessionId, language, knowledgeType, processingSuccess, transcriptionSuccess, extractionSuccess,
completionTimeMs` (+ per-step timings and models), `fidelityScore, correctionRequired, userFeedback, verificationStatus`.

### Demo script (3–5 min)

1. Open `/demo`. Point out the N-ATLAS status line (ASR + LLM model IDs).
2. Choose **Hausa** and **Tradition**, enter *Kano*, tick consent, and record a real speaker.
3. Watch steps 2–4 complete: transcript, translation, extracted concepts and proverbs, confidence notes.
4. The speaker rates fidelity (1–5) and adds a correction if needed → **Published**.
5. Open the record: audio, provenance, models used, timings, grounding check.
6. In `/search`, ask *"What traditional marriage practices are mentioned in Kano?"* — note "Based on N community contributions" and open a cited source.
7. Finish on `/explore` and `/admin/analytics` (fidelity score, ASR success rate, export).

---

## Why MemoryAI Nigeria?

Nigeria has over 500 indigenous languages and thousands of years of accumulated traditional knowledge — folktales, proverbs, oral histories, traditional medicine, ceremonies, and community wisdom. This knowledge exists only in oral traditions, handwritten manuscripts, and the memories of elders.

**Every year, Nigeria loses priceless indigenous knowledge because elders pass away before recording it.**

MemoryAI Nigeria solves this by transforming raw indigenous knowledge into a living, searchable, multilingual AI knowledge network — powered by Google Gemma 4.

---

## How Gemma 4 Powers Everything

Gemma is not an add-on. It is the intelligence layer:

| Feature | Gemma's Role |
|---|---|
| Knowledge Upload | Detects language, extracts entities, summarizes content |
| Cultural Analysis | Explains cultural context, identifies traditions |
| Story Understanding | Extracts characters, moral lessons, themes |
| Cross-Language Discovery | Finds Hausa ↔ Yoruba ↔ Igbo story connections |
| Educational Content | Generates lesson plans, quizzes, discussion questions |
| Children's Stories | Adapts complex stories for young readers |
| Translation | Translates with full cultural nuance preservation |
| Podcast Scripts | Generates broadcast-ready scripts from knowledge |
| AI Chat | Multi-turn conversations over preserved knowledge |
| Semantic Search | Embedding-based similarity search |

---

## Technology Stack

### Backend
- **Runtime**: Node.js (LTS)
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **AI**: Google Gemini API — `gemma-4-27b-it` model
- **Embeddings**: Google `text-embedding-004`
- **OCR**: Tesseract.js
- **Storage**: Cloudinary
- **Auth**: JWT + Refresh Tokens + RBAC
- **Architecture**: Feature-based MVC + Service + Repository

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State**: TanStack Query + React Context
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod

---

## Project Structure

```
memory-ai/
├── backend/
│   └── src/
│       ├── config/          # DB connection, constants
│       ├── core/
│       │   ├── ai/          # Gemma client, prompts, service
│       │   ├── embeddings/  # text-embedding-004 service
│       │   ├── ocr/         # Tesseract OCR service
│       │   └── storage/     # Cloudinary service
│       ├── features/
│       │   ├── auth/        # JWT auth, user model
│       │   ├── stories/     # Core knowledge entity
│       │   ├── proverbs/    # Proverb extraction & storage
│       │   ├── chat/        # Multi-turn AI conversations
│       │   ├── uploads/     # File upload + OCR pipeline
│       │   ├── search/      # Text + semantic search
│       │   ├── education/   # Lesson/quiz generation
│       │   ├── bookmarks/   # Save knowledge items
│       │   ├── collections/ # Curated knowledge sets
│       │   ├── community/   # Contributor profiles
│       │   ├── knowledge/   # Knowledge graph + stats
│       │   └── admin/       # Dashboard + moderation
│       ├── middleware/      # Auth, upload, validation, errors
│       └── utils/           # Logger, response helpers, errors
└── frontend/
    └── app/
        ├── (auth)/          # Login, Register
        ├── (dashboard)/     # All authenticated pages
        │   ├── dashboard/   # Home dashboard
        │   ├── stories/     # Stories list + detail
        │   ├── chat/        # AI chat interface
        │   ├── upload/      # File upload
        │   ├── search/      # Search interface
        │   └── education/   # Educational content
        └── page.jsx         # Landing page
```

---

## Getting Started

### Prerequisites
- Node.js 20+ (LTS)
- MongoDB (local or Atlas)
- Google AI Studio API key (for Gemma 4)
- Cloudinary account

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your GOOGLE_GEMINI_API_KEY, MONGODB_URI, Cloudinary credentials
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
npm install
npm run dev
```

### Environment Variables

**Backend `.env`:**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/memoryai_nigeria
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
GOOGLE_GEMINI_API_KEY=your_google_ai_studio_key
GEMMA_MODEL=gemma-4-27b-it
EMBEDDING_MODEL=text-embedding-004
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:3000
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Get current user |

### Stories (Core Knowledge)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/stories` | List stories (filterable) |
| POST | `/api/v1/stories` | Create story → triggers Gemma analysis |
| GET | `/api/v1/stories/:id` | Get story with full analysis |
| GET | `/api/v1/stories/:id/educational` | Generate lesson plan |
| GET | `/api/v1/stories/:id/childrens-version` | Generate children's story |
| GET | `/api/v1/stories/:id/cross-language` | Find cultural connections |
| POST | `/api/v1/stories/:id/translate` | Translate with cultural context |
| GET | `/api/v1/stories/:id/podcast` | Generate podcast script |

### AI Chat
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/chat` | Start chat session |
| POST | `/api/v1/chat/:id/messages` | Send message |
| GET | `/api/v1/chat` | List chat sessions |
| DELETE | `/api/v1/chat/:id` | Delete session |

### Search
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/search?q=` | Full-text search |
| GET | `/api/v1/search/semantic?q=` | Embedding-based semantic search |

### Proverbs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/proverbs` | List proverbs |
| POST | `/api/v1/proverbs` | Add proverb |
| POST | `/api/v1/proverbs/extract` | Extract proverbs from text via Gemma |

### Uploads
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/uploads` | Upload file (image/audio/document) |
| GET | `/api/v1/uploads` | List uploads |
| POST | `/api/v1/uploads/:id/analyze` | Analyze extracted text with Gemma |

---

## Supported Languages
- **Hausa** — Northern Nigeria
- **Yoruba** — Southwest Nigeria
- **Igbo** — Southeast Nigeria
- **English** — Colonial/modern records
- **Pidgin** — Nigerian Creole

---

## Security
- JWT access tokens (15min) + refresh tokens (7 days)
- bcrypt password hashing (12 rounds)
- Rate limiting (100 req/15min global, 20 req/min for AI endpoints)
- Helmet security headers
- MongoDB injection sanitization
- HTTP Parameter Pollution protection
- CORS with origin whitelist
- Role-based access control (user, contributor, moderator, admin)
- Audit logging with 90-day TTL

---

## Hackathon: Google Gemma Challenge

This project was built for the **Build with Gemma** hackathon.

**Theme**: Build the best application leveraging Gemma 4 to enhance communication, accessibility, or content creation in Hausa or other local Nigerian languages.

**Why Gemma 4 is essential** — not optional:
- Without Gemma, uploaded content is just files
- Gemma transforms raw content into structured, searchable, teachable knowledge
- Every core feature depends on Gemma's cultural reasoning capabilities
- The platform would not exist without Gemma as its intelligence layer

---

*MemoryAI Nigeria © 2026 — Preserving Nigeria's Indigenous Wisdom Through AI*
