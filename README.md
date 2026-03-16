# CV Tailor

An AI-powered CV/resume optimization platform. Upload your master CV once, then create multiple job application entries by pasting job descriptions (text or URL). The system uses **Google Gemini AI** to analyze skill matches, generate gap analysis, and produce tailored CV versions optimized for each specific job posting. Edit inline and export as PDF or DOCX.

**Why this exists:** Job hiring managers want specific details matched to their posting. If you have broad experience across multiple programming languages, CMSs, and e-commerce platforms, you need a way to highlight the most relevant parts of your background for each application — so you shine where it matters and increase your chances of getting hired.

---

## Table of Contents

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

## Tech Stack

Use latest stable versions of everything.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) | Full-stack React framework |
| Language | TypeScript (strict mode) | Type safety throughout |
| Package Manager | pnpm | Fast, disk-efficient installs |
| Database | PostgreSQL | Primary data store |
| ORM | Prisma | Type-safe DB access + migrations |
| Auth | Better Auth | Email/password + Google OAuth |
| AI | Google Gemini via `@google/genai` SDK (`gemini-2.5-flash`) | CV parsing, analysis, generation |
| Styling | Tailwind CSS v4 | Utility-first styling |
| UI Components | shadcn/ui | Accessible component primitives |
| Rich Text Editor | Tiptap | Inline CV/cover letter editing with formatting |
| PDF Export | @react-pdf/renderer | Generate downloadable PDFs |
| DOCX Export | docx | Generate downloadable DOCX files |
| Job Scraping | @extractus/article-extractor | Scrape job descriptions from URLs |
| File Upload | UploadThing | CV file uploads (PDF/DOCX) |
| PDF Parsing | pdf-parse | Extract text from uploaded PDF CVs |
| DOCX Parsing | mammoth | Extract text from uploaded DOCX CVs |
| Validation | Zod | All form/API validation schemas |
| Formatter/Linter | Biome | Single tool for lint + format |
| State Management | Zustand | Client-side UI state only (all data via server) |
| Animations | Framer Motion | Page transitions and micro-interactions |
| Icons | Lucide React | Icon library |
| Date Handling | date-fns | Date formatting and manipulation |
| Toast Notifications | Sonner | Success/error/info notifications |
| Runtime | Node.js 20+ | Server runtime |

---

## Database Schema

### User

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  emailVerified Boolean  @default(false)
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  masterCV        MasterCV?        // one-to-one
  jobApplications JobApplication[]
  sessions        Session[]
  accounts        Account[]
}
```

### MasterCV

```prisma
model MasterCV {
  id               String   @id @default(cuid())
  userId           String   @unique // one-to-one with User
  rawText          String   @db.Text // full extracted text content
  originalFileName String
  originalFileUrl  String   // stored upload URL
  parsedSections   Json     // structured: contact, summary, experience[], education[], skills[], certifications[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### JobApplication

```prisma
model JobApplication {
  id                  String            @id @default(cuid())
  userId              String
  title               String            // job title — auto-extracted or user-provided
  company             String            // company name — auto-extracted or user-provided
  sourceUrl           String?           // if pasted from URL
  rawDescription      String            @db.Text // full job description text
  parsedRequirements  Json?             // structured: requiredSkills[], preferredSkills[], responsibilities[], qualifications[]
  matchAnalysis       Json?             // Gemini output: matchScore, matchedSkills[], missingSkills[], recommendations[]
  tailoredCV          String?           @db.Text // AI-generated tailored CV markdown
  tailoredCVEdited    String?           @db.Text // user's edited version, defaults to tailoredCV
  coverLetter         String?           @db.Text // generated cover letter
  status              ApplicationStatus @default(DRAFT)
  notes               String?           @db.Text
  appliedAt           DateTime?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

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
model Account { ... } // managed by Better Auth
model Session { ... } // managed by Better Auth
model Verification { ... } // managed by Better Auth
```

---

## Application Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx              # Centered auth layout, no sidebar
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + header layout
│   │   ├── dashboard/page.tsx      # Overview: stats, recent applications
│   │   ├── cv/
│   │   │   └── page.tsx            # Manage master CV: upload, view, re-upload
│   │   ├── applications/
│   │   │   ├── page.tsx            # List all job applications with filters/search
│   │   │   ├── new/page.tsx        # Create new job application
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Single application detail view (4 tabs)
│   │   │       └── edit/page.tsx   # Edit job description/details
│   │   └── settings/page.tsx       # Profile, preferences
│   ├── api/
│   │   ├── auth/[...all]/route.ts  # Better Auth catch-all
│   │   ├── cv/upload/route.ts      # Handle CV file upload + text extraction
│   │   ├── scrape/route.ts         # Extract job posting from URL
│   │   ├── applications/
│   │   │   ├── route.ts            # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts        # GET, PATCH, DELETE
│   │   │       ├── analyze/route.ts      # Trigger Gemini analysis
│   │   │       ├── tailor/route.ts       # Trigger Gemini CV tailoring
│   │   │       ├── cover-letter/route.ts # Trigger Gemini cover letter
│   │   │       └── export/route.ts       # Generate PDF or DOCX
│   │   └── uploadthing/route.ts
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Landing/marketing page → redirect if logged in
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── auth/                       # Sign-in form, sign-up form
│   ├── cv/                         # cv-upload-zone, cv-viewer, cv-section-display
│   ├── applications/               # application-card, application-list, status-badge
│   ├── editor/                     # tiptap-editor, toolbar, export-buttons
│   ├── analysis/                   # score-ring, skill-badges, gap-analysis, match-summary
│   └── layout/                     # sidebar, header, mobile-nav
├── lib/
│   ├── auth.ts                     # Better Auth server config
│   ├── auth-client.ts              # Better Auth client
│   ├── prisma.ts                   # Prisma client singleton
│   ├── gemini.ts                   # Gemini AI client + all prompt functions
│   ├── scraper.ts                  # URL → job description extraction
│   ├── cv-parser.ts                # PDF/DOCX → text extraction
│   ├── export.ts                   # PDF and DOCX generation functions
│   └── validations.ts              # All Zod schemas
├── hooks/
│   ├── use-applications.ts
│   └── use-cv.ts
├── store/
│   └── ui-store.ts                 # Zustand: sidebar state, modals, etc.
├── middleware.ts                    # Route protection
├── prisma/
│   └── schema.prisma
├── biome.json
├── next.config.ts
└── .env.local
```

---

## Development Phases

### Phase 1 — Foundation & Auth

**Goal:** Working Next.js app with auth, database, and layout shell. Users can sign up, sign in, and see the empty dashboard.

- [ ] Initialize Next.js 15 project with pnpm, TypeScript strict mode, `src/` directory
- [ ] Configure Tailwind CSS v4
- [ ] Configure Biome for linting and formatting
- [ ] Install and configure shadcn/ui
- [ ] Set up PostgreSQL database (local + connection string)
- [ ] Define Prisma schema (all models including indexes) and run initial migration
- [ ] Install and configure Better Auth (email/password with email verification + Google OAuth)
- [ ] Create Better Auth API route handler (`/api/auth/[...all]`)
- [ ] Create middleware for route protection (redirect unauthenticated users to /sign-in)
- [ ] Build centered auth layout (`(auth)/layout.tsx`)
- [ ] Build sign-in page with email/password form + Google OAuth button
- [ ] Build sign-up page with name/email/password form + email verification
- [ ] Build dashboard layout shell (sidebar + header with user dropdown)
- [ ] Set up Zustand UI store (sidebar state, modals)
- [ ] Build landing/marketing page (hero, features, CTA → redirect if logged in)
- [ ] Stub out all dashboard pages with placeholder content
- [ ] Verify: sign up → email/password → redirect to dashboard
- [ ] Verify: Google OAuth flow works
- [ ] Verify: unauthenticated users are redirected to sign-in

**Deliverable:** Locally runnable app with working auth, session management, and empty dashboard shell.

---

### Phase 2 — Master CV Management

**Goal:** Users can upload a PDF or DOCX CV, have it parsed into structured sections by Gemini, and manage their master CV.

- [ ] Install UploadThing and configure file router (PDF + DOCX, max 10MB)
- [ ] Install pdf-parse and mammoth for file text extraction
- [ ] Build `lib/cv-parser.ts` (PDF → pdf-parse, DOCX → mammoth → raw text)
- [ ] Build CV upload API route (`/api/cv/upload`): upload → extract text → store rawText + originalFileName + originalFileUrl in MasterCV
- [ ] Set up `@google/genai` client in `lib/gemini.ts`
- [ ] Write `parseCV()` Gemini function: raw text → structured JSON (contact, summary, experience[], education[], skills[], certifications[])
- [ ] Store `parsedSections` JSON in MasterCV after parsing
- [ ] Build CV management page (`/cv`):
  - If no CV uploaded: prominent upload CTA with instructions
  - If CV exists: parsed CV displayed as section cards (read-only rendered view)
  - Upload dropzone with drag-and-drop + file type validation
  - Re-upload/replace option
  - "Last updated" timestamp
- [ ] Add loading states for upload and parse steps
- [ ] Add error handling for unsupported files and parse failures
- [ ] Verify: upload PDF → text extracted → Gemini parses → sections displayed
- [ ] Verify: upload DOCX → same flow
- [ ] Verify: re-upload replaces previous CV (one-to-one)

**Deliverable:** Users can manage a master CV that is stored, AI-parsed, and viewable as structured sections.

---

### Phase 3 — Job Applications CRUD + Scraping

**Goal:** Full job application lifecycle — create, view, edit, delete — with job description input (manual or URL-scraped) and AI-extracted metadata.

- [ ] Build applications list page (`/applications`):
  - Card grid or table view (toggle)
  - Each card: job title, company, match score (if analyzed), status badge, date created
  - Filter by status (All, Draft, Analyzed, Applied, Interview, etc.)
  - Search by title/company
  - Sort by date or match score
  - Bulk status update (select multiple → change status)
  - Delete with confirmation
  - Empty state with CTA to create first application
- [ ] Build new application page (`/applications/new`):
  - Two input modes (tab toggle):
    - **Paste Text**: large textarea for raw job description
    - **Paste URL**: input field → triggers server-side scrape → user reviews/edits before saving
  - Auto-extract title and company from job description via Gemini (`extractJobMeta()`)
  - User can override title/company
  - Save as DRAFT status initially
  - After save → redirect to detail page
- [ ] Build application CRUD API routes:
  - `GET /api/applications` — paginated list with filter/search/sort params
  - `POST /api/applications` — create
  - `GET /api/applications/[id]` — single application
  - `PATCH /api/applications/[id]` — update status, notes, fields
  - `DELETE /api/applications/[id]` — delete with confirmation
- [ ] Install @extractus/article-extractor
- [ ] Build `lib/scraper.ts`: URL → article-extractor → clean plain text (fallback: fetch HTML, extract from main/article tags)
- [ ] Build scrape API route (`POST /api/scrape`): extract job posting text from URL
- [ ] Write `extractJobMeta()` Gemini function: description → `{ title, company }`
- [ ] Write `parseJobRequirements()` Gemini function: description → `{ requiredSkills[], preferredSkills[], responsibilities[], qualifications[], experienceLevel, employmentType }`
- [ ] Build application detail page (`/applications/[id]`) with 4-tab interface:
  - **Tab 1 — Job Description**: rendered description, parsed requirements as categorized chips/badges, edit button, re-scrape button if URL source
  - **Tab 2 — Match Analysis**: (placeholder — built in Phase 4)
  - **Tab 3 — Tailored CV**: (placeholder — built in Phase 4)
  - **Tab 4 — Cover Letter**: (placeholder — built in Phase 4)
- [ ] Build application edit page (`/applications/[id]/edit`)
- [ ] Verify: create application with pasted text → appears in list
- [ ] Verify: paste URL → scrape → job description populated + title/company extracted
- [ ] Verify: filter, search, sort all work
- [ ] Verify: bulk status update works
- [ ] Verify: delete removes application

**Deliverable:** Complete job application management with manual entry, URL scraping, and AI-extracted metadata.

---

### Phase 4 — AI Pipeline + Editor

**Goal:** The core "smart" features — match analysis, tailored CV generation, cover letter generation — all editable in Tiptap with auto-save.

- [ ] Write `analyzeMatch()` Gemini function:
  - Input: master CV text + job description
  - Output: `{ matchScore, summary, matchedSkills[{ skill, evidence, relevance }], missingSkills[{ skill, importance, suggestion }], recommendations[] }`
  - System prompt: "You are a senior recruitment consultant and ATS optimization expert."
- [ ] Build analyze API route (`POST /api/applications/[id]/analyze`):
  - Validate master CV exists
  - Call `analyzeMatch()`, store result in `matchAnalysis` JSON field
  - Update status to ANALYZED
- [ ] Build Match Analysis tab UI (Tab 2 on detail page):
  - Circular score visualization (0–100), color coded: green (75+), amber (50–74), red (<50)
  - Matched Skills section: green badges with evidence from CV
  - Missing/Gap Skills section: red/amber badges with suggestions
  - Recommendations section: actionable advice
  - "Re-analyze" button
  - Step-based progress indicators during analysis
- [ ] Write `tailorCV()` Gemini function:
  - Input: CV text + job description + match analysis
  - System prompt: "NEVER fabricate experience or skills. Reorder to prioritize relevant experience. Mirror exact keywords from JD where truthful. Add metrics. Compress less relevant experience. Output clean markdown."
  - Store output in `tailoredCV`, copy to `tailoredCVEdited`
  - Update status to TAILORED
- [ ] Build tailor API route (`POST /api/applications/[id]/tailor`)
- [ ] Write `generateCoverLetter()` Gemini function:
  - Input: CV text + job description + company + title
  - 3–4 paragraphs, no placeholder brackets, confident but authentic tone
- [ ] Build cover letter API route (`POST /api/applications/[id]/cover-letter`)
- [ ] Install and configure Tiptap with extensions (StarterKit, Heading, Bold, Italic, BulletList, OrderedList, Underline, undo/redo)
- [ ] Build Tiptap editor component with toolbar
- [ ] Build Tailored CV tab (Tab 3):
  - Tiptap editor pre-filled with `tailoredCVEdited`
  - Auto-save edits to `tailoredCVEdited` (debounced 2s)
  - "Regenerate" button with confirmation if content was edited
  - "Copy to Clipboard" as plain text
  - Export buttons (PDF, DOCX) — wired in Phase 5
  - Auto-save indicator
- [ ] Build Cover Letter tab (Tab 4):
  - Same Tiptap editor setup
  - Generate button if not yet generated
  - Auto-save edits to `coverLetter` field
  - Export buttons (PDF, DOCX) — wired in Phase 5
- [ ] Verify: run analysis → score + matched/missing skills displayed
- [ ] Verify: generate tailored CV → opens in editor, editable, auto-saves to `tailoredCVEdited`
- [ ] Verify: generate cover letter → opens in editor, editable
- [ ] Verify: re-generate overwrites with confirmation

**Deliverable:** Full AI pipeline from job description to editable, personalized CV and cover letter.

---

### Phase 5 — Export, Dashboard & Polish

**Goal:** PDF/DOCX export, dashboard with stats, settings page, and full UI polish.

- [ ] Install @react-pdf/renderer for PDF export
- [ ] Build PDF template (clean, professional layout: name/contact header, sections with spacing, markdown → PDF)
- [ ] Install docx package for DOCX export
- [ ] Build DOCX generation in `lib/export.ts` (proper heading styles, bullets, spacing, standard resume margins/fonts)
- [ ] Build export API route (`POST /api/applications/[id]/export`) — accepts format param (pdf/docx), returns Buffer/Blob
- [ ] Wire export buttons on Tailored CV and Cover Letter tabs
- [ ] Build dashboard page (`/dashboard`):
  - Stats cards: Total Applications, Applied, Interviews, Offers
  - Recent applications list (last 5, with status + match score)
  - Quick action buttons: Upload CV, New Application
  - Average match score across analyzed applications
- [ ] Build settings page (`/settings`):
  - Edit profile: name, email
  - Manage connected accounts (Google)
  - Danger zone: delete account (with confirmation, cascading delete)
- [ ] Add Framer Motion animations:
  - Page transitions (fade/slide)
  - Card entrance animations (stagger)
  - Loading skeleton shimmer
- [ ] Add Sonner toast notifications for all mutations (success/error/info)
- [ ] Add error boundaries for each major section (especially AI operations)
- [ ] Add empty states with icons and clear CTAs for all list pages
- [ ] Polish responsive layout:
  - Sidebar collapses to bottom nav on mobile
  - Cards stack vertically
  - All features usable on mobile viewport
- [ ] Audit loading states across all async operations (skeleton loaders for data, step-based progress for AI)
- [ ] Optimistic updates for status changes and saves
- [ ] Final accessibility pass (focus management, ARIA labels, keyboard nav)
- [ ] Verify: export tailored CV as PDF → downloads correctly
- [ ] Verify: export cover letter as DOCX → downloads correctly
- [ ] Verify: dashboard stats reflect actual application data
- [ ] Verify: settings updates persist
- [ ] Verify: app is fully usable on mobile viewport

**Deliverable:** Production-ready application — fully featured, polished, exportable.

---

## Core Features

### 1. Authentication (Better Auth)

- Email/password sign-up with email verification
- Google OAuth sign-in
- Protected routes via middleware — redirect unauthenticated users to /sign-in
- Session management with Better Auth's built-in session handling
- Sign-out from sidebar/header dropdown

### 2. Master CV Management (`/cv`)

**Upload Flow:**
1. User uploads PDF or DOCX via drag-and-drop zone (UploadThing)
2. Server extracts raw text (PDF → pdf-parse, DOCX → mammoth)
3. Send extracted text to Gemini: "Parse this CV into structured sections: contact info, professional summary, work experience (array with company, title, dates, bullets), education, technical skills (categorized), certifications. Return as JSON."
4. Store both `rawText` and `parsedSections` in MasterCV
5. Display parsed CV in a clean, readable format with section cards

**UI States:**
- No CV uploaded → prominent upload CTA with instructions
- CV exists → parsed CV with re-upload/replace option
- Show "last updated" timestamp
- Read-only rendered preview of parsed sections

### 3. Job Application CRUD (`/applications`)

**List View:**
- Card grid or table view (toggle)
- Each card: job title, company, match score (if analyzed), status badge, date created
- Filter by status, search by title/company, sort by date or match score
- Bulk status update (select multiple → change status)
- Delete with confirmation

**Create New (`/applications/new`):**
- Two input modes (tab toggle):
  - **Paste Text**: large textarea for raw job description
  - **Paste URL**: input field → triggers server-side scrape → user reviews/edits
- Auto-extract title and company via Gemini
- User can override extracted title/company
- Saves as DRAFT → redirects to detail page

**Detail View (`/applications/[id]`) — 4-tab interface:**

| Tab | Content |
|-----|---------|
| Job Description | Rendered description, parsed requirements as categorized chips/badges, edit button, re-scrape if URL source |
| Match Analysis | Score ring (0–100, color coded), matched skills (green badges with evidence), missing skills (red/amber with suggestions), recommendations, re-analyze button |
| Tailored CV | Tiptap editor with AI-generated content, auto-save to `tailoredCVEdited`, regenerate button, copy to clipboard, export PDF/DOCX |
| Cover Letter | Tiptap editor, generate button, auto-save, export PDF/DOCX |

### 4. URL Scraping (`lib/scraper.ts`)

```typescript
import { extract } from "@extractus/article-extractor";

export async function scrapeJobPosting(url: string): Promise<string> {
  // Use article-extractor to get main content
  // Fallback: fetch HTML and extract text from main/article tags
  // Clean up: remove HTML tags, normalize whitespace
  // Return plain text of the job posting
}
```

### 5. Export (`lib/export.ts`)

**PDF Export** — `@react-pdf/renderer`: professionally formatted PDF with clean layout, name/contact header, proper spacing, markdown → PDF conversion.

**DOCX Export** — `docx` package: proper heading styles, bullet points, spacing, standard resume margins and fonts.

Both accept markdown/text content and return a Buffer/Blob for download via `/api/applications/[id]/export`.

### 6. Settings (`/settings`)

- Edit profile: name, email
- Manage connected accounts (Google)
- Danger zone: delete account (with confirmation, cascading delete)

---

## Gemini AI Functions

All functions live in `lib/gemini.ts`. Each is a standalone export for use in API routes.

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

**All Gemini calls must:**
- Use `gemini-2.5-flash` model
- Set `responseMimeType: "application/json"` for structured output
- Be wrapped in try/catch with meaningful error messages
- Have a retry mechanism (2 retries with exponential backoff)

### `parseCV(rawText: string) → ParsedCV`
- System: "You are an expert CV/resume parser. Extract structured data from the following CV text."
- Returns: `{ contact, summary, experience[], education[], skills (categorized object), certifications[] }`

### `extractJobMeta(description: string) → { title: string, company: string }`
- Short prompt to extract job title and company name from a job description

### `parseJobRequirements(description: string) → ParsedRequirements`
- Returns: `{ requiredSkills[], preferredSkills[], responsibilities[], qualifications[], experienceLevel, employmentType }`

### `analyzeMatch(cvText: string, jobDescription: string) → MatchAnalysis`
- System: "You are a senior recruitment consultant and ATS optimization expert. Analyze how well this CV matches the job description. Be specific and evidence-based."
- Returns:
```json
{
  "matchScore": 72,
  "summary": "Brief 2-3 sentence overall assessment",
  "matchedSkills": [
    { "skill": "React", "evidence": "3 years at Company X building React SPAs", "relevance": "high" }
  ],
  "missingSkills": [
    { "skill": "Kubernetes", "importance": "medium", "suggestion": "Highlight Docker experience as transferable" }
  ],
  "recommendations": [
    "Lead with your Next.js project experience as it directly matches their stack",
    "Quantify your WooCommerce work with revenue/conversion metrics"
  ]
}
```

### `tailorCV(cvText: string, jobDescription: string, matchAnalysis: MatchAnalysis) → string`
- System: "You are an expert CV writer. Rewrite this CV to be optimized for the specific job description. RULES: 1) NEVER fabricate experience or skills 2) Reorder to prioritize relevant experience 3) Mirror exact keywords from the job description where truthful 4) Add metrics and quantifiable achievements 5) Compress less relevant experience 6) Keep all facts accurate. Output clean markdown."
- Feeds match analysis as context so it knows what to emphasize

### `generateCoverLetter(cvText: string, jobDescription: string, company: string, title: string) → string`
- 3–4 paragraph tailored cover letter
- No placeholder brackets — use actual company/title or write generically
- Confident but authentic tone

---

## Environment Variables

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GEMINI_API_KEY="..."
UPLOADTHING_TOKEN="..."
```

---

## UI/UX Guidelines

### Design Direction
- **Dark mode by default** with clean, professional aesthetic
- Dark navy/slate backgrounds, cyan/teal accent color for primary actions
- Green/amber/red for score indicators
- Cards with subtle borders, slight background differentiation, rounded corners (12–16px)

### Typography
- Font: **Geist** (via `next/font`)
- Modern sans-serif throughout

### Layout
- Fixed left sidebar with icon + text nav items (Dashboard, My CV, Applications, Settings)
- Sidebar collapsible on tablet, collapses to **bottom nav** on mobile
- Content area centered with appropriate max-width
- Cards stack vertically on mobile

### States
Every interactive feature must handle:
- **Loading** — skeleton loaders for data fetching, step-based progress for AI operations
- **Error** — inline error message with retry option
- **Empty** — friendly icons with clear CTAs
- **Success** — Sonner toast notifications, optimistic UI updates where safe

### AI Generation UX
- Step-based progress indicators during AI calls (not just a spinner)
- Disable action buttons while generation is in progress
- Show last-generated timestamp on editor pages
- "Regenerate" always available with confirmation if content has been edited

---

## Key Constraints

1. **No fabrication** — AI must never invent experience, qualifications, or skills. Only reorganize, emphasize, and rephrase existing CV content.
2. **One active CV** — Only one master CV per user (one-to-one). All applications reference the user's current master CV at time of analysis.
3. **Auth-gated everything** — All dashboard routes, API routes, and data are protected. Users can only access their own data.
4. **Structured AI output** — Use `@google/genai` SDK with `responseMimeType: "application/json"` and validate with Zod schemas. Never parse free-text AI responses.
5. **No client-side secrets** — Gemini API key, DB URL, and auth secrets must never be exposed to the browser.
6. **Server-side mutations** — All data mutations must go through Server Actions or API routes. No direct DB calls from client components.
7. **Dual CV storage** — Store both the AI-generated `tailoredCV` and the user's edited `tailoredCVEdited` separately.
8. **Input validation** — Validate ALL inputs with Zod schemas before processing.
9. **Graceful AI errors** — Handle Gemini API errors gracefully. Show user-friendly messages, never expose raw API errors. All AI operations are async with visible progress feedback.
10. **Optimistic updates** — Use optimistic updates where appropriate (status changes, saves).
11. **Database transactions** — Use transactions for operations that touch multiple tables.
12. **Type safety** — TypeScript strict mode, no `any`, Prisma-generated types for all DB access.
13. **Biome only** — Single tool for linting and formatting. Do not add ESLint or Prettier.
14. **pnpm only** — Do not use npm or yarn. Lock file is `pnpm-lock.yaml`.
