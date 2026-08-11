# Experience Forms — Functional MVP

Experience Forms is a SaaS platform for creating interactive forms, publishing them, collecting responses in a spreadsheet-like interface, and evaluating hiring applications with deterministic scoring.

---

## Key Features

- 🛠 **Interactive Form Builder**: 3-panel builder (Scene List, Canvas, Properties/Scoring/Logic Editor).
- 🔀 **Conditional Logic Engine**: Dynamic scene routing based on respondent answers (`EQUALS`, `NOT_EQUALS`, `CONTAINS`, `GREATER_THAN`, `LESS_THAN`).
- 🌐 **Public Respondent Runtime**: Zero-auth public respondent engine at `/f/[slug]` with file upload support.
- 📊 **Spreadsheet Response Table**: Dynamic columns derived from questions, server-side pagination, search, status filtering, and sorting by score/date.
- 🎯 **Hiring Evaluation Engine**: Automatic MCQ/Yes-No scoring, manual score overrides, weighted final score calculation, candidate status pipeline (`NEW`, `REVIEWING`, `SHORTLISTED`, `REJECTED`, `ON_HOLD`), and reviewer notes.
- 📥 **CSV Export**: Dynamic RFC 4180 compliant CSV export engine.
- 🔒 **Immutable Form Versioning**: Immutable version snapshots upon publishing to ensure historical responses never break when questions change.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Database / ORM**: Prisma ORM with SQLite / PostgreSQL (Supabase)
- **Validation**: Zod
- **Icons**: Lucide React

---

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Push database schema
npx prisma db push

# 3. Seed demo workspace, hiring form & candidates
npx prisma db seed

# 4. Start dev server
pnpm dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to log into the Creator Dashboard.

Default Demo Credentials:
- **Email**: `creator@experienceforms.com`
- **Password**: `password123`

---

## Documentation

Full architectural and technical guides are available in the [`docs/`](./docs) directory:
- [Architecture Overview](./docs/architecture.md)
- [Form Engine & Logic](./docs/form-engine.md)
- [Hiring Evaluation Engine](./docs/evaluation-engine.md)
- [Development Guide](./docs/development-guide.md)
