# Experience Forms — Architecture Documentation

## Overview
Experience Forms is an interactive form and hiring application SaaS engine built with Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma, and PostgreSQL/SQLite.

The platform separates the **Form Engine (Schema, Scenes, Questions, Logic)** from the **Evaluation & Response Management Engine (Deterministic Scoring, Candidate Statuses, Spreadsheet Table, Exports)**.

---

## Core System Architecture

```
                    ┌─────────────────────────┐
                    │  Experience Form Schema │
                    │   (Normalized Contract) │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐    ┌───────────────────┐   ┌───────────────────┐
│  Form Builder   │    │ Interactive Form  │   │ Dynamic Response  │
│    (Creator)    │    │ Runtime (/f/slug) │   │ Table & Evaluator │
└─────────────────┘    └───────────────────┘   └───────────────────┘
```

---

## Technical Stack
- **Framework**: Next.js 14 (App Router, Server Actions, API Routes)
- **Database / ORM**: Prisma ORM with PostgreSQL / SQLite
- **Validation**: Zod (shared client & server validation schemas)
- **Icons**: Lucide React
- **Authentication**: JWT Cookie session handler with workspace level authorization (`requireWorkspaceAccess`)
- **Storage**: Supabase Storage / Local File Storage fallback for resume uploads
