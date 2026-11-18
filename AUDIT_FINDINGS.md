# Study Abroad Portal — Consolidated Audit Record

Last updated: 2026-11-18 (Neon runtime verification and visitor-lead follow-up; see §16.9–§16.13)
Auditor: automated code + runtime audit (static read of all pages/routes, live exploit verification, partial visual QA)

This file is the single source of truth for the audit. It records **facts**, **evidence**, **severity**, **what was corrected**, and **what is still unverified**. Do not restate findings from memory without checking here.

---

## 0. Status summary

| Area | Status | Evidence |
|---|---|---|
| Static review of all pages | DONE | 32 `page.tsx` files read |
| Static review of all API routes | DONE | 38 `route.ts` files read |
| Libs / schema / proxy / config / tests | DONE | permissions, auth, session, api, stages, validation, schema.prisma, proxy.ts, next.config.ts, playwright config, seed |
| Build + typecheck | DONE (pass) | Final `pnpm build` compiled all 52 routes; `pnpm typecheck` and `git diff --check` passed after the final source/audit edits |
| Runtime role/exploit verification | DONE | temporary accounts, NextAuth cookie login, cleanup verified |
| Full Playwright E2E | NOT DONE | 31 passed / 5 failed / 73 never ran (stale seeded hashes) |
| Visual review of every page | DONE | 136 screenshots @1440/768/390 for public + admin + manager + counselor (agency partial), plus **75 more** covering all 25 student/agency pages (§15.1); per-page verdict in §9d |
| Numeric visual metrics | DONE (for the 25 student/agency pages) | `.audit-shots/v2/metrics.json` — overflow, offscreen elements, clipped containers, unlabeled controls, console errors |
| Screen reader / Firefox / Safari | NOT DONE | — |
| Lighthouse / Core Web Vitals | NOT DONE | — |

**Honest claim:** every page and every API route was *read*; the 9 P0 defects below were *reproduced live*. It is **not** valid to claim "every possible defect has been found" until the visual/a11y pass and the full E2E suite run clean.

---

## 1. Stack (verified from package.json)

- Next.js 16.3.1 (App Router, RSC, `src/proxy.ts` edge guard), React 19.2.8
- Tailwind CSS 4.3.3 via `@tailwindcss/postcss` (no `tailwind.config.*`; CSS-first theme)
- TypeScript 7.0.2, Prisma 7.9.1 + `@prisma/adapter-pg`
- NextAuth 5.0.0-beta.32 (credentials, JWT strategy)
- Radix Dialog only (`@radix-ui/react-dialog`); all other overlays hand-rolled
- Playwright 1.62.1 (E2E only; no axe, no Lighthouse, no unit tests)
- Scripts: `dev` (webpack), `build` (webpack), `start`, `typecheck`, `test:e2e`, prisma scripts

---

## 2. Method

1. Read every page, route, shared lib, schema, config, test.
2. Ran `pnpm build` + `pnpm typecheck` (baseline: pass, 47 routes).
3. Enumerated E2E tests (109 tests, 8 files) and ran the suite.
4. Started a dev server on port 3210 and authenticated via NextAuth's own flow:
   `GET /api/auth/csrf` -> `POST /api/auth/callback/credentials` (form: csrfToken, email, password, callbackUrl) with `maxRedirects: 0`; cookie `authjs.session-token`.
5. Created temporary users/courses/documents per script and deleted them in `finally`.
6. Reproduced IDOR, escalation, stale-JWT, paywall-leak, and document-scope bugs.
7. Captured screenshots at 1440x900 and 390x844 (interrupted by environment restart).

Dev-server notes:
- Use `http://localhost:3210`, not `127.0.0.1` (cross-origin HMR block).
- First compile of a route can take 20-50 s; use >=180 s timeouts.
- Login rate limit is in-memory: 10/email and 60/IP per 15 min; signup 5/IP per 15 min.

---

## 3. P0 defects reproduced at runtime (highest confidence)

| # | Defect | File(s) | Evidence |
|---|---|---|---|
| 1 | Unpaid student receives paid-course `meetingLink` + `bankDetails`, before payment and after withdrawal | `src/app/api/short-courses/[id]/route.ts:29-66` | `GET /api/short-courses/{id}` -> 200 with `AUDIT-SECRET-LINK`, `AUDIT BANK ACCOUNT 1234567890` |
| 2 | Paid-course detail page crashes for `pending_payment`; payment impossible | `src/app/(dashboard)/short-courses/[id]/page.tsx`, `src/components/enroll-button.tsx` | HTTP 200, body "Something went wrong"; console: `Event handlers cannot be passed to Client Component props ... onUploaded={function onUploaded}` |
| 3 | Meeting link embedded in `/short-courses` HTML for unpaid students | `src/app/(dashboard)/short-courses/page.tsx:97-103` | page HTML contains `AUDIT-SECRET-LINK` |
| 4 | Student reads applicant PII in program analytics | `src/app/(dashboard)/programs/[id]/analytics/page.tsx:8` | 200; "Students using this program: Hadi Abdul DRAFT, Tech Info SUBMITTED, Sam Student UNDER REVIEW"; "Conversion 150%" |
| 5 | Agency reads any user's analytics, incl. SUPER_ADMIN | `src/app/(dashboard)/users/[id]/analytics/page.tsx:7` | AGENCY -> `/users/{adminId}/analytics` -> 200 with admin name + "Recorded payments" |
| 6 | Agency reads program analytics | same as #4 | AGENCY -> 200, "Students using this program" |
| 7 | MANAGER can promote a STUDENT to MANAGER | `src/app/api/users/[id]/route.ts:23-39` | `PATCH {role:"MANAGER"}` -> 200; DB role became MANAGER |
| 8 | Stale JWT survives demotion and deactivation | `src/lib/session.ts:15-24`, `src/lib/auth.config.ts` | `/users` still 200 after AGENCY->STUDENT and after `status=inactive`; 30-day token, no DB check |
| 9 | SUPER_ADMIN sees no documents and gets 403 opening one | `src/lib/permissions.ts:90-108` | `/documents` -> "No students with documents." (148 docs / 34 students); `GET /api/documents/{id}` -> 403 |

Also verified healthy: `/api/reports/export` -> 200 CSV; CSV-injection guarded (`^[=+\-@]` prefixed with `'`, e.g. `'+60123456789`).

### Root causes
- #1/#3: no enrollment/payment gate on course serialization.
- #2: server component passes a function prop to a client component.
- #4/#5/#6: pages check authentication only (`if (!user) redirect`), no role/ownership check; `/programs` is also missing from the proxy matcher.
- #7: PATCH validates the *target's old* role but never validates the *requested new* role against `creatableRoles(actor)`.
- #8: JWT callback never re-reads `status`/`role`; no revocation.
- #9: `canAccessStudentDocuments` / `directDocumentStudentScopeWhere` treat SUPER_ADMIN as "only students I created/assigned", unlike `canAccessStudent`/`studentScopeWhere`.

---

## 4. Role / visibility model

Role enum: SUPER_ADMIN, MANAGER, COUNSELOR, AGENCY, STUDENT.

### 4.1 Positive rules (as coded)
- `canAccessStudent`: SUPER_ADMIN/MANAGER -> all students; self; COUNSELOR -> assigned; AGENCY -> created. 
- `studentScopeWhere`: SUPER_ADMIN/MANAGER -> all students; COUNSELOR -> assigned; AGENCY -> created; STUDENT -> self.
- `canManageUser`: target SUPER_ADMIN never; SUPER_ADMIN -> all; AGENCY -> students only; others by rank.
- `creatableRoles`: SUPER_ADMIN -> MANAGER/AGENCY/COUNSELOR/STUDENT; MANAGER -> AGENCY/COUNSELOR/STUDENT; AGENCY -> STUDENT; COUNSELOR -> STUDENT.

### 4.2 Defects
- PATCH new role is unchecked -> manager can create peers (MANAGER) and change existing users' roles upward.
- Documents subsystem uses a *narrower* scope than the rest of the app -> SUPER_ADMIN/MANAGER locked out of many documents.
- Guards disagree four ways: proxy prefix lists, `SECTIONS`, page-level `redirect()`, API scope.
  - `AGENCY` has no Users nav item but `/users` -> 200.
  - `COUNSELOR` has no Transaction nav item but `/transaction` -> 200 (page has a counselor branch).
  - `MANAGER` branch exists in `/visitor-form` but the page redirects non-SUPER_ADMIN.
  - `/reports` redirects COUNSELOR (SECTIONS also excludes).
- `/programs` absent from `proxy.ts` matcher -> students reach `/programs/[id]/analytics`.
- `/sub-agencies`: specified in PROJECT_BRIEF/MASTER_BUILD_SPEC/DESIGN_DATA and asserted by 3 test files, but **no page, no route, no schema field**.
- `/my-documents` is in the proxy matcher but **no page exists**.
- No password reset route anywhere.
- No session revocation on password change, role change, or deactivation; no "sign out all devices".
- Rate limiting is in-memory per process (resets on restart, per-instance).
- No security headers (CSP/HSTS/frame-ancestors/referrer) and `images.remotePatterns` allows any HTTPS host.

### 4.3 Runtime role results (observed)
- AGENCY: `/users` 200; `/users/{adminId}/analytics` 200; `/programs/{id}/analytics` 200; `/reports` 200; `/transaction` 200.
- STUDENT: `/programs/{id}/analytics` 200; `/documents` -> `/my-applications`; `/users/...` redirected; `/short-courses/{paid}` 200 + crash.
- MANAGER: promote student to MANAGER 200.
- SUPER_ADMIN: all main pages 200; `/documents` empty; document API 403.

---

## 5. Page-by-page findings (32 pages)

Legend: P0 = leak/broken core flow, P1 = major, P2 = moderate, P3 = polish.

### Public / auth
1. `/` (`src/app/page.tsx`) — P1: binary Student/Partner model hides staff roles; expired-session deep links lose destination; no reset/support/legal links.
2. `/student/login` — P0: no password reset anywhere. P1: `nextPath` ignored; rate-limit/pending/wrong-password collapse into one message; error not `aria-live`.
3. `/student/signup` — P1: no terms/privacy consent; no password confirm; missing `autoComplete`; silent fallback to login on auto-login failure.
4. `/partner/login` — P1: pending-approval state invisible; identical UX to student login.
5. `/partner/signup` — P1: promises licence review but no licence upload; no confirmation/reference; no consent.
6. `/invite/[token]` — P1: `<h1>` is the student name; **no `robots: noindex`** on a page with documents/payments; documents not downloadable; payments lack dates; `logAudit` runs on every GET; expired -> bare 404.

### Dashboard (staff)
7. `/home` — P1: brand rendered twice (sidebar + topbar); chart has no y-axis scale; ad card blank when `imageUrl` null; **242 px horizontal overflow @390**; auto-rotating carousel (WCAG 2.2.2); duplicate carousel rails; "New leads"/"Active programs" labels mismatch queries; 18 cards.
8. `/advertisements` — P2: carousel-only, no list/schedule/status; "New ad" two clicks deep; auto-advance; empty state no CTA.
9. `/application` — P1: create panel pushes table below fold; stage filter full width (Select primitive overrides width); **204 targets <24 px**; no count/pagination/sort; empty state ignores filter; no `<caption>`/`scope`.
10. `/application/[id]` — P2: `<h1>` is program name; unconfirmed stage change (terminal one click); no timeline; "Rejected by staff" hard-coded; docs open raw API URL.
11. `/apply` — P1: "Apply Application" label; non-interactive step rail/no `aria-current`; no autosave; errors unassociated; **wizard uploads docs with `applications={[]}` so docs never link to the application**, blocking the doc gate.
12. `/documents` — P0: SUPER_ADMIN empty + 403; students redirected although linked here. P1: no filter/search/triage order; verified ratio counts all docs; reject reason hard-coded.
13. `/messages` — P1: no scroll-to-newest; latest 200 globally; no read state; no search; unlabeled textarea; draft cleared on failed send.
14. `/my-applications` — P1: slogan `<h1>`; **"Check documents" -> `/documents` -> redirect (dead end)**; students cannot open application detail; MYR hard-coded; tabs lack `aria-current`; unbounded; no withdraw/delete.
15. `/my-shortlist` — P1: WhatsApp shares authenticated URL; `NEXT_PUBLIC_BASE_URL=http://localhost:3001`; DB write on every GET; compare modal no dialog semantics; 4th selection ignored; no remove/reorder.
16. `/partner-commissions` — P1: **260 px overflow @390**; `mayViewRates = true` dead conditional; unweighted average; no filter; links to `/scholarships`.
17. `/payments` — P1: KPI slot used for disclaimer; "Payments made" counts refunds; no pay/receipt/invoice; inconsistent caps; mixed currencies.
18. `/profile` — P1: **8 unlabeled inputs** (runtime); `alert()` errors; completeness never lists missing fields; 14 fields ungrouped; currency three sources of truth.
19. `/programs` — P0: names link to analytics for all roles. P1: 170 cards/unpaginated (~33 screens); `<label>` wraps checkbox+links+buttons; delete posts to `/api/scholarships/...`; MYR hard-coded in bulk rows.
20. `/programs/[id]/analytics` — **P0: no authz guard; applicant names/stages exposed**; conversion >100%; no empty states/metadata.
21. `/reports` — P1: no date range/filters; manager `transactionScope = {}` shows agency payouts (API hides them); currencies concatenated; empty lists; `window.print()`.
22. `/scholarships` — P1: whole catalog mislabeled; duplicates `/programs`; no search/sort/pagination; truncated names; wrong delete endpoint; tiny Apply.
23. `/scholarships/[id]` — **P1: no Apply CTA**; two currency systems; no back link; share link localhost:3001; static metadata; no fee basis.
24. `/search` — P1: silent 50 cap; **4 unlabeled controls**; 58x19 px targets; students excluded; table not overflow-wrapped; lowercase level mismatch.
25. `/settings` — P1: language switcher one option; currency `localStorage` only (DB read, never written); **5 unlabeled inputs**; no password autocomplete/strength; overpromises.
26. `/short-courses` — P0: meeting link in props. P1: "Interested" enrolls; "Enrolled" withdraws; no filters; actionless pending KPI; MYR dialog; no empty CTA.
27. `/short-courses/[id]` — **P0: crash for pending_payment; payment impossible**; paid data leak; no back link; blank card for completed/withdrawn; bank details duplicated; full reload after upload.
28. `/transaction` — P1: 9-column ledger on mobile; KPI tile wall; `take: 100`; `confirm()` delete; "manually entered in v1" copy; left-aligned amounts; COUNSELOR URL access though no nav.
29. `/users` — P1: table clips Actions at 1440; full-width "Make Super Admin" on every row; three create flows; no search/filter/pagination; mixed `<a>`/`<Link>`; every row "View"; invite tokens not copyable; AGENCY can open by URL.
30. `/users/[id]` — P0: "More Details" -> unguarded analytics. P1: "Student" page renders any role; docs not openable; empty `wa.me/`; no edit/reset/suspend; stage tone lost.
31. `/users/[id]/analytics` — **P0: no authz guard; payment/application/enrollment IDOR**; hard-coded `MYR ${spent}`; refunds counted as spend; notifications fetched never shown.
32. `/visitor-form` — P1: promises follow-up but only Delete; MANAGER excluded (dead branch); `take: 100`; **6 unlabeled fields**; raw enum badges; no tel/mailto.

### Shell / structural
- No `not-found.tsx` anywhere.
- `src/app/error.tsx` exports `GlobalError` and renders `<html>/<body>`; `src/app/global-error.tsx` also exists -> duplicate/misplaced boundary.
- `loading.tsx` draws a second fake sidebar/header; one generic skeleton for all pages.
- Sidebar: 17 flat items, no grouping, no `aria-current`, permanent "WhatsApp quick launch", duplicate brand with topbar.
- Theme always initializes light; ignores `prefers-color-scheme`.
- No toast system: `alert()`, `confirm()`, green banner, or silence.

---

## 6. API route matrix (38 files, ~55 handlers)

### Correctly guarded
- `applications` GET/POST, `applications/[id]` GET/PUT, `applications/[id]/submit`
- `transactions` GET/POST, `transactions/[id]` PATCH/DELETE (SUPER_ADMIN)
- `messages` GET/POST (student -> assigned/creator only)
- `notifications`, `notifications/[id]`, `notifications/unread-count`
- `profile`, `profile/password`
- `scholarships` POST, `scholarships/[id]` PUT/DELETE (SUPER_ADMIN)
- `dashboard-ads` GET/POST, `dashboard-ads/[id]` PATCH/DELETE (SUPER_ADMIN)
- `visitor-form` GET/POST, `visitor-form/[id]` DELETE (SUPER_ADMIN)
- `invites` POST, `invites/[id]` PUT/DELETE (revoke; owner or SUPER_ADMIN)
- `users` GET, `applications` scoped by role
- `cron/reminders` (Bearer `CRON_SECRET`)
- PDF routes: `programs/[programId]/pdf`, `programs/pdf-bulk` (POST), `short-courses/[id]/pdf`, `shortlist/[studentId]/pdf`

### Defective
- `short-courses/[id]` GET -> leaks `meetingLink`/`bankDetails` to every role.
- `users/[id]` PATCH -> new role unchecked (manager escalation).
- `documents/[id]` GET -> SUPER_ADMIN 403 (permission function bug).
- `shortlist` POST/DELETE -> staff omitting `studentId` uses own user id -> orphan shortlist.
- `short-courses/[id]/receipt` -> writes full base64 receipt into audit log (`after.receiptUrl`), DB bloat; weak state checks.
- `scholarships/[id]` DELETE -> FK error (500) when program has applications.
- `visitor-form/[id]` -> duplicate SUPER_ADMIN check (dead code).
- `short-courses/[id]/enroll` DELETE -> allowed while `pending_payment`; access leak persists afterward.
- `users/[id]` DELETE -> hard delete with cascades, no soft-delete/audit retention policy.

---

## 7. Data model / schema issues

- `ShortCourseEnrollment` cannot express paid access; `meetingLink` lives on `ShortCourse` and is serialized to everyone.
- No `parentAgencyId` / `AgencyHierarchy` field -> sub-agency feature unimplementable without migration.
- `Document.applicationId` optional and never set by the wizard -> document/application linkage unused.
- `User.status` enforced only at login, never per request.
- `User.preferredCurrency` read by dashboard layout but never written by the currency switcher.
- `preferredCurrency` + `localStorage` + hard-coded MYR = three competing currency sources.
- Audit log stores base64 receipt payloads.
- Program deletion has no dependent-record policy beyond Prisma defaults.

---

## 8. Config / test / environment

- `.env`: `NEXT_PUBLIC_BASE_URL="http://localhost:3001"` -> share links dead in any other port/deployment.
- `next.config.ts`: no security headers; `images.remotePatterns` hostname `"**"`.
- Seed drift: `prisma/seed.ts` hashes `ADMIN_PASSWORD` for all seeded roles, but live hashes no longer match -> E2E setup 401 for student/agency/counselor/manager. Only `admin@studyabroad.test` works.
- **Migration drift (found 2026-11-12 while standing up a local test DB):** `prisma migrate deploy` on an empty database produces a schema that is *missing* `ShortCourse.paymentType` (seed then fails with P2022 `ColumnNotFound`). The committed migrations are stale relative to `schema.prisma`, so the project cannot be reproduced from migrations; the working schema requires `prisma db push`. Fix: generate a migration from the current schema and reconcile `prisma/migrations` before the next deployment.
- `tests/helpers.ts` reuses one `TEST_PASSWORD` for all roles.
- Tests reference `/sub-agencies` (missing), expect H1 "Create your account" on `/student/signup` (actual "Student Signup"), expect "My Applications" (actual slogan) -> 5 failures.
- E2E result: 31 passed, 5 failed, 73 did not run.
- No unit/component tests; no axe/Lighthouse; no CI config for preview builds.

---

## 9. Accessibility / UI-quality findings (from static + partial runtime)

Confirmed via runtime measurement (subagent, 1440x900 and 390x844):
- `/home` 242 px horizontal overflow at 390; `/partner-commissions` 260 px.
- `/application` 204 targets under 24 px; `/search` 58x19 px "View" links; `/users` 64 small targets.
- Unlabeled controls: `/search` 4, `/profile` 8, `/settings` 5, `/visitor-form` 6, `/application` 4, `/messages` textarea.
- `/users` table clips Actions at 1440.
- Contrast: `text-slate-400` ~2.6:1 on white used for timestamps/hints.
- Auto-rotating carousel without pause (WCAG 2.2.2).
- `/my-applications` tabs and sidebar active state lack `aria-current`.
- Compare modal and several popovers are hand-rolled (no role, focus trap, Escape).
- Dark mode ignores OS preference; hard-coded SVG colors.
- 10-11 px timestamps/badges below comfortable readability.

Design-system issues:
- Two currency renderers (`FeeDisplay` vs `formatCurrency`) and hard-coded MYR strings.
- Two program catalogs (`/programs` cards, `/scholarships` table) with different actions.
- Two form-quality tiers (auth forms fully labelled; dashboard forms not).
- Four error-display patterns (inline div, `alert`, `confirm`, silent refresh).
- Six controls per row on `/scholarships`; primary action not dominant.

---

## 9b. Visual QA evidence (screenshots inspected)

Source: `.audit-shots/*.png` (dev server, 1440x900 fullPage; deleted after inspection) and `.audit-shots/v/*` (production server, 3 widths; retained). Confirmed visually:

- **Brand duplication** on every dashboard page: "SA StudyAbroad / Partner workspace" in the sidebar AND "SA StudyAbroad" in the topbar (screenshot 16-documents, 17-reports, 26-search, 30-user-analytics).
- **Documents scope bug visible**: as SUPER_ADMIN the page shows only "Shotstudent User 1/1 verified" — i.e. only students the actor personally created/assigned — with copy "Documents are limited to your counselor/student cases." (16-documents).
- **Users table clips the Actions column at 1440**, "Make Super Admin" appears on every row, ~60 rows unpaginated (14-users.png, 1440x7201).
- **Reports** is sparse, has no filters, and shows free-text country "gyuhij" (17-reports).
- **Search** controls have no visible labels (placeholder + "All countries"/"All levels" only); raw lowercase level badge "undergrad"; tiny "View →" link (26-search).
- **Program detail** renders two identical generic "Highlight" cards (placeholder content), raw lowercase tags ("high-demand", "computing"), "RM" formatting vs "MYR" elsewhere, and no back link (27-program-detail).
- **User analytics** hard-codes "MYR 0", subtitle promises "activity history" that is not rendered, no page metadata (30-user-analytics).
- **Settings** shows a single static locale "English"; password fields have no autocomplete/strength; currency is a lone select (22-settings).
- **Messages** dumps the entire user table (dozens of duplicate "E2E Counselor" rows) into an unsearchable "Start a conversation" list (21-messages.png, 1440x4233).
- **Mobile `/home` overflows**: fullPage screenshot is 656 px wide at a 390 px viewport (~266 px overflow), confirming the measurement (M10-home.png). `/users` and `/reports` mobile are 390 px wide (no overflow).
- **Home chart** has no y-axis scale; ad rail card is blank without an image (10-home).

## 9c. Design-system & shell evidence (computed, not estimated)

Contrast ratios computed from the actual tokens in `src/app/globals.css`:

| Pair | Ratio | Verdict |
|---|---|---|
| `text-slate-400` (#94a3b8) on white | **2.56:1** | fails 4.5:1 and 3:1 |
| `text-slate-400` on `canvas` (#f8fafc) | **2.45:1** | fails |
| `text-slate-500` on white | 4.76:1 | passes (barely) |
| `text-ink-muted` (#45464e) on white | 9.38:1 | passes |
| `brand-600` (#2563eb) on white | 5.17:1 | passes |
| white on `brand-600` | 5.17:1 | passes |
| `navy-400` (#6b83ad) on `navy-900` | **4.19:1** | fails 4.5:1 (dark placeholder/disabled text) |
| `navy-300` on `navy-900` | 7.32:1 | passes |
| `line-strong` (#cbd5e1) border on white | **1.48:1** | fails 3:1 (WCAG 1.4.11) — it is the only boundary of every input/select |

Where the failures land: `text-[11px] text-slate-400` timestamps (topbar notifications, messages), chart axis labels, placeholders (`placeholder:text-slate-400`), and the default input border (1.48:1 means fields are effectively invisible to low-vision users until focused).

Global a11y grep over `src/` (whole tree):
- `aria-current`: **0 occurrences** — sidebar links, `/my-applications` tabs, wizard steps, pagination all lack "you are here".
- `aria-live` / `role="status"` / `role="alert"`: **0 occurrences** — login errors, save confirmations, upload errors, stage changes are never announced.
- `prefers-reduced-motion`: **0 occurrences** — the auto-rotating carousel and 200 ms layout transitions ignore the OS setting (WCAG 2.3.3 / 2.2.2).
- `sr-only`: **0 occurrences** — no visually-hidden text anywhere; icon-only buttons rely on `aria-label` (most have one, but the account menu button lacks any name and no `aria-expanded`).
- `focus-visible`: only **3** occurrences (`button.tsx`, `ui/dialog.tsx`, landing role cards). Nav links, table links, icon buttons, and menu items fall back to UA outlines.

Shell (`components/sidebar.tsx`, `components/topbar.tsx`, `components/dashboard-shell.tsx`):
- Brand is rendered twice on every dashboard page: sidebar lockup ("SA + StudyAbroad + Partner/Student workspace") and topbar lockup ("SA + StudyAbroad"), both linking home. Visually confirmed on all captures.
- Mobile drawer: overlay `<button aria-label="Close navigation">` plus `<aside>`; **no `role="dialog"`/`aria-modal`, no focus trap, no Escape handler, no body-scroll lock, focus is not moved into the drawer**. At 390 px the drawer is the only way to navigate.
- Notifications and account popovers: no `role="menu"`, no `aria-expanded` on the avatar button, no Escape, no focus return; the notification item uses `window.location.href` (full reload). Outside-click is a bare `<div>`.
- "Toggle theme" is a stateful control with no `aria-pressed`; theme initialises to `"light"` and **ignores `prefers-color-scheme`** (`providers.tsx:19-26`), so dark-mode users get a white flash and a light UI.
- Currency switcher is `hidden xl:block` — **not reachable below 1280 px**, including all phones.
- Sidebar at 1440×900 already overflows (17 flat items) and scrolls internally; the footer is pinned. No grouping, no section labels.
- The collapse control renders as a white chip floating over the topbar border, visually detached from the navy rail (visible in every 1440 capture).
- No skip link; `<main>` has no `id`/`tabIndex`.

Error / routing surfaces:
- `src/app/error.tsx` exports `GlobalError` and renders its own `<html><body>` **inside the root layout** (invalid nested document, duplicate landmarks) and uses `<h2>` with no `<h1>`; it also wraps a `<Button>` inside `<Link>` (interactive inside interactive).
- `src/app/global-error.tsx` exists too — two competing boundaries.
- **No `not-found.tsx`** anywhere (default Next 404, unstyled).
- **No `robots.ts`/`sitemap.ts` and no `robots: noindex`** on `/invite/[token]`, which renders student PII, documents and payments.

## 9d. Per-page quality verdict (HCI + WCAG 2.2 AA)

Scale: **Blocked** (security/functional failure), **Poor** (multiple P1/P2 defects), **Needs work** (works, notable gaps), **Good**.

| # | Page | Verdict | Evidence | Principle violated |
|---|---|---|---|---|
| 1 | `/` | **Good** | 2-choice chooser, strong hierarchy, visible focus ring (1440 + 390) | Hick's law, affordance; gaps: no legal/support links |
| 2 | `/student/login` | Needs work | **auth UX fixed (§16.3)**: `?next=` honoured, reset link added, error in `role="alert"` with `aria-invalid` + refocus, labelled controls, 390 px clean (30/30 checks). Still no MFA | error recovery (Nielsen #9) |
| 3 | `/student/signup` | Needs work | **signup UX fixed (§16.3)**: confirmation field, live password rules, required consent, `autoComplete`, announced errors. Still no email-verification step | error prevention, informed consent |
| 4 | `/partner/login` | Needs work | **fixed (§16.4)**: pending/inactive accounts get an explanatory `role="status"` message after a correct password; `?next=`, reset link and announced errors shared with student login. Still no MFA | visibility of system status |
| 5 | `/partner/signup` | Needs work | **fixed (§16.4)**: required licence/registration number (stored on `User.licenseNumber`), confirmation + live rules, consent, labels, announced errors | match between system and real world |
| 6 | `/invite/[token]` | Needs work | **fixed (§16.4)**: generic `<h1>`, noindex, privacy note, payment dates/method, per-document download via a token-scoped guest endpoint (section + ownership enforced), 390 px clean | privacy by default, semantic hierarchy |
| 7 | `/home` | **Good** | **fixed (§16.5)**: 390/768/1440 clean (0 overflow, 0 unlabeled controls, one `h1`, 0 sub-24 px targets, AA contrast, 0 console errors); empty ad rail removed for non-admins; role-correct prompts; metric cards match Prisma | density is still high (6 quick actions + rail), but no gate fails |
| 8 | `/advertisements` | **Good** | **fixed (§16.9)**: shared manager list with live/scheduled/paused/expired counts derived once from the data, schedule/order/destination per row, one-click focused editor, inline delete confirmation, live preview fed by the same state, stored `s3:` images streamed per row, non-owner writes 403, 390/1440 clean (39/39 with the section) | — |
| 9 | `/application` | **Good** | **fixed (§16.9)**: 25-row server pagination with true range/count, stage chips with counts that preserve the sort, three orderings, page-clamp redirect, scoped cards/table, empty and invalid-stage states, empty-by-default create form, 390/1440 clean | — |
| 10 | `/application/[id]` | **Good** | **fixed (§16.9)**: 404 for unknown and out-of-scope ids, student-name `h1` with program subtitle, canonical stage labels, `<dl>` facts, "N of M verified", per-document named 36 px file links, inline rejection with a reason shown to the student, terminal-stage confirmation before writing, 390/1440 clean | — |
| 11 | `/apply` | **Good** | **fixed (§16.6)**: task heading "Start an application", current-step marker, save-per-step rule stated, leave warning (`beforeunload`), every control labelled, server-searched program picker (40-row cap + true total), draft resume → submit verified end-to-end (36/36) | — |
| 12 | `/documents` | **Good** | **fixed (§16.6)**: student upload → staff reject → re-upload pre-filled → staff verify round-trip verified in the browser; 30-day expiry warning, per-row status explanation, humanised staff badges, pending-first ordering, all/pending filter, 24 px targets | — |
| 13 | `/messages` | **Good** | **fixed (§16.8)**: role-scoped searchable contacts (20-cap stated), unread badges, open thread marked read with `aria-current`, per-thread 50-message pagination, labelled composer with `role="alert"`/`role="status"` (no `alert()`), sender sees "Read", 390/1440 clean (54/54 with the section) | — |
| 14 | `/my-applications` | **Good** | **fixed (§16.6)**: real `<h1>` with the slogan as subtitle, `aria-current` stage tabs with counts, `role="status"` confirmation, cards link to their program, document counts come from the DB (unlinked uploads included), humanised stage badges, 24 px targets | — |
| 15 | `/my-shortlist` | **Good** | **fixed (§16.7)**: read-only page (no `ShortlistView` writes), share text lists courses with no URL, reorder/remove verified against DB positions, compare dialog semantics + focus restore + 3-chip cap, staff mutations need `studentId` (422), 390/768/1440 clean (97/97) | — |
| 16 | `/partner-commissions` | **Needs work** | §16.11 adds search, pagination, weighted commission rates, and mobile cards; production browser metrics remain unverified | responsive, truthfulness of data |
| 17 | `/payments` | **Good** | **fixed (§16.7)**: real KPIs matched to Prisma, refunds separated/signed, method + type filter with counts, staff 100-row cap stated with true total, scoped and focusable tables, card rows at 390, 390/768/1440 clean | — |
| 18 | `/profile` | **Good** | **fixed (§16.8)**: every field labelled and grouped in fieldsets, first/last name editable, `autoComplete`, `role="alert"` summary + focus, `role="status"` save, invalid/future birthday 422, `role="progressbar"` completeness with a named missing list, one currency source, role-appropriate fields | — |
| 19 | `/programs` | **Good** | **fixed (§16.5)**: 24 per page with "Page N of M" and "N of M" badges, cross-page shortlist selection, PDF export (3.8 KB), staff view read-only, 0 overflow at 390/1440 | — |
| 20 | `/programs/[id]/analytics` | Needs work | **authz fixed (§14 #2)**: only SUPER_ADMIN/MANAGER; student/agency/counselor are redirected and no data leaks (verified §15). Metric label fixed | authorization, privacy |
| 21 | `/reports` | **Needs work** | §16.11 scopes totals to related students and applies the chosen date period to both summary and CSV; visual/runtime checks remain open | flexibility, consistency |
| 22 | `/scholarships` | **Needs work** | §16.10 sends the duplicate listing to `/programs`, leaving one catalogue path; runtime review remains open | consistency & standards |
| 23 | `/scholarships/[id]` | **Needs work** | §16.10 adds a student Apply CTA, shared currency fee display, request-host sharing and generic heading; runtime review remains open | clear affordance, consistency |
| 24 | `/search` | **Good** | **fixed (§16.5)**: labelled q/country/level controls, true total from Prisma (63 = 63), stated "first 50 of N" cap, `overflow-x: auto` table, 24 px `View` targets, staff-only verified, 390/1440 clean | — |
| 25 | `/settings` | **Needs work** | §16.13 removes the one-language control; currency persistence and labels/errors were improved; session revocation and security headers remain separate hardening work | honesty/status, consistency |
| 26 | `/short-courses` | **Good** | **fixed (§16.7)**: honest enrolment state machine verified end-to-end (free enrol/withdraw, paid receipt → staff approve/reject), class link only after approval, category filter with counts, 60-row stated cap, server-searched program picker (no catalogue leak), staff receipt queue scoped, archived courses 404, 390/768/1440 clean | — |
| 27 | `/short-courses/[id]` | **Good** | **fixed (§16.8)**: unknown/archived ids return a real 404 for students (staff see the archived state), request-host share link, humanised badges, one fee renderer, bank details from enrolment through rejection, state-driven panel (pending payment / review / rejected / enrolled / completed), own-receipt link, staff see no student controls, 390/768/1440 clean | — |
| 28 | `/transaction` | **Needs work** | §16.11 adds 25-row pagination/counts, type filtering, human labels, responsive cards and labelled transaction form; browser review remains open | responsive, user control |
| 29 | `/users` | **Needs work** | §16.12 adds server pagination/search/role/status filters, mobile cards, scoped role editing and invite-copy feedback; browser review remains open | error prevention, flexibility |
| 30 | `/users/[id]` | **Needs work** | §16.12 replaces the full-catalogue shortlist picker with a server-search picker and exposes document links/status; browser review remains open | least privilege, conceptual model |
| 31 | `/users/[id]/analytics` | Needs work | **authz + money fixed (§14 #2/#10)**: SUPER_ADMIN/MANAGER only, refunds excluded, per-currency totals; page-level redirect surfaces as a 200 payload redirect (§15 nuance) | authorization, data integrity |
| 32 | `/visitor-form` | **Needs work** | §16.13 enables manager access and create/update/delete lead actions, status filtering and responsive cards; runtime review remains open | match to real world, accessible forms |
| 33 | `/forgot-password` | Good | new page (§16.3): labelled email, generic response (no account enumeration), rate-limited, 390 px clean | privacy, error recovery |
| 34 | `/reset-password` | Good | new page (§16.3): signed single-use 30-min token, live password rules, weak/tampered/reused token rejected, confirmation, labelled controls | security, error prevention |

**Totals (post-fix, current table):** 0 Blocked · 0 Poor · 16 Needs work · 18 Good. Section G moved `/advertisements` and
`/application/[id]` to Good (39/39 checks), so `/application` and those two pages all score Good.
`/apply`, `/documents` and `/my-applications`
moved to Good in §16.6 after a 36/36 browser run (including upload → reject → re-upload → verify and draft → submit).
`/student/login`, `/student/signup` moved out of Poor in §16.3; the three partner/invite pages moved out of Poor in
§16.4; the two recovery pages score Good; `/home`, `/programs` and `/search` moved from Poor to Good in §16.5. The
seven pages that flipped from Blocked to Needs work are fixed in §14 (#2, #3, #4, #5, #10, #13) and verified at
runtime in §15/§15.2, but have not been re-reviewed visually after the fix.

### Visual capture inventory (this pass)

| Role | Widths | Pages | Status |
|---|---|---|---|
| public | 1440 / 768 / 390 | 6 | captured |
| SUPER_ADMIN | 1440 / 768 / 390 | 24 | captured |
| MANAGER | 1440 / 768 / 390 | 7 | captured |
| COUNSELOR | 1440 / 768 / 390 | 7 | captured |
| AGENCY | 1440 | 9 | partial (4 captured before interruption) |
| STUDENT | — | 14 | **not captured** |

New defects confirmed only in this pass:
- `/home` "Featured updates" card renders a **large blank image area** at both 1440 and 390 (ad image missing, no fallback, no reserved aspect ratio).
- `/application` at 390 dumps the student combobox **as an inline unstyled list** of 36 options, clipped mid-word (not a popover/listbox).
- `/users` at 390 clips the email column and hides Actions entirely; at 1440 the Actions column is clipped at the right edge.
- `/partner-commissions` at 390 clips the Tuition column mid-number (confirmed, not just measured).
- `/search` at 390 clips the "undergrad" badge and the "View" action.



## 10. Corrections / things I got wrong earlier

Recorded so they are not repeated as findings:

1. **`/reports/export` 404** — false alarm. I probed `/reports/export` instead of `/api/reports/export`. Real route: 200 CSV, injection-safe. Do not report as a bug.
2. **"Manager sees all transactions on `/reports`"** — partly wrong. `/reports` redirects STUDENT and COUNSELOR; MANAGER is allowed. The real inconsistency: the page's `transactionScope = {}` includes agency-only payout rows, while `GET /api/transactions` scopes by `relatedStudent: studentScopeWhere`, so the page and API disagree. Report as inconsistency, not a broad leak.
3. **"Students can reach `/users/[id]/analytics`"** — only if they bypass the edge guard; runtime showed `/users/...` redirected for STUDENT. The real exposure is any *partner* role (AGENCY/MANAGER/COUNSELOR) plus the unguarded `users/[id]/analytics` page.
4. **"`app/error.tsx` is a global error page"** — true in shape, but `app/global-error.tsx` also exists. The defect is duplication/misplacement, not absence of a global boundary.
5. **UI/UX subagent's "student pages runtime verified"** — not true; student screenshots were code-derived only (stale auth). Treat student visual findings as unverified until captured.
6. **Login form failure** — the early failure was a native GET submit because inputs had no `name` attributes and the click fired before hydration; not a security bug, but a progressive-enhancement gap and a dev hydration symptom. Keep it as P2/P3.
7. **`/documents` "super admin cannot see documents"** — confirmed and root-caused to the permission function, not to missing data.

---

## 11. Prioritized remediation plan

### S0 — Stop the bleeding — **all six applied (§14)**
1. Guard `programs/[id]/analytics` and `users/[id]/analytics` (`canAccessStudent`, role gates); remove the `/users/[id]` "More Details" link for unauthorized roles. → **DONE (§14 #2)**
2. Gate `GET /api/short-courses/[id]`: expose `meetingLink`/`bankDetails` only to SUPER_ADMIN or an enrollment with paid/approved status; strip them from list props. → **DONE (§14 #3)**
3. Fix the RSC function-prop crash on `/short-courses/[id]` (client wrapper for receipt upload). → **DONE (§14 #4)**
4. Fix `canAccessStudentDocuments` / `directDocumentStudentScopeWhere` for SUPER_ADMIN and MANAGER. → **DONE (§14 #5)**
5. Validate requested role in `PATCH /api/users/[id]` against `creatableRoles(actor)` and rank. → **DONE (§14 #6)**
6. Re-check `status`/`role` in the JWT/session callback or per request; shorten token lifetime; revoke on password/role/status change. → **DONE per request + 12 h JWT (§14 #1)**

### S1 — Core flows / role model
7. Student document journey: student-accessible documents view, fix `docsOk` gate, fix `/documents` dead link, link wizard uploads to `applicationId`. → **DONE (§14 #13, verified §15.2)**
8. Add Apply CTA to `/scholarships/[id]`; unify program detail URLs. → **code updated (§16.10); runtime review open.**
9. Password reset + approval-state messaging + session revocation UX. → **reset DONE (§16.3), approval-state messaging DONE (§16.4)**; session revocation on reset still open.
10. Implement or remove `/sub-agencies` (schema + page + roles + tests); add or remove `/my-documents`. → **`/my-documents` dead matcher removed (§16.13); `/sub-agencies` remains open pending scope/schema decision.**
11. Reconcile nav/guards (`/users` AGENCY, `/transaction` COUNSELOR, `/visitor-form` MANAGER). → **visitor manager route/API now implemented (§16.13); broader per-role runtime matrix remains open.** *(`/programs` proxy matcher entry: DONE, §14 #7.)*
12. Fix reports transaction scope; add date range. → **code updated (§16.11); runtime review open.**

### S2 — UX / accessibility / responsive
13. Label every dashboard form (`htmlFor`/`id`, `autoComplete`, `aria-invalid`, `role="alert"`); replace `alert`/`confirm` with toast + AlertDialog. → **code updates across G–K; browser/keyboard sweep remains open.**
14. Mobile reflow on affected staff pages → **responsive layouts updated for G–K (§16.9–§16.13); remaining visual metrics require browser reruns.**
15. Pagination + result counts + sorting on users/programs/scholarships/application/transaction; mobile cards. → **users, application, and transaction updated; scholarships now redirects to the single paginated programs catalogue. Runtime review remains open.**
16. Enrollment affordance split; compare modal semantics; carousel pause (**DONE, §14 #12**); contrast tokens.
17. Real i18n or remove the language switcher; persist currency to `User.preferredCurrency`. → **language selector removed; currency persistence added (§16.13), runtime check open.**

### S3 — Polish / hardening
18. `not-found.tsx`, corrected `error.tsx`, content-only skeleton.
19. Security headers/CSP, image host allowlist, trim receipt audit payload, handle program-delete FK.
20. Refresh seed + fixtures; make E2E green; add regression tests for every P0.

### Definition of done
- Every P0 has an automated regression test.
- Full E2E green on a fresh seed.
- Visual QA at 390/768/1440 for all 32 pages, including student and agency.
- `pnpm build` + `pnpm typecheck` green; working tree clean except the audit file.

---

## 12. Open questions / still unverified

**Verification gap caused by environment (not by the code):** the Neon Postgres endpoint
(`ep-weathered-glitter-azj3pb39-pooler.c-3.ap-southeast-1.aws.neon.tech:5432`) became unreachable during
the audit. Re-diagnosed on 2026-11-12: DNS resolves correctly (CNAME → `c-3.ap-southeast-1.aws.neon.tech`,
A records `52.76.108.241`, `52.76.128.157`, `13.251.213.89`), but TCP connect to **all three** on 5432
timed out during the 2026-11-12 pass. A dedicated `studyabroad_audit` Neon DB was reachable for Section F
(54/54 checks on 2026-11-17), then timed out during the Section G rerun later that day. Earlier `qa-*`
fixture cleanup is recorded in §13. For this continuation, that transient DB access prevents closing the
runtime checks for sections G–K; the local Docker engine was unavailable.

- ~~Student visual QA (14 pages)~~ — **done**: 75 captures in `.audit-shots/v2/` (§15.1).
- ~~Agency visual QA for the remaining pages~~ — **done** (same batch).
- ~~Numeric overflow / unlabeled-control counts~~ — **done for those 25 pages** (`.audit-shots/v2/metrics.json`).
- Keyboard-only traversal and focus order on every page.
- Screen-reader names for icon-only controls.
- Cross-browser (Firefox/WebKit) rendering.
- Lighthouse/Core Web Vitals and bundle size.
- PDF output fidelity (program, shortlist, receipt).
- Email/WhatsApp share behavior in production.
- Load behaviour of `currentUser()`'s per-request DB query (§14 #1) — functional proof only, no load test.
- Password reset does not revoke already-issued JWTs (bounded by the 12 h lifetime); needs a `sessionVersion`/`passwordChangedAt` column once migrations are trustworthy (§8).
- Reset mail delivery is only exercised through the server-log fallback; Resend delivery is untested without an API key.
- Whether `/sub-agencies` is intended for this milestone or out of scope.
- Whether agency `/users` access is intentional (nav intentionally omitted?).

---

## 13. Cleanup state

Untracked audit artifacts:
- `AUDIT_FINDINGS.md` — this record (keep).
- `.audit-shots/v/` — 136 screenshots at 1440/768/390 (public/admin/manager/counselor evidence).
- `.audit-shots/v2/` — 75 screenshots + `metrics.json` for the student/agency pages (§15.1).
- `.audit-check.ts` — Neon fixture cleanup script (keep only until the QA accounts are deleted).
- `.audit-verify.ts` — 35-check regression script for the S0 fixes + document journey (§15, §15.2); runs against the local test DB.
- `.audit-docs.ts` — 15-check student document-journey script (§15.2).
- `.audit-auth.ts` — 30-check Section A verification (login/next, signup, forgot/reset, labels, 390 px) (§16.3).
- `.audit-partner.ts` — 22-check Section B verification (partner signup/licence/pending login, guest invite + download) (§16.4).
- `.audit-visual2.ts` — the capture/metrics harness behind `.audit-shots/v2/`.
- `.audit-f.ts` — 54-check Section F verification (course detail, messages, profile, S3 media) (§16.8).
- `.audit-g.ts` — 39-check Section G verification (pipeline, detail, advertisements) (§16.9).
- `.audit-hk.ts` — shared 78-check Sections H–K responsive/render/error and role-navigation sweep (§16.10–§16.13).
- `.audit-hk-workflows.ts` — report export and visitor-lead workflow/role/unique-ID regression.
- `.audit-lib.ts`, `.audit-warm.ts` — shared login/metrics helpers and the cold-start warmer used by the later harnesses.

Removed after inspection: `.audit-playwright.ts`, `.audit-runtime*.ts`, `.audit-visual.ts`, `.audit-debug.ts`, the 31 full-page dev PNGs, and the empty/stale metrics files; the one-off S3/diagnostic scripts written during section F (`.audit-s3*.ts`, `.audit-diag.ts`, `.audit-overflow-diag.ts`, `.audit-404-diag.ts`, `.audit-s3-list.mjs`) were deleted once the run was green.

- The prior audit's original source fixes are recorded in §14; continuation source edits and runtime-found fixes are recorded in §16.9–§16.13.
- Production server `next start -p 3210` was started for verification and stopped afterwards.
- Local test DB: Docker container `sa-portal-pg` (postgres:17-alpine, host port 5433, database `studyabroad`,
  schema via `prisma db push` + `prisma db seed`). It is **not** referenced by `.env`; it only ever existed as a
  per-process `DATABASE_URL` override. Remove with `docker rm -f sa-portal-pg`.
- **Section F on Neon (2026-11-17):** Docker Desktop's Linux engine stopped starting on this machine, so section F
  was verified against a dedicated database on the same Neon instance, `studyabroad_audit`, created and seeded with
  `prisma db push` + `prisma db seed` (the harness accepts only `localhost:5433` or that database name). The app
  database `neondb` was never used for audit mutations.
- **Neon DB cleanup — done (2026-11-17):** `.audit-check.ts` removed the five leftover `qa-*@studyabroad.test`
  accounts and the one `QA Provider` short course; 96 users remain and `/users` no longer lists fixtures.
- **Object storage — done:** the `assets` bucket was created on the Neon S3 gateway, the direct round-trip test
  (PUT → GET byte-identical → DELETE → 404) passed, and the two receipt objects left by the section F runs were
  pruned; the bucket is empty again.
- No production data (Neon) was modified, and nothing was deleted outside the `qa-*` fixture namespace.

`git status` shows this file plus the temporary audit artifacts above, plus the source changes listed in §14 (the S0 fix pass was applied after the audit). `.env` is unchanged and still points at Neon.

---

## 14. Fixes applied (S0 + quick hardening)

Applied after the audit. Runtime proof is in §15 (local Postgres); Neon itself remains unreachable.

| # | Fix | Files |
|---|---|---|
| 1 | **Session revocation.** `currentUser()` now loads the user's current `role`/`status` from the DB on every call and returns `null` for deleted/inactive users. Demotion and deactivation take effect on the next request. JWT lifetime reduced 30 d → 12 h. | `src/lib/session.ts`, `src/lib/auth.config.ts` |
| 2 | **Analytics authorization.** Program analytics now redirects every role except SUPER_ADMIN/MANAGER; the `/programs` title links to analytics only for those roles. User analytics is limited to SUPER_ADMIN/MANAGER and only renders STUDENT targets; "More Details" is hidden for other roles/targets. | `programs/[id]/analytics/page.tsx`, `users/[id]/analytics/page.tsx`, `programs/page.tsx`, `users/[id]/page.tsx` |
| 3 | **Meeting-link gate.** `GET /api/short-courses/[id]` strips `meetingLink` unless the caller is SUPER_ADMIN or has an `enrolled`/`completed` enrollment; the detail page renders the link and forwards it to the client component only for enrolled/completed students (or SUPER_ADMIN); the list passes `null` unless enrolled. | `api/short-courses/[id]/route.ts`, `short-courses/[id]/page.tsx`, `short-courses/page.tsx` |
| 4 | **Paid-course crash.** Removed the `onUploaded` function prop from `UploadReceipt`; the component calls `router.refresh()` itself. This removes `onUploaded={function}` from the RSC payload. | `components/upload-receipt.tsx`, `short-courses/[id]/page.tsx` |
| 5 | **Documents scope.** SUPER_ADMIN and MANAGER now see/access every student's documents, matching `canAccessStudent`; AGENCY stays limited to created students, COUNSELOR to assigned. | `src/lib/permissions.ts` |
| 6 | **Role escalation.** `PATCH /api/users/[id]` validates the requested role against `creatableRoles(actor)`; a MANAGER can no longer grant MANAGER or any role above their create rights. | `api/users/[id]/route.ts` |
| 7 | **`/programs` added to the proxy matcher** (it was the one protected prefix missing). | `src/proxy.ts` |
| 8 | **Invite page** now sends `robots: noindex, nofollow` (it renders student PII/payments). | `invite/[token]/page.tsx` |
| 9 | **Error/404 surfaces.** Added `src/app/not-found.tsx`; `error.tsx` no longer renders a nested `<html>/<body>`, uses `<h1>`, and no longer nests a `<Button>` inside `<Link>`. | `src/app/not-found.tsx`, `src/app/error.tsx` |
| 10 | **Analytics money.** Excludes `REFUND` rows, sums per currency, and formats with `formatCurrency` instead of a hard-coded `MYR`. Conversion metric renamed to "Applications per view" (it legitimately exceeds 100%). | `users/[id]/analytics/page.tsx`, `programs/[id]/analytics/page.tsx` |
| 11 | **Documents copy.** The header no longer says "limited to your counselor/student cases" (wrong for SUPER_ADMIN/MANAGER after #5); the scope sentence and group title are role-derived. | `documents/page.tsx` |
| 12 | **Carousel pause (WCAG 2.2.2).** The auto-rotating dashboard rail pauses while hovered and has an explicit Pause/Play toggle (`aria-pressed`) in both the rail and image variants. | `components/dashboard-ad-rail.tsx` |
| 13 | **Student document journey.** `POST /api/applications` and `POST /api/applications/[id]/submit` now attach the student's unlinked documents (`applicationId: null`) to the application, so wizard uploads reach the doc gate. `/documents` gained a STUDENT branch (upload form + own document list + status/expiry), is no longer PARTNER_ONLY in the proxy, and is in the student nav. The wizard pre-selects the draft and links to `/documents`; `/my-applications` turns the amber warning into an "Upload documents" action. | `api/applications/route.ts`, `api/applications/[id]/submit/route.ts`, `documents/page.tsx`, `apply/page.tsx`, `components/application-wizard.tsx`, `components/upload-document.tsx`, `my-applications/page.tsx`, `proxy.ts`, `lib/permissions.ts` |

**Fix verification:** `pnpm typecheck` passes and `pnpm build` compiles the full route tree (three consecutive green builds across the edit batches). Runtime verification against a local Postgres is recorded in §15.

**Not yet fixed (still open):** mobile reflow, form labels, pagination, currency unification, password reset, `/sub-agencies`, Apply CTA, full a11y pass — see §11 S1–S3.

**Residual risk of these fixes:** the highest-risk change is #1 (`currentUser` now hits the DB): every authenticated request performs one extra `user.findUnique`, and a DB outage now redirects instead of serving stale sessions. That is the intended trade-off, but it has not been load-tested (see §15 for functional proof).

---

## 15. Runtime verification on a local Postgres (2026-11-12)

The Neon endpoint stayed unreachable (TCP 5432 timeout on all three IPv4s, pooled and direct), so the fixes were
verified against a throwaway local database instead. **Neon was never modified and `.env` was never edited.**

**Test setup (all temporary):**
1. Docker Desktop was started, then `postgres:17-alpine` was run as container `sa-portal-pg` on host port **5433**.
2. `prisma migrate deploy` → **failed** (schema drift, see §8). `prisma db push` succeeded and produced the schema
   the app actually expects.
3. `tsx prisma/seed.ts` against the local DB → seeded admin/manager/agency/counselor/student (password `admin1234`).
4. `next start -p 3210` with `DATABASE_URL` overridden **only for that process**; the built app code is identical to
   what was typechecked/built above.

**Result: 35/35 runtime checks passed** (`.audit-verify.ts`, re-runnable):

| Area | Verified behaviour |
|---|---|
| Proxy | anonymous `/programs` → 307 `/` |
| Course API auth | anonymous `GET /api/short-courses/[id]` → 401 |
| Paywall | not-enrolled student JSON has **no** `meetingLink`; after enrolling it appears; manager/counselor/agency never receive it; SUPER_ADMIN keeps it (owns the course) |
| Course page | enrolled student sees "Join Meeting", 200, no error boundary |
| Analytics authz | student/agency blocked from `/users/[id]/analytics`; counselor/agency blocked from `/programs/[id]/analytics`; manager allowed on both; **no analytics markers leak into the blocked responses** |
| Role escalation | manager `PATCH {role:"MANAGER"}` → 403, `{role:"SUPER_ADMIN"}` → 403, DB role unchanged; manager cannot create ads (403) |
| Paid-course crash | PAID course created → student enrolled → detail 200 (no RSC crash) → meeting link hidden → receipt upload 201 → detail re-renders showing "Receipt under review" |
| Documents scope | student → `/documents` renders the student workspace (200); SUPER_ADMIN, MANAGER, COUNSELOR and AGENCY all see the student's document |
| Carousel | pause control absent with <2 ads, present after two ads are created |
| Session revocation | deactivated user loads `/home` (200) then is redirected (307) on the very next request; JWT `expires` = 12.00 h |

**Behaviour nuance to know:** Next's page-level `redirect()` can surface as HTTP 200 with the redirect instruction in
the RSC payload when the layout has already begun streaming. Blocked analytics pages therefore look like `200` to a
plain `curl`, but the protected content is **not** in the body. If a hard 3xx is required (e.g. for scanners), move
these role checks into `src/proxy.ts`.

**Cleanup:** test rows created by the script are deleted in its `finally` block; the container is disposable
(`docker rm -f sa-portal-pg`). The Neon `qa-*` accounts still need `.audit-check.ts` once Neon is reachable.

### 15.1 Student + agency visual pass (closes the last visual gap)

The local DB also unblocked the 25 pages that had no screenshots: **75 captures** (25 pages × 1440/768/390) in
`.audit-shots/v2/`, with per-page layout metrics in `.audit-shots/v2/metrics.json`. **56 clean, 19 with findings;
no console or page errors on any of the 75 loads.**

| Page | Width | Finding |
|---|---|---|
| `/home` (agency) | 390 | **253 px horizontal overflow**, driven by the stat/hero grid (`.grid.gap-5`) — confirms the earlier 242 px measurement |
| `/search` | 390 / 768 | **395 px / 26 px overflow** from the results table + 4 unlabeled controls |
| `/scholarships/[id]` (student) | 390 | **161 px overflow** — header action row (`div.flex.items-center`) plus a 17 px-wide anchor pushes past the viewport (new finding) |
| `/partner-commissions` | 390 | **146 px overflow** from the commission table (earlier estimate 260 px) |
| `/my-applications` (student) | 390 | **80 px overflow**; the card row and an absolutely positioned badge (`-right-16`) escape the viewport |
| `/my-applications` | 1440 | decorative `div.absolute.-right-16` extends 45 px past the viewport (also on `/home`, both roles) |
| `/scholarships` | 1440 | table is **238 px wider than the viewport even on desktop** (five `th.p-4` columns, no wrapper scroll) |
| `/users` (agency) | 768 / 390 | Accounts table 86 px / 455 px wider than viewport; Actions column is the last to clip |
| `/transaction` | 768 / 390 | 145 px / 514 px table overflow (nine columns) |
| `/payments`, `/my-shortlist` (student) | 390 | tables 218 px / 337 px wider than viewport |
| `/my-applications` | 768 | 6 clipped containers |

Interpretation: the mobile reflow work in §11 S2 item 14 must also cover `/scholarships` (table + detail header),
`/my-applications` cards, `/payments`, `/my-shortlist`, and the agency `/users` + `/transaction` tables. The
scholarships table is the only desktop-width regression found in this pass.

Unlabeled-control counts on the captured pages: `/my-applications` 2, `/scholarships` 2, `/search` 4, `/home`,
`/users`, `/transaction`, `/partner-commissions`, `/payments`, `/my-shortlist`, `/messages` 1 each — the same
systemic label gap as §11 S2 item 13, now confirmed on student/agency pages too.

### 15.2 Student document journey (2026-11-13)

Second runtime pass, same local container/build, script `.audit-docs.ts` (**15/15 checks passed**). It exercises the
whole path a student actually takes, through the HTTP API and a real browser page:

| # | Check | Result |
|---|---|---|
| 1 | student `GET /documents` → 200 and renders "My documents" | pass |
| 2 | student uploads a document **before** any application exists (`applicationId: null`) | 201 |
| 3 | student creates+submits an application | 201 |
| 4 | the pre-uploaded document is now linked to that application (`applicationId` matches) | pass |
| 5 | staff move it to `UNDER_REVIEW` | 200 |
| 6 | staff attempt `OFFER` with required documents missing | **422 (gate holds)** |
| 7 | student uploads `TRANSCRIPT` + `IELTS` against the application | 201 / 201 |
| 8 | student attempts to self-verify a document | **403** |
| 9 | staff verify all three documents | 200 ×3 |
| 10 | staff move to `OFFER` after verification | **200 (gate opens)** |
| 11 | browser: `/documents` shows "Passport" and "3 total" | pass |
| 12 | browser: `/my-applications` shows "3/3 verified" | pass |

The UI assertions use a Playwright browser (visible text), because RSC splits interpolated values into separate text
nodes — a raw-HTML `includes("3/3 verified")` is a false negative, not a UI bug.

Regression note: `.audit-verify.ts` was updated for the new behaviour (students now *reach* `/documents` instead of
being redirected) and still reports **35/35** after the document-journey edits.

---

## 16. Page completion programme (started 2026-11-13)

The remaining work is organised **by page, not by defect class**, so every page can be declared finished on
evidence. Each section covers 2–3 pages; a section is only closed when every page in it passes the checklist below,
is re-verified at runtime against the local Postgres, and is recorded here. Nothing is claimed as fixed until its
section is closed.

**Progress tracker — update this table as sections close.**

| Metric | Value |
|---|---|
| Sections closed with runtime evidence | **A, B, C, D, E, F, G** (21 pages) |
| Sections with code updates pending runtime closure | **H, I, J, K** |
| Page verdicts (§9d) | 18 Good · 16 Needs work · 0 Poor · 0 Blocked (current table; Section G moved two pages) |
| Harnesses green | auth 30/30 · partner 22/22 · discovery 41/41 · journey 36/36 · money 97/97 · section F 54/54 · section G 39/39 · verify 35/35 · documents 15/15 |
| Last updated | 2026-11-18 (Section G closed on the disposable Neon DB; advertisement edit 500 fixed) |

### 16.1 Definition of done — applied to every page

| # | Gate | Test |
|---|---|---|
| F1 | Primary task completes end-to-end (create → read → update → delete where applicable) | scripted API/browser flow |
| F2 | Every visible control does something; no dead links, no `href="#"`, no 404 target | link crawl + click audit |
| F3 | Correct role access: allowed roles reach it, denied roles get no data (not just a redirect in the payload) | one login per role |
| F4 | Empty / loading / error / success states all render and are distinguishable | forced-state checks |
| F5 | Counts, money and scopes match the database; no silent caps (`take: 100`) on user-facing lists | SQL cross-check |
| F6 | Forms: every control has a label (`htmlFor`/`id`), sensible `autoComplete`, inline errors announced (`role="alert"`), focus moves to the first invalid field, no `alert()`/`confirm()` | computed DOM + keyboard |
| F7 | Responsive at 390 / 768 / 1440: no horizontal overflow, no clipped table without a scroll affordance | `metrics.json` per page |
| F8 | A11y: exactly one `h1`, images have alt text, targets ≥ 24 px, visible focus ring, AA contrast | measured DOM |
| F9 | No console errors / hydration warnings / failed requests | console capture |
| F10 | Page verdict in §9d updated, evidence recorded in §16, section committed | this file + git |

### 16.2 Sections

| § | Section | Pages | Status |
|---|---|---|---|
| A | Public entry + auth | `/`, `/student/login`, `/student/signup` | **DONE — 30/30 checks (§16.3)** |
| B | Partner entry + invite | `/partner/login`, `/partner/signup`, `/invite/[token]` | **DONE — 22/22 checks (§16.4)** |
| C | Student home + discovery | `/home`, `/search`, `/programs` (student view) | **DONE — 41/41 checks (§16.5)** |
| D | Applications + documents | `/apply`, `/my-applications`, `/documents` | **DONE — 36/36 checks (§16.6)** |
| E | Student money + shortlist | `/payments`, `/my-shortlist`, `/short-courses` | **DONE — 97/97 checks (§16.7)** |
| F | Course detail + profile | `/short-courses/[id]`, `/messages`, `/profile` | **DONE — 54/54 checks (§16.8)** |
| G | Staff application pipeline | `/application`, `/application/[id]`, `/advertisements` | **DONE — 39/39 checks (§16.9)** |
| H | Catalogue | `/programs`, `/scholarships`, `/scholarships/[id]` | **78/78 shared H–K render/role checks passed; catalogue actions open (§16.10)** |
| I | Finance + reports | `/partner-commissions`, `/transaction`, `/reports` | **78/78 shared H–K render/role checks passed; export/transaction flows open (§16.11)** |
| J | People | `/users`, `/users/[id]`, `/users/[id]/analytics` | **78/78 shared H–K render/role checks passed; CRUD/scope flows open (§16.12)** |
| K | Analytics + settings | `/programs/[id]/analytics`, `/settings`, `/visitor-form` | **78/78 render/role checks + 12/12 report/lead workflow checks; settings/dashboard behavior open (§16.13)** |

### 16.3 Section A — public entry + auth

Scope: the three pages every visitor touches before any session exists. Known defects from §5/§9d: `nextPath`
ignored after login, no password recovery at all, signup without consent/password confirmation, no
`aria-live`/`aria-invalid`, missing `autoComplete` on signup, no `name` attributes (no-JS dead form).

Plan:
1. `LoginForm`: honour a validated `?next=` path, role default otherwise; `role="alert"` error + `aria-invalid`;
   focus the first invalid field; add "Forgot password?"; show a success notice after reset.
2. `SignupForm`: password confirmation, live requirement checklist, `autoComplete`, announced errors, required
   consent checkbox, focus management.
3. Password recovery: `POST /api/auth/forgot-password` (generic response, rate-limited), `POST
   /api/auth/reset-password` (single-use signed token, 30 min), `/forgot-password` + `/reset-password` pages,
   password change revokes existing sessions.
4. Verify with `.audit-auth.ts` (API + browser at 390/1440) and close the section in §9d/§16.

**Result — 30/30 checks passed** (`.audit-auth.ts`, 2026-11-13, local Postgres, production build):

| Area | Verified behaviour |
|---|---|
| `?next=` | signing in at `/student/login?next=/users` lands on `/users`; unsafe paths (`//host`, `/api/…`) are ignored |
| Bad credentials | inline `#login-error` in `role="alert"`, email field `aria-invalid="true"`, focus returns to email |
| Consent gate | submitting signup without consent is blocked with an announced message; checkbox has a real label |
| Labels / responsive | `/`, `/student/login`, `/student/signup`, `/forgot-password`, `/reset-password` all 0 px overflow at 390, 0 unlabeled controls, exactly one `h1` |
| Forgot password | identical generic 200 for a real and an unknown email; malformed email → 422; 6th request per IP → 429 |
| Reset token | weak password → 422; strong password → 200; replay → 400; tampered signature → 400 |
| Password change | old password no longer signs in; new password does |
| Regression | `.audit-verify.ts` 35/35 and `.audit-docs.ts` 15/15 still pass after the auth changes |

Design notes:
- Reset tokens are **stateless and single-use**: HMAC-signed `{userId, expiry, last-10-chars-of-bcrypt-hash}`. No
  token table, and any password change invalidates outstanding links automatically.
- Mail goes through Resend when `RESEND_API_KEY` + `MAIL_FROM` are set; otherwise the link is written to the server
  log (`[password-reset] …`), which keeps local/dev usable without a provider.
- Residual: an existing JWT session survives a password reset for up to the 12 h cap, because there is no
  `sessionVersion` column yet (§8 blocks clean migrations). Tracked in §12.

### 16.4 Section B — partner entry + guest invite

Scope: `/partner/login`, `/partner/signup`, `/invite/[token]`. Known defects: signup promised a licence review
without capturing a licence number; pending agencies saw "invalid email or password"; invite page used the
student's name as `<h1>`, listed documents without any way to open them, and payments without dates.

Plan:
1. `PartnerSignupForm` + API: required business-registration/licence number (stored in the existing
   `User.licenseNumber`), confirmation + live rules, consent, `autoComplete`, announced errors.
2. `authorize` + `LoginForm`: a correct password on a `pending`/`inactive` account now returns a specific code and
   the form explains the state (`role="status"`) instead of claiming bad credentials.
3. Invite page: generic `<h1>`, student named in the subtitle, section-specific data, payment dates/methods,
   document download, privacy note.
4. Guest document endpoint `/api/invite/[token]/documents/[id]`: token must be active, include the documents
   section, and the document must belong to the invited student; no session required.
5. Verify with `.audit-partner.ts` (API + browser at 390) and close the section.

**Result — 22/22 checks passed** (`.audit-partner.ts`, 2026-11-13, local Postgres, production build):

| Area | Verified behaviour |
|---|---|
| Rendering | `/partner/login` and `/partner/signup` at 390 px: 0 px overflow, 0 unlabeled controls, one `h1` |
| Consent | partner signup blocks submit until the authorisation checkbox is ticked, with an announced message |
| Licence | missing licence → 422; valid request → 201 and `User.licenseNumber`/`companyName` persisted with `status = pending` |
| Duplicate | re-using the email → 409 |
| Pending state | correct password on a pending account shows "awaiting approval" (`role="status"`), not "invalid credentials" |
| Approval | after `status = active`, the same credentials land on `/home` |
| Invite page | anonymous `200`, generic `h1`, document download link present, payment dates/method rendered |
| Guest download | token with the documents section → 200 `attachment`; another student's document → 404; invite without the section → 403 |
| Revoked invite | no student data rendered (404 status or the 404 page — Next can stream a 200 shell first) |
| Responsive | invite page at 390 px: 0 px overflow, one `h1` |

Nuance worth keeping: page-level `notFound()` can surface as HTTP 200 with the 404 document in the stream, exactly
like `redirect()` (§15). The check therefore asserts "no student data rendered", not just the status code.

### 16.5 Section C — student home + discovery

Scope: `/home`, `/search`, `/programs` (student view). Known defects: `/home` overflowed 253 px at 390 because its
single-column grids had no explicit track sizing; `/search` had three unlabeled controls, no result count, a silent
`take: 50`, and a fixed six-column table with no scroll wrapper; `/programs` rendered 170 unpaginated cards and had
no count, no sort and no navigation. `/search` is staff-only by design (nav roles exclude STUDENT), so the only
role question is whether a student can reach it — they cannot.

Plan:
1. `/home`: give every responsive grid an explicit zero-minimum track (`grid-cols-1`, `minmax(0,…)`) and `min-w-0`
   on truncating flex rows; label the shell currency selector and the advertisement dialog fields.
2. `/search`: sr-only `<label>`s for q/country/level, `role="search"`, real result count from `prisma.program.count`,
   an explicit "first 50 of N" note, `overflow-x-auto` + `min-w` table, `scope="col"`, 24 px+ targets with
   descriptive `aria-label`s, capitalised level labels, clear/reset actions.
3. `/programs`: server-side pagination (24 per page) with count, clamped `page`, filter changes resetting to page 1,
   accurate per-university badges ("N of M"), and a `Pagination` component reusable by later sections.
4. Student shortlist: selection survives page changes (module-level store, since App Router pagination is
   client-side), rows are no longer wrapped in `<label>` around links/buttons, tuition goes through `FeeDisplay`.
5. Verify with `.audit-discovery.ts` (API counts vs Prisma, browser at 390/768/1440, pagination, filters, roles,
   console) and close the section.

**Result — 41/41 checks passed** (`.audit-discovery.ts`, 2026-11-14, local Postgres, production build):

| Area | Verified behaviour |
|---|---|
| Rendering gates | 9 page/width combinations (`/home` 390/768/1440, `/search` 390/1440, student `/programs` 390/768/1440, staff `/programs` 390/1440): **0 px overflow, 0 unlabeled controls, exactly one `h1`, 0 targets under 24 px, 0 AA contrast failures, 0 console/page errors** |
| `/home` counts | metric cards match Prisma per agency scope: 1 application in progress, 0 pending documents, 1 lead, 0 visa-stage cases |
| `/home` roles | counselor sees no administration metrics or user management; super admin does; a student gets no partner dashboard (307) |
| `/home` ad rail | never asks a non-admin to create announcements (0 active ads in the fixture) |
| `/search` counts | 63 UI = 63 DB total; country 61 = 61; level 32 = 32; keyword "Bachelor" 2 = 2; the 50-row cap is stated, not silent |
| `/search` layout | results table sits in an `overflow-x: auto` wrapper (792 px table inside 307 px at 390, page overflow 0) |
| `/search` scope | a student cannot use the staff page (no search markers in the body) |
| `/programs` pagination | 63 total, 24 rows on page 1, "Page 1 of 3", page 2 renders a different set, out-of-range page clamps to 3 |
| `/programs` shortlist | selection survives page 1 → 2 → 1 (still checked), filter change resets to page 1 |
| `/programs` roles | staff view is read-only with no shortlist checkboxes |
| `/programs` export | 10 selections → export bar → `course-selection.pdf`, 3 794 bytes |
| Link crawl | `/home` 14, `/search` 30, `/programs` 30 internal links all resolve |
| Fixture | 60 QA programs seeded and removed in `finally`; DB back to 3 programs afterwards |

Two harness defects were also found and fixed during this section, because a green run has to mean something:

| # | Harness defect | Effect | Fix |
|---|---|---|---|
| H1 | `waitForLoadState("networkidle")` after pagination | App Router pagination is a client-side navigation, so the wait resolved instantly and three checks read the previous page | wait on the rendered `Page N of M` label |
| H2 | contrast parser only understood `rgb()` | Chrome computes Tailwind v4 colours as `oklch()`, so real failures were mis-measured (badge reported 1.05:1 instead of 3.76:1) | paint the colour into a 1×1 canvas and read the pixel back |

Additional defect found during the pass: the `/home` hero CTA labelled **"Find a student"** linked to `/search`,
which searches the program catalogue (and `/users` is admin/manager-only). Renamed to "Search programs" so the
label matches the destination.

Verification fixture: the local seed carries only 3 programs, which cannot exercise 24-per-page pagination or the
50-row search cap. `.audit-discovery.ts` therefore creates `QA Pagination University` with 60 `QA Program NN` rows
at the start and deletes the university (and its cascaded programs) in a `finally` block. Nothing else in the
database is touched, and the harness refuses to run unless `DATABASE_URL` points at `localhost:5433`.

Further defects found while running the pass (all fixed in the same commit):

| # | Defect | Evidence | Fix |
|---|---|---|---|
| C1 | Staff `/programs` overflowed 123 px at 390 px | hide-and-measure probe: university header row's min-content was 513 px because its flex group lacked `min-w-0` and the name is `nowrap` | `min-w-0` on the group, `flex-wrap` on the header, `shrink-0` on the count badge |
| C2 | University rendered both its logo and the initial-letter tile | `programs/page.tsx` rendered `{logoUrl && <img/>}` followed by an unconditional initial span | initial only when there is no logo |
| C3 | Export bar promised "pick 10–50" but the API accepts 1–50 | `pdf-bulk/route.ts` schema is `.min(1).max(50)` | copy now says "up to 50 courses per PDF" |
| C4 | Non-admins saw an empty 20 rem ad rail | `/home` rendered `DashboardAdRail` unconditionally in the right column | rail renders only when there are ads or the user can manage them; grid collapses to one column otherwise |
| C5 | Empty rail told agencies to "Add one", which only SUPER_ADMIN can do | rail copy was role-blind | managers get the create prompt, everyone else "New updates from your team will appear here" |
| C6 | Hero CTA "Find a student" led to the program catalogue | `href="/search"`, and `/users` is admin/manager-only | relabelled "Search programs" |
| C7 | Topbar unread badge was white on `red-500` = **3.76:1** at 10 px bold (AA needs 4.5) | probe: computed background `oklch(0.637 0.237 25.331)` = `#ef4444`, foreground `#fff` | `bg-red-600` (4.83:1) |
| C8 | `/home` card links ("View application pipeline", "Manage pipeline", "View all") were 23 px tall | measured `getBoundingClientRect().height` in the browser | `inline-flex min-h-6 items-center` → 24 px |
| C9 | Student `/programs` program-name links were 21 px tall at 768/1440 (22–24 per page) | same measurement, one per row | same `min-h-6` treatment on the name link |

Harness correction worth recording: the first strict run reported the unread badge as **1.05:1**. That was the scanner's
fault, not the badge's — Chrome computes Tailwind v4 colours as `oklch()`, which the `rgb()`-only parser could not read,
so it fell through to the page background. The scanner now paints each colour into a 1×1 canvas and reads the pixel
back, which is exact for any CSS colour and immediately showed the real 3.76:1.

### 16.6 Section D — student journey (`/apply`, `/my-applications`, `/documents` student view)

Scope: `/apply`, `/my-applications`, `/documents` (student branch). Known defects from §9: `/my-applications`
uses a slogan as its `<h1>` and its "Check documents" tile is a dead end for a student with no documents;
`/apply` is titled "Apply Application", ships every program to the client, and a draft is only persisted at the
final submit; `/documents` shows rejected documents with no re-upload affordance, no expiry warning, raw status
badges on the staff branch, and 12 px "Open file" links.

Plan:
1. `/my-applications`: real `<h1>` ("My applications") with the slogan moved to the subtitle; hide/disable the
   document tile when the student has no documents; link each application row to its detail page; make the stage
   filter a proper `aria-pressed`/tab pattern with counts; announce the `submitted` confirmation via `role="status"`.
2. `/apply`: rename the heading, cap/paginate the program picker (server search instead of shipping all rows),
   surface the "your progress is saved up to the program step" rule, warn before leaving step 3 (`beforeunload`),
   and label every control.
3. `/documents` (student): "Re-upload" action on rejected documents that pre-fills the type, an expiry warning
   (`expiresAt` within 30 days), 24 px+ targets, and a status explanation per row. Staff branch: humanised badges,
   pending-first ordering, and a pending/all filter.
4. Verify with a Section D harness (Profile/Education round-trip, draft create → resume → submit, document upload
   → reject → re-upload → verify, role scoping for staff vs student) plus browser checks at 390/768/1440.

**Result — 36/36 checks passed** (`.audit-journey.ts`, 2026-11-15, local Postgres on 5433, production build):

| Area | Verified behaviour |
|---|---|
| Rendering gates | 6 page/width combinations (`/my-applications`, `/documents`, `/apply` at 390 and 1440): **0 px overflow, 0 unlabeled controls, exactly one `h1`, 0 targets under 24 px, 0 AA contrast failures, 0 console/page errors** |
| `/my-applications` semantics | `<h1>` is "My applications"; exactly one `aria-current="page"` tab; `?submitted=1` confirmation is a `role="status"` region |
| `/my-applications` data | one card per DRAFT row in the database (counted in Prisma and re-checked after creating a draft); "Check documents" resolves 200 |
| `/apply` shell | heading is "Start an application"; exactly one `aria-current="step"`; save-per-step copy present; typing then leaving raises a real `beforeunload` dialog |
| Program picker | search box has an accessible name; server search narrows 3 → 1 for "Bachelor of Engineering (Electrical)"; the footer states the cap ("N programs available" / "first 40 of N") instead of truncating silently |
| `/documents` student | rejected document offers "Re-upload" and pre-selects `TRANSCRIPT`; a document expiring in 10 days shows "Expires in 10 days"; each row explains its status in words |
| Document lifecycle | student upload → staff reject with reason → the reason reaches the student → UI re-upload creates a replacement (PENDING) → staff verify → the student sees "Checked and accepted" |
| Draft lifecycle | API creates a draft → it appears as one card in the Drafts tab → `/apply?draft=` resumes it → the final step says it completes the draft → submitting moves it to `SUBMITTED` and lands on `?submitted=1` |
| Role scope | a student cannot read another student's rejection reason; `AGENCY` gets no wizard content |

Defects found and fixed in this section:

| # | Defect | Evidence | Fix |
|---|---|---|---|
| D1 | `/my-applications` `<h1>` was the slogan "Your study journey, in one place." | rendered DOM | real task heading; slogan demoted to the subtitle |
| D2 | Application cards were not navigable and leaked raw enums ("UNDER_REVIEW") | static + DOM | program-name link to the program page, `humanize(stage)` badges |
| D3 | Document counts only counted documents linked to that application, so uploads made before an application existed were invisible | Prisma vs UI | tile + metric count the student's documents directly |
| D4 | Stage filter had no selected state; the `submitted` banner was silent to screen readers | DOM | `aria-current="page"` + `role="status"` |
| D5 | `/apply` was titled "Apply Application", never said progress was saved, and its "Close" button only reloaded the page | static + DOM | task heading, save-per-step copy, real link back to My applications |
| D6 | The wizard had no current-step semantics and no leave guard | DOM | `aria-current="step"`, `beforeunload` once a field is edited |
| D7 | The program picker shipped the **entire** catalogue to the client and silently cut the list at 40; its 6 filter controls and its search box were unlabelled | page payload + DOM | new `/api/programs/picker` (40-row cap, true total, facet lists), `Field` labels, stated cap, `aria-pressed` options |
| D8 | **Verification found a real bug in the new picker API**: `Number(null)` is `0`, so `tuitionFee <= 0` filtered out every program — the picker was empty for every user | `GET /api/programs/picker` → `{programs: [], total: 0}` | only apply fee bounds when the parameter is present and non-empty |
| D9 | `/application` (staff) pre-selected the first program, so "Add application" could file the wrong one, and it shipped the full catalogue | static | picker starts empty, submit disabled until a program is chosen, same server search |
| D10 | Rejected documents had no re-upload path; the upload form's controls were unlabelled | DOM | `ReuploadDocument` (pre-fills type + application), `Field` labels, `role="alert"`/`role="status"` feedback |
| D11 | No document-expiry warning | schema has `expiresAt`, never surfaced | amber "Expires in N days" and a red expired state |
| D12 | Staff `/documents` rendered raw enum badges and had no filter | DOM | `humanize()` badges, pending-first ordering, All/Pending toggle |
| D13 | Document status had no meaning in words | DOM | one explanation per row ("Waiting for review", "Checked and accepted", "Needs replacing") |
| D14 | "Open file" and inline actions were 12 px tall | `getBoundingClientRect` | `inline-flex min-h-6 items-center` (≥ 24 px) |
| D15 | "Missing or unverified documents" used `text-amber-600` (≈ 3.2:1 at 12 px) | canvas-measured contrast | `text-amber-700` |
| D16 | `/my-applications` overflowed 80 px at 390: the course-list card links were grid items without `min-w-0` | hide-and-measure probe (blocked elements until overflow hit 0) | `min-w-0` on the card link; named text truncates instead of pushing the badge out |

Harness defects found and fixed while getting to a green run (a green run has to mean something):

| # | Harness defect | Effect | Fix |
|---|---|---|---|
| H3 | `page.locator("select").first()` inside the wizard | selected the shell currency `<select>` instead of Gender, leaving "Save & continue" disabled and timing out | label-scoped `getByLabel("Gender *")` etc. |
| H4 | Dialog handler called `dismiss()` | Playwright's dismiss **cancels** the navigation, so the next `page.goto` aborted with `ERR_ABORTED` | `accept()` |
| H5 | Narrowed-list assertion read the DOM immediately after `fill()` | read the pre-debounce list (3 of 3) | wait for the option count to settle |
| H6 | Draft API response parsed as `{id}` | the route returns `{success, data:{id}}`, so the draft id was null and the created draft leaked | read `data.id` and delete any DRAFT created during the run in `finally` |

Residual (recorded, not fixed): the wizard still saves profile/education **on Continue**, not continuously, and the
final step is the only place a program can be chosen — a student who reloads mid-wizard keeps the saved steps but
loses the unsaved one. `listPrograms()` remains unbounded for `/scholarships`, `/short-courses` and `/users/[id]`;
those pages are handled in their own sections (E/F/H/J).

### 16.7 Section E — student money + shortlist (`/payments`, `/my-shortlist`, `/short-courses`)

Scope: the three pages where a student checks what they owe/have paid, curates their shortlist, and enrols in
short courses. Known defects from §5/§9: `/payments` uses a KPI slot for a disclaimer, counts refunds as payments,
ships inconsistent caps (unbounded for students, silent `take: 100` for staff), has no method column on the staff
table and no totals; `/my-shortlist` writes a `ShortlistView` row on every GET, shares a login-walled
`localhost:3001` URL over WhatsApp, has no remove/reorder and a compare modal without dialog semantics (and a 4th
selection is silently ignored); `/short-courses` labels the enrol button "Enrolled ✓" even though clicking it
withdraws, ships the whole program catalogue to the super-admin form, has no category filter, an actionless
"pending" KPI, a MYR-only fee line, no empty-state CTA, and **no staff UI anywhere to review the receipts the paid
flow collects** (`PATCH /api/short-courses/enrollments/[id]` exists but nothing calls it, and there is no way to
open a stored receipt).

Plan:
1. `/payments`: real KPIs (total paid, payments recorded, refunds — refunds no longer counted as payments); humanised
   type badges; method on both tables; per-currency totals for staff; a type filter with counts for staff; the
   `take: 100` cap stated with the true total; responsive card rows at 390 instead of a 218 px sideways scroll;
   `scope="col"` and a focusable scroll region where tables remain; `text-slate-400`/`text-amber-600` contrast
   fixed; copy that explains payments are recorded by staff (no fake pay-now button).
2. `/my-shortlist`: remove the GET-side `ShortlistView` write; sentence-case heading; share text lists the courses
   instead of linking an authenticated page (and never `NEXT_PUBLIC_BASE_URL`); row actions for reorder + remove
   (`PATCH /api/shortlist` added) with inline confirm; compare modal gets `role="dialog"`, `aria-modal`,
   `aria-labelledby`, Escape-to-close, focus restore, `aria-pressed` chips, a stated 1–3 range and a disabled 4th
   chip; row-number contrast fixed; responsive rows; `rel` on the PDF link.
3. `/short-courses`: honest enrolment state machine — browse → enrol (free) / enrol-and-pay (paid) → payment
   pending → receipt under review → enrolled/rejected, each with its own label and next step; "Enrolled" is no
   longer a withdraw button; inline confirm instead of `window.confirm`; category filter with counts; bounded
   course list (60) with the cap stated; super-admin linked-program field uses the server-searched `ProgramPicker`
   so `/short-courses` stops calling `listPrograms()`; empty-state CTAs; sentence-case heading; `h2` card titles.
4. Staff receipt review: new `GET /api/short-courses/[id]/receipt` (student sees own, staff scoped by
   `canAccessStudent`), and a "Receipts awaiting review" panel on `/short-courses` with student, course, receipt
   link, Approve and Reject (`PATCH`), making the pending KPI actionable.
5. Verify with `.audit-e.ts` at 390/768/1440: rendering gates, payment totals vs Prisma, refund/payment counts,
   staff cap + filter, role scoping, shortlist GET-write removal, reorder/remove against DB positions, share text,
   dialog semantics, category filter, the full free and paid enrolment lifecycles including receipt review and
   access to the class link only after approval, and the receipt endpoint's 403 for outsiders.

**Result — 97/97 checks passed** (`.audit-e.ts`, 2026-11-16, local Postgres on 5433, production build):

| Area | Verified behaviour |
|---|---|
| Rendering gates | 14 page/width combinations (`/payments` student + admin, `/my-shortlist` student, `/short-courses` student at 390/768/1440, `/short-courses` admin at 768/1440): **0 px overflow, 0 unlabeled controls, exactly one `h1`, 0 targets under 24 px, 0 AA contrast failures, 0 console/page errors** |
| `/payments` student | "Total paid" equals the summed non-refund rows per currency from Prisma; "Payments recorded" equals the non-refund row count; "Refunded" equals the refund rows as a positive amount; refund history rows are signed `−` in amber; types ("Service Fee", "Deposit", "Refund") and methods ("Bank transfer", "Card", "Online payment") are humanised; a payment with no application says "General payment · not linked to an application"; another student's note is absent; 390 px renders cards, not the table |
| `/payments` staff | the 100-row cap is stated in both the KPI and the table footer with the **true** total, and exactly 100 rows render; every `th` has `scope="col"` and a Method column; `?type=REFUND` narrows to the true refund count with one `aria-current`; `?type=BOGUS` falls back to the full list; agency/counselor do not see another student's payments |
| `/my-shortlist` | `<h1>` is "My shortlist"; opening the page leaves `ShortlistView` count unchanged (8 → 8); the WhatsApp text lists every shortlisted course and contains **no** URL; the PDF responds 200 `application/pdf`; staff `POST`/`PATCH` without `studentId` return 422; a staff account cannot read the page (lands on `/home` with no shortlist data); chips expose `aria-pressed`, Compare is disabled until 2 are chosen, a 4th chip is disabled at 3; the dialog has `role="dialog"`, `aria-modal="true"`, focus moves to Close, Escape closes it and restores focus to the trigger; moving a row down swaps both DB positions and the rendered order; removing a course asks inline, deletes the row and leaves the page |
| `/short-courses` list | `<h1>` is "Short courses"; students see no Add/Delete/Receipt controls and partners see no enrol controls; the category filter narrows the list (1 `LANGUAGE` card, one `aria-current`); `?category=NOPE` falls back; 61 extra fixtures produce "Showing the first 60 of N short courses." with exactly 60 `h2` cards; the super-admin HTML contains **no** program names (the form uses server search) |
| Free enrolment | "Enrol free" writes `enrolled`; the class link is absent before enrolment ("A meeting link will be shared closer") and present after; "Withdraw" asks inline and deletes the row, re-offering "Enrol free"; an archived course returns 404 through the API and staff get 403 when they try the student endpoint |
| Paid enrolment | "Enrol and pay" starts `pending_payment`, offers the receipt step, and keeps the class link out of the page; upload moves the row to `pending_approval` with a stored PNG data URL and "Receipt under review."; staff approval sets `enrolled`, records `approvedById`/`approvedAt`, empties the queue, and the student then sees "You are enrolled in this course!" plus the Join Class link |
| Receipt access | own receipt 200 (`image/png`); staff with access 200; unassigned counselor 403; another student 404; anonymous 401; the upload's `AuditLog.after` payload is 56 characters of `{fileName, bytes, mime}` and contains no base64 |
| Staff receipt queue | the pending KPI links to `#receipts` and matches the Prisma pending count; the row names the student and course and links to the scoped receipt; Approve leaves an empty queue; Reject asks inline, keeps the row as `rejected` and records the reviewer; agency/counselor queues hide an unassigned student's receipt; with 51 pending rows the queue renders 50 and says "Showing the 50 oldest of 51 receipts." |

Defects found and fixed in this section:

| # | Defect | Evidence | Fix |
|---|---|---|---|
| E1 | `/payments` used a KPI slot for a disclaimer, so the "metrics" were a sentence, a count of **all** transaction types and no money total | rendered DOM vs Prisma | real KPIs: Total paid, Payments recorded, Refunded |
| E2 | Refunds were counted as payments and displayed as unsigned amounts | Prisma cross-check | refunds excluded from paid/count, totalled separately as a positive magnitude, signed `−` in the history |
| E3 | Raw enums (`SERVICE_FEE`, `COMMISSION_PAYOUT`) and raw method keys (`bank_transfer`) reached the UI | rendered DOM | `humanize()` badges and a method-label map |
| E4 | The staff list silently cut at 100 rows and never said so | `take: 101` + true total | the cap is stated in the KPI and the footer (e.g. "the 100 most recent of 106") |
| E5 | The staff table had no method column, no totals and no way to narrow 100+ rows | static + DOM | Method column, per-currency net totals, type tabs with counts and `aria-current`, invalid-filter fallback |
| E6 | At 390 px the student history was a 218 px sideways-scrolling table | overflow probe | card list under `sm` for both roles; remaining tables are focusable regions with `scope="col"` |
| E7 | A payment with no application rendered an empty "Details" cell | rendered DOM | "General payment · not linked to an application" |
| E8 | `text-slate-400` dates and `text-amber-600` labels failed AA | canvas-measured contrast | `ink-muted`/`amber-700` |
| E9 | Every GET of `/my-shortlist` inserted a `ShortlistView` row — a page read wrote to the database and inflated the staff "last viewed" metric | DB count before/after | page is read-only; the metric is no longer polluted |
| E10 | The WhatsApp share text linked `http://localhost:3001/short-courses/<id>` (auth-walled, wrong host) | rendered `href` | share text lists the courses and their key facts, no URL |
| E11 | The shortlist had no remove and no reorder despite a `position` column | schema vs UI | new `PATCH /api/shortlist` swaps positions in a transaction; up/down (disabled at the ends) + inline-confirm remove; rendered order matches the DB |
| E12 | The compare modal was a bare overlay: no dialog semantics, no focus move/restore, and a 4th selection was silently ignored | DOM + keyboard | `role="dialog"`, `aria-modal`, label, Escape + focus restore, `aria-pressed` chips, stated 1–3 range, disabled 4th chip |
| E13 | A staff POST/PATCH/DELETE on `/api/shortlist` ran against the caller with no student chosen | API calls | staff mutations require `studentId` and return `422 "Choose a student first"` |
| E14 | The enrol control said "Enrolled ✓" but clicking it **withdrew** the student, "Interested" silently enrolled, and confirms used `window.confirm` | DOM + click | honest labels (Enrol free / Enrol and pay / Request a place / Complete payment / Upload a new receipt / Withdraw), status badges, inline confirm, `aria-expanded`/`aria-controls` |
| E15 | Paid students reached `pending_payment` with no way to pay or upload; the whole receipt review loop had no staff UI (`PATCH` existed with zero callers) | static + runtime | detail receipt form, `UploadReceipt` state machine, and a "Receipts awaiting review" panel with Open receipt / Approve / Reject |
| E16 | There was no endpoint to open a stored receipt at all, so "receipt under review" was unverifiable by staff | static | new `GET /api/short-courses/[id]/receipt`: own student 200, staff scoped by `canAccessStudent`, others 403/404/401 |
| E17 | The receipt audit entry stored the entire base64 file in `AuditLog.after` | audit row inspection | stores `{fileName, bytes, mime}` on the enrolment id (56 chars) |
| E18 | Archived courses could still be enrolled through the API | direct API call | non-active courses return 404 from the enrol endpoint |
| E19 | The receipt queue silently cut at 50 rows | `take: 50` | 50 rows plus "Showing the 50 oldest of N receipts."; approving/rejecting reveals the rest |
| E20 | `/short-courses` shipped the full program catalogue to the super-admin form, had no category filter, Title Case headings, `h3` card titles, no empty-state CTA and a MYR-only fee | page payload + DOM | server-searched `ProgramPicker` (no `listPrograms()` call), category tabs with counts, sentence-case `h1`, `h2` cards, CTAs, `FeeDisplay` |
| E21 | The course list was unbounded | `take` audit | 60-row bound with the true total stated |

Harness defects found and fixed while getting to a green run:

| # | Harness defect | Effect | Fix |
|---|---|---|---|
| H7 | `page.waitForResponse(...)` was created **after** the click | the fast response was missed, so DB assertions ran before the mutation landed | register the wait before clicking, with `.catch` attached immediately |
| H8 | A second "Details" click after `router.refresh()` | refresh preserves the client's open state, so the second click **closed** the panel | wait for the class link and only click when it is absent |
| H9 | Partner-denial checks used the seeded counselor/agency | the seeded student is genuinely assigned to both, so their access was correct and the test was invalid | fixture outsider + a fixture unassigned counselor; assertions now prove denial |

Residual (recorded, not fixed): receipts were stored as base64 data URLs on `ShortCourseEnrollment` (up to 5 MB
per row) because the schema has no file store — **superseded by §16.8: all media now lives in Neon object storage
and Postgres keeps only an `s3:<key>` reference**; the student payment list is intentionally **not** capped (a
student's own ledger should be complete, unlike the staff 100-row view); `ShortlistView` is now written nowhere, so
the "last viewed" signal staff had is orphaned.

### 16.8 Section F — course detail + profile (`/short-courses/[id]`, `/messages`, `/profile`)

Scope: the three authenticated pages Section E deliberately left open. Known defects: `/short-courses/[id]`
builds its WhatsApp link from `NEXT_PUBLIC_BASE_URL` (`http://localhost:3001`), hides the bank details exactly when
the enrolment reaches `pending_payment` (the moment the student needs them), renders raw `PAID`/`active` badges,
duplicates the fee, and answers an unknown or archived id with a 200 "Course not found." card; `/messages` appears
to be fixed in A15 but still dumps the user table into "Start a conversation", has an unlabeled composer using
`alert()`, caps history at 200 messages across all threads, and never shows or updates read state; `/profile` has
eight unlabeled controls, `alert()` errors, an invisible first/last name (allowed by the API but not rendered), no
`autoComplete`, no grouping, a completeness bar with no semantics, and the API accepts `new Date("garbage")` and a
future birthday, which reach Prisma as an invalid date and 500.

Plan:
1. `/short-courses/[id]`: `notFound()` for unknown ids (and for archived/inactive courses when the viewer is not
   staff); share URL derived from the request host (never `NEXT_PUBLIC_BASE_URL`); keep bank details, fee and a
   payment reference visible in `pending_payment` and `rejected`; one currency-aware fee renderer; humanised
   payment/session badges; a state-driven enrolment panel (not enrolled free/paid, pending payment, receipt under
   review with a link to the uploaded file, rejected with re-upload, enrolled/completed with class link + calendar)
   and no student controls for staff; 24 px+ actions, `rel="noreferrer"`, labelled file input with `role="alert"`
   errors and focus.
2. `/messages`: replace the user dump with a searchable, role-scoped contact list (server query, stated cap);
   unread badges and a thread that marks the opened conversation read; per-conversation pagination ("Load older")
   instead of one 200-message global cap; labelled composer with `role="alert"`/`role="status"` feedback instead of
   `alert()`; `<h2>` for both panes, `<time>` for timestamps, AA contrast on the 10 px timestamps; empty state for
   a student with no assigned contact; invalid `?with=` falls back safely.
3. `/profile`: associate every label (`Field`/`htmlFor`), render the first/last name fields the API already accepts,
   `autoComplete` on name/phone/country/birthday, grouped fieldsets with legends, birth date bounded to today on
   both client and server (reject invalid/future dates with 422, not 500), replace `alert()` with inline
   `role="alert"` + focus and a `role="status"` save confirmation, role-appropriate fields only, one currency
   source shared with the shell, and a `role="progressbar"` completeness bar that names what is missing.
4. Verify with `.audit-f.ts` at 390/768/1440: rendering gates; detail-page states across free/paid/pending/approved/
   rejected with the class link gated until approval and bank details present while payment is pending; share host;
   404 for unknown/archived ids; message send → receive → unread → read round-trip plus outsider/role denial;
   profile save round-trip (names, phone, birthday, currency) with invalid/future birthday rejected 422 and
   completeness/announcements correct.

**Result — 54/54 checks passed** (`.audit-f.ts`, 2026-11-17, production build, `next start` against the disposable
Neon database `studyabroad_audit` and the Neon S3 bucket `assets`):

| Area | Verified behaviour |
|---|---|
| Rendering gates | `/profile` student 390/1440 + agency 1440; `/short-courses/[id]` student 390/768/1440, admin 1440, free course 390; `/messages` student 390/1440 + admin 390 — every run: **0 px overflow, 0 unlabeled controls, exactly one `h1`, 0 targets under 24 px, 0 AA contrast failures, 0 console/page errors** |
| Profile | the completeness bar is a real `progressbar` (`aria-valuenow` 0, `aria-valuetext` "0% complete") and moves to 9 after one of eleven fields is saved; the missing list names Birthday; first/last name are rendered and editable; a blank first name is announced, focused and **not** saved; a future birthday is rejected inline and focused; the API answers 422 for invalid, future, blank and unknown-gender payloads; a valid save (200) persists names, phone and currency, announces `role="status"`, and `router.refresh()` updates the bar and the heading subtitle; the currency reaches the shell through `localStorage`; an agency profile shows company/licence, no student fields and no progressbar |
| Course detail | unknown id → **404**; archived course → **404** for a student and 200 + "Archived" badge for staff; the share link uses the request host; badges read "Paid"/"Test Prep"; the class link is withheld before enrolment; bank details are present from the start of the paid flow; "Enrol and pay" reaches `pending_payment` with the upload form; the uploaded receipt moves the row to `pending_approval` with an `s3:receipts/…` reference (**no base64**); the student opens their own receipt (200 `image/png`); approval reveals the class link and calendar; a completed enrolment keeps access and is labelled completed; rejection keeps the bank details, offers re-upload and links the old receipt; staff see the course state and **no** student controls; a free course unlocks on enrolment |
| Messages | both permitted contacts can message the student (201/201); opening a thread sets `readAt`; the other thread keeps its badge at 1; the open thread carries `aria-current="page"`; the composer sends, the thread log shows the message exactly once and `role="status"` announces it; an empty composer cannot be sent; the sender sees "Read"; a long thread renders 50 messages and the older page the remaining 7; a student's contact list holds only their counselor and agency; an invalid/forbidden `?with=` falls back to a permitted thread; student→student and a student→unassigned counselor are 403; an agency cannot message a student it did not create (403) but can message its own (201) |
| Media storage | a document upload returns `s3:documents/…` (no base64), streams back **byte-for-byte** (70/70) as `image/png`, and delete removes both row and object |

Defects found by this run and fixed:

| # | Defect | Evidence | Fix |
|---|---|---|---|
| F9 | The root `app/loading.tsx` and `(dashboard)/loading.tsx` boundaries started streaming the shell before the page ran, so `notFound()` could no longer set the status: `/short-courses/does-not-exist` answered **200** with the 404 UI, and an archived course was 200 for students too. The same streaming produced a transient second `h1` at 390 px | direct GET status + rendered DOM | both loading boundaries removed; page-level `notFound()`/`redirect()` now return real 404/307 (verified) |
| F10 | `/messages` overflowed by 2 px at 390 px: both grid cards defaulted to `min-width: auto` and their content set a larger min-content width than the grid column | overflow probe + `min-width` override experiment | `min-w-0` on both cards |
| F11 | Editing an advertisement without touching its image would have failed validation (`s3:` was not an accepted image value), and allowing arbitrary `s3:` values would let an admin attach any stored object | schema + route review | `dashboardImageUrl` accepts `s3:<key>`; the PATCH route accepts only the row's own reference, POST refuses stored references, and the form maps stored images to `/api/dashboard-ads/<id>/image` |

Harness defects found and fixed while getting to a green run:

| # | Harness defect | Effect | Fix |
|---|---|---|---|
| H10 | The rendering gate compared `metrics.unlabeled.length === 0`, but `METRICS_JS` already returns a **count** | every gate failed with "unlabeled undefined" | compare `metrics.unlabeled === 0` |
| H11 | `page.locator("[role=alert]")` was not scoped | Next's route announcer (`#__next-route-announcer__`) also has `role="alert"`, so strict mode aborted the run | scope to `form [role=alert]` |
| H12 | Server-rendered values were read immediately after the toast/status appeared | the completeness bar and subtitle looked stale, and the sent message was counted page-wide (the conversation list also previews it) | wait for `router.refresh()` to land (`waitForFunction`), then assert inside `role="log"` |

**Media moved to Neon object storage (applies to every section).** Every uploaded file used to be stored as a
base64 `data:` URL in Postgres (documents, short-course receipts, advertisement art). The database now stores only a
reference, `s3:<key>`, and the bytes live in the Neon S3-compatible bucket:

| Concern | Behaviour (as implemented) |
|---|---|
| Client | `src/lib/storage.ts` speaks the S3 REST API over HTTPS and signs each request with AWS Signature V4 (`node:crypto`), so no SDK dependency (the `@aws-sdk/client-s3` install stalled repeatedly on this network). Path-style addressing, region `ap-southeast-1`, bucket from `S3_BUCKET` (`assets`). |
| Operations | PutObject / GetObject / DeleteObject only. Upload failures surface as `502` with "The file could not be stored"; a missing object is `404`; unconfigured storage is `503`. |
| Keys | `documents/<ownerId>/<uuid>.<ext>`, `receipts/<studentId>/<uuid>.<ext>`, `dashboard-ads/<adminId>/<uuid>.<ext>`. The key never contains a user-supplied filename, and the owner id is stripped to `[A-Za-z0-9_-]`, so a key cannot escape its prefix. |
| Privacy | The bucket is private and objects are `Cache-Control: private, no-store`; files are streamed by authenticated routes only: `/api/documents/[id]` (student self or `canAccessStudentDocuments`), `/api/invite/[token]/documents/[id]` (invite scope), `/api/short-courses/[id]/receipt` (own receipt or staff), `/api/dashboard-ads/[id]/image` (any signed-in user, matching ad visibility). |
| Lifecycle | Replacing a receipt deletes the previous object; deleting a document or an advertisement deletes its object; a failed row update after a successful upload deletes the orphan. |
| Legacy rows | `readStoredFile()` still decodes old `data:` URLs, so no data migration is required and previously uploaded files keep working. |
| Ad images | Uploaded `data:image/…` payloads are stored and the form shows `/api/dashboard-ads/<id>/image`; an edit that leaves the image untouched sends the existing `s3:` reference back and the route refuses any stored reference that is not the row's own (no attaching another object). External `https:` art is untouched. |
| Config | `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` in `.env` (gitignored); `.env.example` documents the names with placeholders. Audit runs use a dedicated disposable Neon database (`studyabroad_audit`), never the app database. |

Residual (recorded, not fixed): advertisement `https:` URLs are still rendered directly by the browser, so that image
host sees the viewer's IP (the stored path does not); legacy `data:` rows stay in Postgres until re-uploaded or
deleted; the S3 bucket is reachable only from networks that allow outbound 443 to the Neon storage gateway (this
machine intermittently reset the TLS connection to it, which is why the harness runs were repeated); and the orphaned
`DocumentViewer` component still assumes `data:`/http URLs. Section F share-link host, `pending_payment` bank details,
raw enum badges and the `/messages`/`/profile` defects are closed.


### 16.9 Section G — staff application pipeline (`/application`, `/application/[id]`, `/advertisements`)

Scope: the three staff pages that drive an application from draft to enrolled and control the dashboards' announcements. Known defects carried in from §5/§9d: the pipeline loaded every visible application with no paging, no counts and no sort; the stage filter was a JavaScript-only `<select>` that silently dropped the active sort; the create form pre-selected the first student; `/application/[id]` answered an unknown id with a **200** "Application not found." card, redirected out-of-scope ids back to the list (revealing that the record exists), used the program name as the `h1`, rendered raw enum stages, and gave every document link the same accessible name "Open file"; rejections went through `window.confirm()` and always stored the reason "Rejected by staff"; `/advertisements` hid schedule, order, destination and paused/scheduled/expired state, offered a one-click destructive delete, and **every edit answered 500** (see G1). The pass also completed the interrupted rewrite of `application/page.tsx` that was already in the working tree.

**Changes made:**

- `/application`: 25-row server page (`skip`/`take`), true filtered total and visible range ("Showing 1–25 of 54 applications"), out-of-range pages redirected to the last real page, stage counts from a scoped `groupBy`, and three orderings (recently updated, oldest update, student A–Z). The stage filter is now server-rendered links carrying real counts, marking exactly one `aria-current`, and preserving the active sort; unknown stage/sort values fall back instead of erroring. Empty filtered results explain the state and offer "Show all stages". Rows are cards below `sm` and a captioned, column-scoped table above it, with humanised stage labels and a Visa column.
- Create form: starts with **no** student, requires both a student and a program before submit, shows `role="alert"`/`role="status"` feedback, resets the selection after a successful draft, and explains the case where a counselor has no assigned students instead of rendering a dead form.
- `SearchableSelect`: a native collapsed `<select>` under a search field (the old exposed listbox dumped every option onto the page), keeping a filtered-out selection visible and stating "N of M options".
- `/application/[id]`: unknown **and** out-of-scope ids both answer a real **404**; the student name is the `h1` with the program/university as subtitle; canonical stage labels/tone; program facts in a `<dl>`; "N of M verified" from the documents the viewer may see; per-document 24 px+ "Open file" links with distinct `aria-label`s; the document-gate hint is `amber-700`; responsive document rows.
- Document verification: rejection is inline (no browser dialog), requires a reason shown to the student, announces success in `role="status"` and displays the stored reason on the row.
- `/advertisements`: new shared `AdvertisementManager` + `AdvertisementsClient`. The list is the primary surface — live/scheduled/paused/expired status (one derivation shared by rows and counts), schedule, order and destination host per row, one-click "New announcement" that focuses `#ad-title`, inline delete confirmation with `role="alert"`, and a live preview rail fed by the same state so the preview cannot disagree with the editor. Stored `s3:` images render through `/api/dashboard-ads/<id>/image`; external URLs still render directly.

**Result — 39/39 checks passed** (`.audit-g.ts`, 2026-11-18, production build, `next start` against the disposable Neon database `studyabroad_audit`; fixtures removed by the harness `finally` block):

| Area | Verified behaviour |
|---|---|
| Rendering gates | counselor `/application` 390/1440, counselor `/application/[id]` 390/1440, admin `/advertisements` 390/1440 — every run: **0 px overflow, 0 unlabeled controls, exactly one `h1`, 0 targets under 24 px, 0 AA contrast failures, 0 console/page errors** |
| Access | a student requesting `/application` is 307'd to `/my-applications`; a visible detail id answers 200 while a counselor's out-of-scope id and an unknown id both answer **404**; `/advertisements` 307s a counselor to `/home`; student and agency `PUT /api/applications/:id` are **403** and an illegal DRAFT→ENROLLED move is **422**; a counselor's advertisement `PATCH`/`POST` are **403/403** |
| Pipeline | seeded counselor scope: 54 visible applications → 25 rows, "Showing 1–25 of 54", page 2 "26–50", `page=999` → `page=3` "51–54"; stage chips equal the `groupBy` counts (all 54, rejected 1) with one `aria-current`; `?stage=REJECTED&sort=student_asc` renders exactly the rejected row and every chip href keeps `sort=student_asc`; the empty OFFER filter explains itself and offers a reset; `?stage=BOGUS` falls back to the full first page; student A–Z puts the QA Alpha row first and marks the sort current |
| Create | the select starts empty, the out-of-scope student is absent (4 options), submit is disabled; choosing a student + server-searched program files a **DRAFT**, announces `role="status"`, shows the new row and resets the select to empty; a duplicate for the same program is **409**; a counselor with no students sees the explanation and no student control |
| Detail | `h1` = student name with program subtitle; UNDER_REVIEW offers only Under Review/Rejected/Withdrawn and hides the document-gated Offer with the required-documents hint; DRAFT offers Draft/Submitted/Withdrawn; "0 of 2 verified" matches the visible documents; each "Open file" link names its document and is 36 px tall; Verify → `VERIFIED` + `verifiedById` + announced; Reject stores the typed reason, shows it on the row, and raises **no** browser dialog; VISA→ENROLLED asks "This is a terminal stage." and does **not** write before confirmation, then stores ENROLLED and announces |
| Advertisements | counters match a database-derived status model (7 total · 3 live · 1 scheduled · 2 paused · 1 expired); "New announcement" focuses `#ad-title`; create stores order 9 and shows **Live**; edit persists the new title; unchecking "Show" stores `active: false` and the row says **Paused**; a future start date stores and the row says **Scheduled**; delete requires the inline confirmation and removes the row; the preview rail shows only a currently-live ad; a foreign `s3:` reference is **422** on POST and on PATCH, the row's own reference round-trips **200**, and the stored value is unchanged |
| Cross-role | only `SUPER_ADMIN` reaches `/advertisements` and can write advertisements; staff scoping is applied by the shared `studentScopeWhere` (the out-of-scope application is invisible in both the list and the detail) |

Defects found by this run and fixed:

| # | Defect | Evidence | Fix |
|---|---|---|---|
| G1 | **No advertisement could be edited.** `PATCH /api/dashboard-ads/[id]` called `dashboardAdSchema.partial()`, and Zod refuses `.partial()` on an object schema carrying a `superRefine`, so the handler threw before touching the row and answered **500** every time | instrumented harness response (`500 {"success":false,"error":"Internal server error"}`) + server log `Error: .partial() cannot be used on object schemas containing refinements` | validation split into `dashboardAdFields` (plain object), `dashboardAdSchema` (fields + schedule refinement) and a new `dashboardAdPatchSchema` (`fields.partial()` + the same refinement); the PATCH route uses it. Create, rename, pause, schedule and delete now round-trip |
| G2 | Rejecting a document used `window.confirm()` and always stored "Rejected by staff" | component diff | inline reason field (required, labelled, 500-char cap), `role="alert"`/`role="status"`, the stored reason rendered on the row |
| G3 | An unknown application id answered **200** with "Application not found.", and an out-of-scope id redirected to `/application` (which confirms the record exists) | direct GET status | both paths now `notFound()` (verified 404/404) |
| G4 | The create form pre-selected the first student and enabled submit with no program, so one click could file the wrong application | rendered `/application` | empty initial selection, submit gated on both fields, one-click feedback, reset after create, no-students explanation |
| G5 | `SearchableSelect` rendered an always-open listbox (`size`) that dumped every option into the page and pushed the layout past 390 px; a filtered-out selection disappeared from view | 390 px probe + component review | native collapsed `<select>` + search field, filtered-out selection kept visible, "N of M" count |
| G6 | `/application/[id]` used the program name as `h1`, raw enum stages, ambiguous facts, identical "Open file" names and a 20 px back link; `/advertisements` showed no status/schedule/order and deleted on one click | rendered DOM + target measurement | student-name heading with program subtitle, canonical labels, `<dl>` facts, per-document `aria-label`s, `min-h-8` link (36 px measured), status model with counts and inline delete confirmation |

Harness defects found and fixed while getting to a green run:

| # | Harness defect | Effect | Fix |
|---|---|---|---|
| H13 | The page-2 assertion read the URL and the DOM immediately after a client-side navigation | the click was reported as "no navigation" and the range was assumed to end at the last row | `waitForURL(/page=2/)`, then compute the page range from the real total |
| H14 | The rejection reason was asserted straight after the success toast | `router.refresh()` had not repainted the server row yet | wait for the reason text, then assert |
| H15 | The editor `fill` raced `startEdit`'s re-render | the stored title overwrote the typed one — which for a while hid G1 behind an apparent harness race | wait until `#ad-title` holds the clicked row's title before typing; once that was fixed the real 500 surfaced |

Residual (recorded, not fixed): the pipeline still shows a counselor's applications grouped only by stage (no saved views or bulk transitions); advertisement edits are not optimistic beyond the refetched list, so two admins editing at once keep last-write-wins. Because `SearchableSelect` is shared with the H–K pages (invite and program forms), the H–K sweep was re-run: all 78 rendering/role checks passed. That script's separate visitor-lead step still times out locating a newly created lead's status control — a pre-existing harness/list-pagination issue left open with Section K (no fixture is left behind; the `finally` block removed it).

### 16.10 Section H — catalogue (`/programs`, `/scholarships`, `/scholarships/[id]`)

**Changes made:** `/scholarships` now redirects to `/programs`, avoiding the second catalogue implementation. The scholarship detail keeps an Apply action for students, uses the shared currency-aware fee display, shares using the request host, has a generic page heading, and shows a fallback university mark when no logo exists. Program detail dialogs now link to the actual program route and no longer trigger analytics requests as a navigation side effect.

**Verification:** `.audit-hk.ts` ran against the production build and Neon audit DB. The shared 78-check H–K sweep passed: all 12 routes at 390/768/1440 had 0 overflow, 0 unlabeled controls, one `h1`, 0 under-24 px targets, 0 AA contrast failures, and 0 console/page errors; redirects and error UI were also checked. This covers rendering, not student Apply submission or program editing/deletion.

**Runtime defects found and fixed:** the detail action group overflowed 39 px at 390; program links were under 24 px; the report currency caption failed contrast. Actions now wrap, links meet the minimum target height, and the caption uses the muted contrast token. These fixes passed the final H–K rendering sweep.

### 16.11 Section I — finance + reports (`/partner-commissions`, `/transaction`, `/reports`)

**Changes made:** commission rows now have search and pagination, weighted rate calculations, and responsive mobile cards. Transactions use a 25-row page, true counts, type filtering, responsive cards, labelled form fields, and inline deletion feedback. Reports scope totals to the current actor's related students and apply the chosen date window to both the summary and CSV export; aggregate values use database grouping rather than loading all transactions into application memory.

**Verification:** all Section I pages passed shared H–K rendering checks at 390/768/1440. A further workflow pass verified the 90-day report filter updates the page and CSV/Excel links, and the 90-day CSV endpoint returns valid content. Transaction creation/deletion, commission-rate editing, and staff/agency data scoping still need dedicated behavior checks.

### 16.12 Section J — people (`/users`, `/users/[id]`, `/users/[id]/analytics`)

**Changes made:** user search, role/status filters, pagination and mobile cards; role changes constrained to `creatableRoles`; invite form requires an explicit student selection and exposes accessible labels/status. User detail uses the server-search program picker for shortlist additions, humanised status, and authenticated document links. The obsolete promote-user control was removed.

**Verification:** `/users`, user detail, and both analytics routes passed shared H–K rendering checks at 390/768/1440; agency navigation to `/users` passed. Runtime layout probes found user detail overflow/short links and 28 px overflow at 768 on the user table. Detail widths/targets and the user table breakpoint were fixed; the final H–K sweep passed. Role edits, invite lifecycle, agency record scope, and document authorization still need behavior checks.

### 16.13 Section K — analytics, settings, visitor leads

**Changes made:** the home dashboard replaces the 1,000-row transaction and application reads with grouped/monthly aggregates. Currency selection persists through `/api/profile`; the pretend single-option language selector was removed. Password/profile/user forms expose labels, autocomplete, and inline errors. Visitor leads support manager access, status filtering, create/update/delete actions and responsive cards; manager navigation now matches that access. Agency navigation now includes `/users`, whose page and APIs scope agency accounts to students they created. Dead `/my-documents` proxy matcher entry was removed because that route has no page or API; `/documents` is the supported route.

**Verification:** `/programs/[id]/analytics`, `/settings`, and `/visitor-form` passed shared H–K rendering checks at 390/768/1440; agency Users and manager Visitor Form navigation/route checks passed. The 12-check follow-up verified visitor leads at all three widths with unique IDs and no render errors; manager create → status update → confirmed delete; counselor create denial; and manager API read access. The temporary lead and its audit rows were cleaned up. Dashboard aggregation, currency persistence, and other feedback states still need behavior checks. Final `pnpm typecheck`, production build (all 52 routes), and `git diff --check` passed.

**Neon/object storage regression:** `.audit-f.ts` was rerun against `studyabroad_audit` and bucket `assets` on 2026-11-18; **54/54 checks passed**, including S3 receipt/document upload, private scoped reads, byte-for-byte document streaming (70/70), object/row deletion, and cleanup. No application database was used.

**Runtime defect found and fixed:** the desktop table and mobile lead cards had duplicate status-control IDs because both responsive layouts exist in the DOM. Each copy now has a unique, correctly associated label. The 12-check workflow run verified no duplicate IDs at 390/768/1440 and the desktop status update end-to-end.

**Still open from the earlier audit:** `/sub-agencies` has no schema/page and its intended scope is unresolved; password reset does not revoke already-issued JWTs (12-hour expiry); CSP/security headers and production image-host policy are not configured; in-memory rate limits do not coordinate across instances; full seeded Playwright E2E, keyboard/screen-reader, Firefox/WebKit, Lighthouse/Core Web Vitals, and production share/email/PDF fidelity remain unverified. Sections G–K have rendering and targeted behavior evidence, not complete business-flow coverage. Neon DNS/connection requests were intermittent, but the 23-check G suite, 78-check H–K render/role suite, 12-check report/lead workflow, and 54-check Neon/S3 regression all passed.

### 16.14 Full Playwright regression attempt (2026-11-18)

Ran `pnpm test:e2e` against a dedicated `studyabroad_audit` Neon database on a separate local port. Result: **67 passed, 23 failed, 18 skipped/not run, and 1 flaky setup case**. No run was made against the application database. The failures cluster into three groups:

- **Stale assertions/selectors:** signup tests expect an old heading and do not account for the confirmation-password field; catalog tests still expect `/scholarships` to be a page even though it redirects to `/programs`; student shell selectors match both desktop and mobile sidebars; admin assertions match duplicated responsive content without scoping to the table/card; some home/visitor headings no longer match the current UI.
- **Missing product scope:** `/sub-agencies` remains absent (no page/schema), despite being required by the brief and referenced in legacy E2E tests. The proxy matcher now includes `/sub-agencies/:path*` so anonymous access is guarded; authenticated agency hierarchy and commission-visibility flows are still not implemented.
- **Unresolved E2E behavior/fixture issues:** seeded application, transaction, advertisement removal, and the long program CRUD journey had failures; student auth setup had one transient 401; remaining journey tests were skipped after the program CRUD failure. These were not treated as passed based on the focused route-rendering checks.

This run does **not** establish a clean full regression. Existing targeted Section G–K and Neon/S3 checks remain passing, but the full E2E failures above must be resolved or deliberately retired against the current product scope before calling the system error-free.
