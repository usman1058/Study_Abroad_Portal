# Study Abroad & Visa Agency Management System

**Private Project — Not Authorized for External Use**

This repository contains the source code for the Study Abroad & Visa Agency Management System, a next-generation platform built with Next.js 16, React 19, Prisma ORM, and PostgreSQL. This system is designed for internal use by the agency only and is not authorized for external distribution, commercial use, or deployment without explicit permission.

---

## 📋 Overview

The Study Abroad & Visa Agency Management System is a comprehensive platform for managing study abroad applications, scholarships, student records, documents, payments, and communications. It features a full admin portal with role-based access control, CRUD operations for all entities, and a student-facing dashboard.

**Important:** This is a private project. Do not share, fork, or deploy without authorization.

---

## 🛠 Tech Stack

- **Framework**: Next.js 16.3.1 (App Router)
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 4.3.3
- **Database**: PostgreSQL 17 (via Neon) with Prisma ORM 7.9.1
- **Authentication**: Auth.js (v5) with JWT sessions
- **UI**: shadcn-ui components, lucide-react icons
- **Charts**: Recharts for dashboards and graphs
- **PDF**: @react-pdf/renderer for document generation
- **Utilities**: Zod validation, date-fns, class-variance-authority

---

## ⚠️ Critical Configuration

### Database

The application requires a PostgreSQL database. Update `.env` with your connection string:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/study_abroad_portal?schema=public"
```

For production deployments on Vercel, use the Neon PostgreSQL URL format:

```
DATABASE_URL="postgresql://neondb_owner:npg_JU8RSkAIrms0@ep-weathered-glitter-azj3pb39-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

### Authentication

- `AUTH_SECRET` — 32-byte random string for JWT signing
- `AUTH_URL` — Base URL for post-login redirects
- `CRON_SECRET` — Secret header for `/api/cron/reminders`
- Demo logins: `admin|manager|agency|subagency|counselor|student@studyabroad.test`, password `Admin@12345`

### Dev Server

Must run on `http://localhost:3001` (port 3000 is occupied by another project). Launch via the provided `start-dev.cmd`.

---

## 📁 Project Structure

```
src/
├── app/              # Next.js 16 App Router pages & API routes
├── components/       # Reusable UI components (forms, tables, modals)
├── lib/              # Utilities (db, api, permissions, slug, i18n, session)
├── prisma/           # Schema, migrations, seed
├── proxy.ts          # Route guard middleware
└── types/            # TypeScript type extensions
```

---

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Production build (Turbopack) |
| `pnpm exec tsc --noEmit` | Type check |
| `pnpm exec prisma migrate deploy` | Apply pending migrations |
| `pnpm exec prisma generate` | Generate Prisma Client |
| `pnpm exec prisma db seed` | Run seed script |
| `node start-dev.cmd` | Start dev server on port 3001 |
| `git init && git add . && git commit -m "first"` | Initialize local repo |

---

## 🔐 Roles & Permissions

| Role | Sections Accessible |
|------|---------------------|
| SUPER_ADMIN | All sections |
| MANAGER | Most sections (users, scholarships, short-courses, transactions, etc.) |
| COUNSELOR | Scholarships, short-courses, messages, documents, profile |
| AGENCY | Sub-agencies, partner-commissions, transactions, documents |
| STUDENT | My Applications, My Documents, My Shortlist, profile, payments, messages |

---

## 🚀 Deployment (Vercel)

1. Push to GitHub (this repo is already configured)
2. Connect the GitHub repo to Vercel
3. Add the environment variables in Vercel Dashboard:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` (set to `https://your-url.vercel.app`)
   - `CRON_SECRET`
4. Enable Vercel Cron Jobs for `/api/cron/reminders`
5. Deploy

---

## 📞 Support

This is a private internal tool. For authorization or access requests, contact the project maintainers.

---
*Engineered for agency workflow automation. Not for public consumption.*