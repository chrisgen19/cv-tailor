# CV Tailor

An AI-powered CV/resume optimization platform. Upload your master CV once, then create multiple job application entries by pasting job descriptions (text or URL). The system uses **Google Gemini AI** to analyze skill matches, generate gap analysis, and produce tailored CV versions optimized for each specific job posting. Edit inline and export as DOCX.

**Why this exists:** Job hiring managers want specific details matched to their posting. If you have broad experience across multiple programming languages, CMSs, and e-commerce platforms, you need a way to highlight the most relevant parts of your background for each application — so you shine where it matters and increase your chances of getting hired.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Application Structure](#application-structure)
- [Development Phases](#development-phases)
- [Core Features](#core-features)
- [Gemini AI Functions](#gemini-ai-functions)
- [Environment Variables](#environment-variables)
- [UI/UX Guidelines](#uiux-guidelines)
- [Key Constraints](#key-constraints)

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database
- Google Gemini API key
- Cloudflare R2 bucket (for CV file storage)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in your values (see Environment Variables section)

# Run database migration
pnpm prisma migrate dev

# Generate Prisma client
pnpm prisma generate

# Start development server
pnpm dev
```

### Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm type-check   # TypeScript checking
pnpm lint         # Biome linting
pnpm format       # Biome formatting
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router, Server Components) | Full-stack React framework |
| Language | TypeScript (strict mode) | Type safety throughout |
| Package Manager | pnpm | Fast, disk-efficient installs |
| Database | PostgreSQL | Primary data store |
| ORM | Prisma 7 (with `@prisma/adapter-pg`) | Type-safe DB access + migrations |
| Auth | Better Auth | Email/password + Google OAuth |
| AI Provider | Google Gemini via `@google/genai` SDK (`gemini-3.1-pro-preview`) | CV parsing, analysis, generation |
| Styling | Tailwind CSS v4 | Utility-first styling |
| UI Components | shadcn/ui v4 (Base UI) | Accessible component primitives |
| Rich Text Editor | Tiptap (StarterKit + Underline) | Inline CV/cover letter editing with formatting |
| DOCX Export | docx | Generate downloadable DOCX files |
| Job Scraping | @extractus/article-extractor | Scrape job descriptions from URLs |
| File Storage | Cloudflare R2 via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | S3-compatible object storage for CV uploads |
| File Upload UI | react-dropzone | Drag-and-drop file upload zone |
| PDF Parsing | unpdf | Extract text from uploaded PDF CVs (serverless-compatible) |
| DOCX Parsing | mammoth | Extract text from uploaded DOCX CVs |
| Validation | Zod | All form/API validation schemas |
| Formatter/Linter | Biome v2.4 | Single tool for lint + format |
| State Management | Zustand | Client-side UI state only |
| Animations | Framer Motion | Page transitions and card entrance animations |
| Icons | Lucide React | Icon library |
| Date Handling | date-fns | Date formatting and manipulation |
| Toast Notifications | Sonner | Success/error/info notifications |
| Runtime | Node.js 20+ | Server runtime |

---

## Database Schema

### User

```prisma
model User {
  id            String   @id
  name          String
  email         String   @unique
  emailVerified Boolean  @default(false)
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  masterCV        MasterCV?
  jobApplications JobApplication[]
  sessions        Session[]
  accounts        Account[]
}
```

### MasterCV

```prisma
model MasterCV {
  id               String   @id @default(cuid())
  userId           String   @unique
  rawText          String   @db.Text
  originalFileName String
  originalFileUrl  String
  parsedSections   Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### JobApplication

```prisma
model JobApplication {
  id                 String            @id @default(cuid())
  userId             String
  title              String
  company            String
  sourceUrl          String?
  rawDescription     String            @db.Text
  parsedRequirements Json?
  matchAnalysis      Json?
  tailoredCV         String?           @db.Text
  tailoredCVEdited   String?           @db.Text
  coverLetter        String?           @db.Text
  status             ApplicationStatus @default(DRAFT)
  notes              String?           @db.Text
  appliedAt          DateTime?
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([userId, createdAt])
}

enum ApplicationStatus {
  DRAFT
  ANALYZED
  TAILORED
  APPLIED
  REJECTED
  INTERVIEW
  OFFER
}
```

### Better Auth Models

```prisma
model Account { ... }      // managed by Better Auth
model Session { ... }      // managed by Better Auth
model Verification { ... } // managed by Better Auth
```

---

## Application Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx              # Centered auth layout
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + header + error boundary
│   │   ├── dashboard/page.tsx      # Stats, recent apps, quick actions
│   │   ├── cv/page.tsx             # Master CV upload + parsed sections display
│   │   ├── applications/
│   │   │   ├── page.tsx            # List with filters, search, sort, bulk actions
│   │   │   ├── new/page.tsx        # Create via paste text or scrape URL
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # 4-tab detail view (description, analysis, CV, cover letter)
│   │   │       └── edit/page.tsx   # Edit job details
│   │   └── settings/page.tsx       # Profile editing, account deletion
│   ├── api/
│   │   ├── auth/[...all]/route.ts
│   │   ├── cv/
│   │   │   ├── route.ts            # GET current CV
│   │   │   ├── presigned-url/route.ts
│   │   │   └── upload/route.ts     # Confirm upload + extract + parse
│   │   ├── scrape/route.ts         # Scrape job posting from URL
│   │   ├── dashboard/route.ts      # Aggregated stats
│   │   ├── settings/
│   │   │   ├── profile/route.ts    # PATCH name
│   │   │   └── account/route.ts    # DELETE account
│   │   └── applications/
│   │       ├── route.ts            # GET list, POST create
│   │       ├── bulk-status/route.ts
│   │       └── [id]/
│   │           ├── route.ts        # GET, PATCH, DELETE
│   │           ├── analyze/route.ts
│   │           ├── tailor/route.ts
│   │           ├── cover-letter/route.ts
│   │           └── export/route.ts # DOCX download
│   ├── layout.tsx                  # Root layout (Inter font, Toaster)
│   ├── page.tsx                    # Landing page
│   └── globals.css                 # Dark theme + light mode
├── components/
│   ├── ui/                         # shadcn/ui components (Base UI)
│   ├── cv/                         # cv-upload-zone, cv-section-display
│   ├── applications/               # application-card, application-filters, status-badge, match-score-ring
│   ├── editor/                     # tiptap-editor with toolbar
│   ├── layout/                     # sidebar, header, mobile-nav
│   └── error-boundary.tsx
├── lib/
│   ├── auth.ts                     # Better Auth server config
│   ├── auth-client.ts              # Better Auth client (signIn, signUp, signOut, useSession)
│   ├── prisma.ts                   # Prisma client singleton with PrismaPg adapter
│   ├── gemini.ts                   # All Gemini AI functions
│   ├── r2.ts                       # Cloudflare R2 presigned URL helpers
│   ├── scraper.ts                  # URL → job description extraction
│   ├── cv-parser.ts                # PDF/DOCX → text extraction
│   ├── export.ts                   # DOCX generation (markdown → structured document)
│   ├── validations.ts              # All Zod schemas
│   └── utils.ts                    # cn() utility
├── store/
│   └── ui-store.ts                 # Zustand: sidebar state
├── generated/prisma/               # Prisma generated client
└── proxy.ts                        # Route protection (Next.js 16 proxy)
```

---

## Development Phases

### Phase 1 — Foundation & Auth ✅

**Goal:** Working Next.js app with auth, database, and layout shell.

- [x] Next.js project with pnpm, TypeScript strict mode, `src/` directory
- [x] Tailwind CSS v4 with dark mode by default
- [x] Biome v2.4 for linting and formatting
- [x] shadcn/ui v4 (Base UI) components
- [x] PostgreSQL + Prisma 7 with PrismaPg adapter, initial migration
- [x] Better Auth (email/password + Google OAuth)
- [x] Proxy route protection (Next.js 16)
- [x] Auth pages (sign-in, sign-up) with email/password + Google OAuth
- [x] Dashboard layout (sidebar + header + mobile bottom nav)
- [x] Zustand UI store
- [x] Landing page
- [x] All dashboard page stubs

---

### Phase 2 — Master CV Management ✅

**Goal:** Upload, parse, and display master CV with Gemini AI.

- [x] Cloudflare R2 client with presigned URL helpers
- [x] react-dropzone drag-and-drop upload
- [x] unpdf + mammoth text extraction
- [x] Presigned URL + upload confirmation API routes
- [x] Gemini `parseCV()` → structured JSON sections
- [x] CV management page with upload zone + parsed sections display
- [x] Re-upload/replace support (one-to-one)

---

### Phase 3 — Job Applications CRUD + Scraping ✅

**Goal:** Full job application lifecycle with URL scraping and AI metadata extraction.

- [x] Applications list page with filters, search, sort, pagination, bulk status update
- [x] New application page with two-tab input (paste text / scrape URL)
- [x] Application CRUD API routes (GET list, POST create, GET/PATCH/DELETE single, bulk status)
- [x] URL scraping with @extractus/article-extractor + HTML fallback
- [x] Gemini `extractJobMeta()` and `parseJobRequirements()` functions
- [x] Application detail page with 4-tab interface
- [x] Application edit page
- [x] Status badge, application card, filter components

---

### Phase 4 — AI Pipeline + Editor ✅

**Goal:** Match analysis, tailored CV generation, cover letter generation with Tiptap editing.

- [x] Gemini `analyzeMatch()` — score, matched/missing skills with evidence, recommendations
- [x] Gemini `tailorCV()` — optimized CV markdown (never fabricates experience)
- [x] Gemini `generateCoverLetter()` — 3-4 paragraph tailored cover letter
- [x] API routes: `/analyze`, `/tailor`, `/cover-letter`
- [x] Tiptap editor with toolbar (bold, italic, underline, headings, lists, undo/redo)
- [x] Match Analysis tab — circular score ring (color-coded), matched/missing skills, recommendations
- [x] Tailored CV tab — Tiptap editor, auto-save (debounced 2s), copy, regenerate with confirmation
- [x] Cover Letter tab — same editor setup with auto-save
- [x] Save indicator (saving/saved states)

---

### Phase 5 — Export, Dashboard & Polish ✅

**Goal:** DOCX export, real dashboard, settings, and UI polish.

- [x] DOCX export with markdown → structured document conversion
- [x] Export API route (`GET /api/applications/[id]/export?type=cv&format=docx`)
- [x] Export buttons on Tailored CV and Cover Letter tabs
- [x] Dashboard with real stats (total, applied, interviews, offers, avg match score)
- [x] Recent applications list with status badges and match scores
- [x] Quick action buttons (Upload CV, New Application)
- [x] Settings page with profile editing and account deletion
- [x] Settings API routes (profile update, account delete with cascade)
- [x] Error boundary wrapping dashboard content
- [x] Framer Motion stagger animations (dashboard cards, application list)
- [x] Sonner toast notifications on all mutations

---

## Core Features

### 1. Authentication (Better Auth)

- Email/password sign-up
- Google OAuth sign-in
- Protected routes via proxy — redirect unauthenticated users to /sign-in
- Session management with Better Auth
- Sign-out from header dropdown

### 2. Master CV Management (`/cv`)

**Upload Flow:**
1. User uploads PDF or DOCX via drag-and-drop zone (react-dropzone → presigned URL → Cloudflare R2)
2. Server extracts raw text (PDF → unpdf, DOCX → mammoth)
3. Gemini parses text into structured JSON (contact, summary, experience[], education[], skills{}, certifications[])
4. Store `rawText` and `parsedSections` in MasterCV
5. Display parsed CV as section cards

**UI States:**
- No CV → prominent upload CTA
- CV exists → parsed sections with re-upload option
- "Last updated" timestamp

### 3. Job Application CRUD (`/applications`)

**List View:**
- Cards with title, company, status badge, date, notes preview
- Filter by status, search by title/company, sort by date/title/company
- Bulk status update with selection checkboxes
- Delete with confirmation dialog
- Pagination

**Create New (`/applications/new`):**
- Two tabs: Paste Text / From URL
- URL tab: scrape → auto-fill description, title, company
- Saves as DRAFT → redirects to detail page

**Detail View (`/applications/[id]`) — 4 tabs:**

| Tab | Content |
|-----|---------|
| Job Description | Raw description + parsed requirements (skills, responsibilities, qualifications) |
| Match Analysis | Score ring (0–100, green/amber/red), matched skills with evidence, missing skills with suggestions, recommendations |
| Tailored CV | Tiptap editor, auto-save (2s debounce), copy to clipboard, DOCX export, regenerate with confirmation |
| Cover Letter | Tiptap editor, auto-save, copy, DOCX export, regenerate with confirmation |

### 4. URL Scraping

Uses `@extractus/article-extractor` with HTML fetch fallback. Extracts job posting text and auto-fills title/company via Gemini.

### 5. Export

**DOCX Export** via `docx` package — markdown parsed to structured blocks with proper headings, bullet points, spacing, and standard resume margins. Available for both tailored CVs and cover letters.

### 6. Dashboard (`/dashboard`)

- Stats cards: Total Applications, Applied, Interviews, Offers
- Average match score across analyzed applications
- Recent 5 applications with status + match score
- Quick actions: Upload CV, New Application
- Framer Motion stagger animations

### 7. Settings (`/settings`)

- Edit profile name
- Account deletion with confirmation (cascading delete of all data)

---

## Gemini AI Functions

All functions in `lib/gemini.ts` with retry mechanism (2 retries, exponential backoff).

| Function | Input | Output |
|----------|-------|--------|
| `parseCV()` | Raw CV text | `{ contact, summary, experience[], education[], skills{}, certifications[] }` |
| `extractJobMeta()` | Job description | `{ title, company }` |
| `parseJobRequirements()` | Job description | `{ requiredSkills[], preferredSkills[], responsibilities[], qualifications[], experienceLevel, employmentType }` |
| `analyzeMatch()` | CV text + job description | `{ matchScore, summary, matchedSkills[], missingSkills[], recommendations[] }` |
| `tailorCV()` | CV text + job description + match analysis | Tailored CV as markdown |
| `generateCoverLetter()` | CV text + job description + company + title | Cover letter as markdown |

---

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cvtailor"
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GEMINI_API_KEY="..."
CLOUDFLARE_R2_ACCESS_KEY_ID="..."
CLOUDFLARE_R2_SECRET_ACCESS_KEY="..."
CLOUDFLARE_R2_BUCKET_NAME="cv-tailor"
CLOUDFLARE_R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
```

---

## UI/UX Guidelines

### Design Direction
- **Dark mode by default** with clean, professional aesthetic
- Dark navy/slate backgrounds (`oklch(0.145 0.014 260)`)
- Teal accent color (`oklch(0.72 0.15 185)`) for primary actions
- Green/amber/red for score indicators
- Cards with subtle ring borders, rounded corners

### Typography
- Font: **Inter** (via `next/font`) with **JetBrains Mono** for monospace

### Layout
- Fixed left sidebar (hidden on mobile)
- Bottom nav on mobile (md breakpoint)
- Content area centered with max-w-5xl
- Cards stack vertically on mobile

### States
- **Loading** — Loader2 spinner for async operations
- **Error** — Error boundary + toast notifications
- **Empty** — Icons with clear CTAs
- **Success** — Sonner toast notifications

---

## Key Constraints

1. **No fabrication** — AI must never invent experience or skills. Only reorganize, emphasize, and rephrase.
2. **One active CV** — One master CV per user (one-to-one).
3. **Auth-gated everything** — All routes and data are protected. Users access only their own data.
4. **Structured AI output** — `responseMimeType: "application/json"` for structured responses.
5. **No client-side secrets** — API keys and DB URLs only on server.
6. **Server-side mutations** — All mutations through API routes.
7. **Dual CV storage** — Separate `tailoredCV` (AI-generated) and `tailoredCVEdited` (user-edited).
8. **Input validation** — Zod schemas on all inputs.
9. **Graceful AI errors** — Retry mechanism, user-friendly error messages.
10. **Type safety** — TypeScript strict mode, Prisma-generated types.
11. **Biome only** — No ESLint or Prettier.
12. **pnpm only** — No npm or yarn.
