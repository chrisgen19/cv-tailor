# CV Tailor

An AI-powered web application that tailors your CV and generates cover letters based on job descriptions. Upload your master CV, paste or scrape a job posting, and get an optimized, job-specific CV and cover letter in seconds.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Application Structure](#application-structure)
- [Development Phases](#development-phases)
- [Core Features](#core-features)
- [Environment Variables](#environment-variables)
- [UI/UX Guidelines](#uiux-guidelines)
- [Key Constraints](#key-constraints)

---

## Project Overview

CV Tailor solves the tedious problem of manually customizing a CV for every job application. Users upload a master CV once, then for each job application they either paste a job description or provide a URL. The AI pipeline:

1. Parses the master CV into structured sections
2. Scrapes and analyzes the job description
3. Generates a match score with skill gap analysis
4. Produces a tailored CV that highlights relevant experience
5. Writes a personalized cover letter

All generated content is editable in a rich text editor and exportable as PDF or DOCX.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | Full-stack React framework |
| Language | TypeScript 5 (strict mode) | Type safety throughout |
| Styling | Tailwind CSS v4 | Utility-first styling |
| UI Components | shadcn/ui | Accessible component primitives |
| Linting/Formatting | Biome | Single tool for lint + format |
| Auth | Better Auth | Email/password + Google OAuth |
| Database | PostgreSQL | Primary data store |
| ORM | Prisma 6 | Type-safe DB access + migrations |
| File Upload | UploadThing | PDF/DOCX upload with storage |
| PDF Parsing | pdf-parse | Extract text from PDF files |
| DOCX Parsing | mammoth | Extract text from DOCX files |
| AI Provider | Google Gemini (gemini-2.0-flash) | CV parsing, analysis, generation |
| AI SDK | Vercel AI SDK | Structured AI output + streaming |
| Rich Text Editor | Tiptap | Editable CV/cover letter output |
| PDF Export | @react-pdf/renderer | Generate downloadable PDFs |
| DOCX Export | docx | Generate downloadable DOCX files |
| Job Scraping | @extractus/article-extractor | Scrape job descriptions from URLs |
| Animations | Framer Motion | UI transitions and feedback |
| Icons | Lucide React | Icon library |
| Package Manager | pnpm | Fast, disk-efficient installs |
| Runtime | Node.js 20+ | Server runtime |

---

## Database Schema

### Models Overview

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  emailVerified Boolean  @default(false)
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  accounts      Account[]
  sessions      Session[]
  masterCVs     MasterCV[]
  applications  JobApplication[]
}

model MasterCV {
  id          String   @id @default(cuid())
  userId      String
  fileName    String
  fileUrl     String
  fileType    String   // "pdf" | "docx"
  rawText     String   @db.Text
  parsedData  Json     // structured sections from AI
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  applications JobApplication[]
}

model JobApplication {
  id              String            @id @default(cuid())
  userId          String
  masterCVId      String?
  jobTitle        String
  company         String
  jobUrl          String?
  jobDescription  String            @db.Text
  status          ApplicationStatus @default(SAVED)
  appliedAt       DateTime?
  notes           String?           @db.Text
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  masterCV    MasterCV?  @relation(fields: [masterCVId], references: [id])
  analysis    MatchAnalysis?
  tailoredCV  TailoredCV?
  coverLetter CoverLetter?
}

enum ApplicationStatus {
  SAVED
  APPLIED
  INTERVIEWING
  OFFERED
  REJECTED
  WITHDRAWN
}

model MatchAnalysis {
  id               String   @id @default(cuid())
  applicationId    String   @unique
  matchScore       Int      // 0–100
  matchedSkills    String[] // skills present in both CV and JD
  missingSkills    String[] // skills in JD but not in CV
  recommendations  String[] // AI suggestions
  rawResponse      Json     // full AI response
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  application JobApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model TailoredCV {
  id            String   @id @default(cuid())
  applicationId String   @unique
  content       String   @db.Text  // HTML from Tiptap
  rawJson       Json     // structured sections
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  application JobApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model CoverLetter {
  id            String   @id @default(cuid())
  applicationId String   @unique
  content       String   @db.Text  // HTML from Tiptap
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  application JobApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

// Better Auth required models
model Account { ... }
model Session { ... }
model Verification { ... }
```

---

## Application Structure

```
cv-tailor/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   │   └── page.tsx
│   │   └── sign-up/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + header shell
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Stats, recent activity
│   │   ├── cv/
│   │   │   └── page.tsx            # Master CV management
│   │   ├── applications/
│   │   │   ├── page.tsx            # Applications list
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Create new application
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Application detail (tabs)
│   │   │       ├── analysis/
│   │   │       │   └── page.tsx    # Match analysis results
│   │   │       ├── tailored-cv/
│   │   │       │   └── page.tsx    # Tailored CV editor
│   │   │       └── cover-letter/
│   │   │           └── page.tsx    # Cover letter editor
│   │   └── settings/
│   │       └── page.tsx            # Profile + account settings
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...all]/
│   │   │       └── route.ts        # Better Auth handler
│   │   ├── cv/
│   │   │   ├── upload/
│   │   │   │   └── route.ts        # UploadThing handler
│   │   │   └── parse/
│   │   │       └── route.ts        # AI CV parsing
│   │   ├── applications/
│   │   │   ├── route.ts            # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts        # GET, PATCH, DELETE
│   │   │       ├── scrape/
│   │   │       │   └── route.ts    # Scrape job URL
│   │   │       ├── analyze/
│   │   │       │   └── route.ts    # Run match analysis
│   │   │       ├── tailor/
│   │   │       │   └── route.ts    # Generate tailored CV
│   │   │       └── cover-letter/
│   │   │           └── route.ts    # Generate cover letter
│   │   └── uploadthing/
│   │       └── route.ts
│   ├── layout.tsx
│   └── page.tsx                    # Landing page
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   ├── cv/
│   │   ├── cv-upload.tsx
│   │   └── cv-preview.tsx
│   ├── applications/
│   │   ├── application-card.tsx
│   │   ├── application-filters.tsx
│   │   └── status-badge.tsx
│   ├── editor/
│   │   ├── tiptap-editor.tsx
│   │   └── editor-toolbar.tsx
│   └── shared/
│       ├── loading-skeleton.tsx
│       └── empty-state.tsx
├── lib/
│   ├── auth.ts                     # Better Auth config
│   ├── auth-client.ts              # Client-side auth
│   ├── prisma.ts                   # Prisma client singleton
│   ├── uploadthing.ts              # UploadThing config
│   ├── gemini.ts                   # Gemini client + prompts
│   └── utils.ts                   # cn() + helpers
├── hooks/
│   ├── use-debounce.ts
│   └── use-auto-save.ts
├── types/
│   └── index.ts                    # Shared TypeScript types
├── prisma/
│   └── schema.prisma
├── middleware.ts                   # Route protection
├── biome.json
├── next.config.ts
└── .env.local
```

---

## Development Phases

### Phase 1 — Foundation & Auth

**Goal:** Working Next.js app with auth, database, and layout shell. Users can sign up, sign in, and see the empty dashboard.

- [ ] Initialize Next.js 15 project with pnpm, TypeScript strict mode
- [ ] Configure Tailwind CSS v4
- [ ] Configure Biome for linting and formatting
- [ ] Install and configure shadcn/ui
- [ ] Set up PostgreSQL database (local + connection string)
- [ ] Define Prisma schema (all models) and run initial migration
- [ ] Install and configure Better Auth (email/password + Google OAuth)
- [ ] Create Better Auth API route handler (`/api/auth/[...all]`)
- [ ] Create middleware for route protection (redirect unauthenticated users)
- [ ] Build sign-in page with email/password form + Google button
- [ ] Build sign-up page with name/email/password form
- [ ] Build dashboard layout shell (sidebar + header with user menu)
- [ ] Build landing page (hero, features overview, CTA to sign up)
- [ ] Stub out all dashboard pages with placeholder content
- [ ] Verify: sign up → email/password → redirect to dashboard ✓
- [ ] Verify: Google OAuth flow works ✓
- [ ] Verify: unauthenticated users are redirected to sign-in ✓

**Deliverable:** Deployed (or locally runnable) app with working auth and empty dashboard.

---

### Phase 2 — Master CV Management

**Goal:** Users can upload a PDF or DOCX CV, have it parsed into structured sections by AI, and manage their master CV.

- [ ] Install UploadThing and configure file router (PDF + DOCX, max 10MB)
- [ ] Install pdf-parse and mammoth for file text extraction
- [ ] Build CV upload API route (upload → extract text → store raw)
- [ ] Write Gemini prompt for CV parsing (structured JSON: contact, summary, experience, education, skills, certifications)
- [ ] Build CV parse API route (raw text → AI → structured `parsedData` JSON)
- [ ] Build CV management page (`/cv`):
  - Upload dropzone with file type validation
  - Show currently active CV (file name, upload date, parsed sections preview)
  - Re-upload option (replaces active CV)
  - Parsed sections accordion (contact, summary, experience, education, skills)
- [ ] Add loading states for upload and parse steps
- [ ] Add error handling for unsupported files and parse failures
- [ ] Verify: upload PDF → text extracted → AI parses → sections displayed ✓
- [ ] Verify: upload DOCX → same flow ✓
- [ ] Verify: re-upload replaces previous active CV ✓

**Deliverable:** Users can manage a master CV that is stored, parsed, and viewable.

---

### Phase 3 — Job Applications CRUD + Scraping

**Goal:** Full job application lifecycle — create, view, edit, delete — with job description input (manual or URL-scraped) and AI-extracted metadata.

- [ ] Build applications list page (`/applications`):
  - Application cards with job title, company, status badge, date
  - Filter by status (All / Saved / Applied / Interviewing / Offered / Rejected)
  - Search by job title or company
  - Sort by date created / date applied / company name
  - Empty state with CTA to create first application
- [ ] Build new application form (`/applications/new`):
  - Fields: Job Title, Company, Job URL (optional), Job Description (textarea)
  - "Scrape from URL" button — calls scrape API and populates job description
  - Status selector (defaults to SAVED)
  - Notes textarea (optional)
- [ ] Build application CRUD API routes:
  - `GET /api/applications` — paginated list, filter/search/sort params
  - `POST /api/applications` — create
  - `GET /api/applications/[id]` — single application with relations
  - `PATCH /api/applications/[id]` — update status, notes, fields
  - `DELETE /api/applications/[id]` — delete with confirmation
- [ ] Install @extractus/article-extractor for URL scraping
- [ ] Build scrape API route (`POST /api/applications/[id]/scrape`):
  - Fetch and extract article text from job URL
  - Call Gemini to extract job title and company name from scraped text
  - Return extracted text + metadata
- [ ] Build application detail page (`/applications/[id]`):
  - Header: job title, company, status badge (editable), applied date
  - Tab 1 — Job Description: full text, source URL link
  - Tab 2 — Requirements: AI-parsed requirements (populated after analysis)
  - Tab 3 — Notes: editable notes textarea with auto-save
  - Action buttons: Run Analysis, Generate Tailored CV, Generate Cover Letter
- [ ] Verify: create application manually → appears in list ✓
- [ ] Verify: paste URL → scrape → job description populated ✓
- [ ] Verify: status update persists ✓
- [ ] Verify: delete application removes all related records ✓

**Deliverable:** Complete job application management with manual entry and URL scraping.

---

### Phase 4 — AI Pipeline + Editor

**Goal:** The core "smart" features — match analysis, tailored CV generation, cover letter generation — all editable in a rich text editor with auto-save.

- [ ] Write Gemini prompt for match analysis:
  - Input: master CV parsedData + job description
  - Output: `{ matchScore: number, matchedSkills: string[], missingSkills: string[], recommendations: string[] }`
- [ ] Build analyze API route (`POST /api/applications/[id]/analyze`):
  - Validate master CV exists for user
  - Call Gemini with structured output schema
  - Store result in `MatchAnalysis` model
- [ ] Build analysis results UI (`/applications/[id]/analysis`):
  - Match score ring/progress indicator
  - Matched skills (green badges)
  - Missing skills (red/orange badges)
  - AI recommendations list
  - "Re-run Analysis" button
- [ ] Write Gemini prompt for CV tailoring:
  - Input: master CV parsedData + job description + match analysis
  - Output: complete tailored CV as structured JSON sections
- [ ] Build tailor API route (`POST /api/applications/[id]/tailor`):
  - Convert structured JSON to HTML for Tiptap
  - Store in `TailoredCV` model
- [ ] Write Gemini prompt for cover letter generation:
  - Input: master CV parsedData + job description + company + role
  - Output: professional cover letter as HTML
- [ ] Build cover letter API route (`POST /api/applications/[id]/cover-letter`)
- [ ] Install and configure Tiptap with extensions:
  - StarterKit, Heading, Bold, Italic, BulletList, OrderedList, Underline
- [ ] Build Tiptap editor component with toolbar (bold, italic, headings, lists)
- [ ] Build tailored CV editor page (`/applications/[id]/tailored-cv`):
  - Tiptap editor pre-populated with generated content
  - Toolbar + word count
  - Export buttons (PDF, DOCX)
  - Auto-save indicator
- [ ] Build cover letter editor page (`/applications/[id]/cover-letter`):
  - Same editor setup as tailored CV
- [ ] Implement auto-save with 1.5s debounce (PATCH API on content change)
- [ ] Verify: run analysis → score + skills displayed ✓
- [ ] Verify: generate tailored CV → opens in editor, editable ✓
- [ ] Verify: generate cover letter → opens in editor, editable ✓
- [ ] Verify: edit content → auto-saves within 2 seconds ✓

**Deliverable:** Full AI pipeline from job description to editable, personalized CV and cover letter.

---

### Phase 5 — Export, Dashboard & Polish

**Goal:** PDF/DOCX export, a real dashboard with stats, settings page, and full UI polish.

- [ ] Install @react-pdf/renderer for PDF export
- [ ] Build PDF template component (clean, professional layout matching CV structure)
- [ ] Build PDF export API route or client-side generation
- [ ] Install docx package for DOCX export
- [ ] Build DOCX generation utility (map Tiptap HTML → docx elements)
- [ ] Wire up export buttons on tailored CV and cover letter pages
- [ ] Build dashboard page (`/dashboard`):
  - Stats cards: Total Applications, Applied, Interviews, Offers
  - Recent applications list (last 5, with status)
  - Quick action buttons: Upload CV, New Application
  - Average match score (if analyses exist)
- [ ] Build settings page (`/settings`):
  - Profile section: update name, profile photo
  - Account section: change email, change password
  - Danger zone: delete account (with confirmation dialog)
- [ ] Add Framer Motion animations:
  - Page transitions (fade/slide)
  - Card entrance animations (stagger)
  - Loading skeleton shimmer
- [ ] Add toast notifications (shadcn/ui Sonner) for all async actions
- [ ] Add error boundaries for AI generation failures
- [ ] Add empty states with illustration + CTA for all list pages
- [ ] Polish responsive layout (mobile sidebar as sheet/drawer)
- [ ] Audit loading states across all async operations
- [ ] Final accessibility pass (focus management, ARIA labels, keyboard nav)
- [ ] Verify: export tailored CV as PDF → downloads correctly ✓
- [ ] Verify: export cover letter as DOCX → downloads correctly ✓
- [ ] Verify: dashboard stats reflect actual application data ✓
- [ ] Verify: settings updates persist ✓
- [ ] Verify: app is usable on mobile viewport ✓

**Deliverable:** Production-ready application — fully featured, polished, exportable.

---

## Core Features

### Master CV Management
- Single active master CV per user at any time
- Supports PDF and DOCX formats (max 10MB)
- File stored via UploadThing; raw text and AI-parsed JSON stored in DB
- Parsed sections: Contact Info, Professional Summary, Work Experience, Education, Skills, Certifications
- Can re-upload at any time; previous CV is replaced (not deleted, for audit trail)

### Job Application Tracking
- Status workflow: Saved → Applied → Interviewing → Offered / Rejected / Withdrawn
- Each application stores: job title, company, URL, full job description, status, applied date, notes
- URL scraping extracts clean job description text and auto-fills title/company via AI
- Applications filterable by status, searchable by title/company, sortable by date

### AI Match Analysis
- Compares master CV structured data against job description
- Outputs match score (0–100), matched skills, missing skills, improvement recommendations
- Analysis stored per application; can be re-run after CV update
- Results displayed with visual score indicator and color-coded skill badges

### AI CV Tailoring
- Reorganizes and rewrites CV sections to emphasize skills matching the job description
- Incorporates missing keywords naturally where experience supports it
- Output is full CV as structured HTML, editable in Tiptap
- Does not fabricate experience — only highlights and reframes existing content

### AI Cover Letter Generation
- Generates personalized cover letter referencing specific role, company, and requirements
- Tone: professional but human, 3–4 paragraphs
- References specific experiences from master CV that match the role
- Output is editable HTML in Tiptap

### Editor & Export
- Tiptap rich text editor for all generated content
- Toolbar: Bold, Italic, Underline, Headings (H1–H3), Bullet List, Ordered List
- Auto-save with debounce on every content change
- Export to PDF (formatted, print-ready) and DOCX

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cv_tailor"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"

# UploadThing
UPLOADTHING_TOKEN="your-uploadthing-token"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## UI/UX Guidelines

### Design Direction
- Clean, minimal SaaS aesthetic — think Linear or Vercel dashboard
- Light mode primary, dark mode supported via Tailwind dark classes
- Neutral gray base palette with a blue or indigo accent color
- Consistent spacing using Tailwind's spacing scale (no magic numbers)

### Layout
- Sidebar navigation (fixed, 240px wide on desktop)
- Sidebar collapses to icon-only on tablet, sheet/drawer on mobile
- Content area max-width: `max-w-5xl` centered
- Cards for grouped content, no heavy borders — use subtle shadows

### States
Every interactive feature must handle:
- **Loading** — skeleton loaders or spinner with context label
- **Error** — inline error message with retry option
- **Empty** — illustrated empty state with a clear next-action CTA
- **Success** — toast notification, optimistic UI updates where safe

### Typography
- Font: Inter (via `next/font`)
- Headings: `font-semibold`, body: `font-normal`
- Consistent heading hierarchy per page (one H1, supporting H2/H3)

### AI Generation UX
- Show streaming progress indicator during AI calls (not just a spinner)
- Disable action buttons while generation is in progress
- Show last-generated timestamp on editor pages
- "Re-generate" always available with a confirmation if content has been edited

---

## Key Constraints

1. **No fabrication** — AI must never invent experience, qualifications, or skills. Only reorganize, emphasize, and rephrase existing CV content.
2. **One active CV** — Only one master CV is active per user at a time. All applications reference the CV active at time of analysis.
3. **Auth-gated everything** — All dashboard routes, API routes, and data are protected. Users can only access their own data.
4. **AI responses must be structured** — Use Vercel AI SDK `generateObject` with explicit Zod schemas for all AI calls. Never parse free-text AI responses.
5. **No client-side secrets** — Gemini API key, DB URL, and auth secrets must never be exposed to the browser.
6. **Type safety throughout** — TypeScript strict mode, no `any`, Prisma-generated types for all DB access.
7. **Biome over ESLint/Prettier** — Single tool for both linting and formatting. Do not add ESLint or Prettier.
8. **pnpm only** — Do not use npm or yarn. Lock file is `pnpm-lock.yaml`.
