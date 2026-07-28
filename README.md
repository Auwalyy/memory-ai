# MemoryAI Nigeria

> **Every Elder is a Library. Every Story Matters.**

An AI-powered Indigenous Knowledge Preservation Platform built for Nigeria, leveraging **Google Gemma 4** to preserve, understand, organize, and make accessible indigenous knowledge across Hausa, Yoruba, and Igbo languages.

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
