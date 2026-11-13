# Study Abroad Portal — Consolidated Audit Record

Last updated: 2026-11-12 (audit + S0 fix pass; see §14)
Auditor: automated code + runtime audit (static read of all pages/routes, live exploit verification, partial visual QA)

This file is the single source of truth for the audit. It records **facts**, **evidence**, **severity**, **what was corrected**, and **what is still unverified**. Do not restate findings from memory without checking here.

---

## 0. Status summary

| Area | Status | Evidence |
|---|---|---|
| Static review of all pages | DONE | 32 `page.tsx` files read |
| Static review of all API routes | DONE | 38 `route.ts` files read |
| Libs / schema / proxy / config / tests | DONE | permissions, auth, session, api, stages, validation, schema.prisma, proxy.ts, next.config.ts, playwright config, seed |
| Build + typecheck | DONE (pass) | Baseline `pnpm build` + `pnpm typecheck`, 47 routes; both re-run green after the §14 fixes |
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
| 2 | `/student/login` | Poor | no password reset anywhere; error text not `aria-live`; `nextPath` ignored; no `name` attrs (no-JS dead form) | error recovery (Nielsen #9), progressive enhancement |
| 3 | `/student/signup` | Poor | no consent, no password confirm, no strength, no licence upload promise kept | error prevention, informed consent |
| 4 | `/partner/login` | Poor | identical to student login; pending-approval state invisible | visibility of system status |
| 5 | `/partner/signup` | Poor | promises "licence review" with no licence field or reference number | match between system and real world |
| 6 | `/invite/[token]` | Poor | PII/payments page with **no `noindex`**; `<h1>` is the student's name; docs not downloadable | privacy by default, semantic hierarchy |
| 7 | `/home` | Poor | blank ad card (~360 px empty), auto-rotating carousel, misleading KPI labels, 18 modules, 242 px mobile overflow | minimalist design, WCAG 2.2.2, responsive |
| 8 | `/advertisements` | Needs work | carousel-only, no list/status/schedule, "New ad" two clicks deep | flexibility, visibility of status |
| 9 | `/application` | Poor | mobile renders a raw unstyled option dump (36 students), 204 sub-24 px targets, no count/pagination/sort | error prevention, Fitts's law, responsive |
| 10 | `/application/[id]` | Needs work | `<h1>` is the program name; terminal stage change has no confirm/undo; raw enum badge | user control & freedom (Shneiderman), semantics |
| 11 | `/apply` | Needs work | **document journey fixed (§14 #13)**: wizard uploads attach to the draft/new application, so the verification gate can pass (verified §15.2). Still: one-way wizard, no save-and-exit warning | closure, user control |
| 12 | `/documents` | Needs work | **authz fixed (§14 #5), student workspace added (§14 #13)**: SUPER_ADMIN/MANAGER see all students; students get upload + own-document list. Still: no re-upload shortcut on a rejected doc, no expiry warning | consistency, error recovery |
| 13 | `/messages` | Poor | entire user table dumped into "Start a conversation"; unlabeled textarea; no read state | recognition over recall, Miller's law |
| 14 | `/my-applications` | Poor | `<h1>` is a slogan; "Check documents" → `/documents` → redirect (dead end); can't open detail | clear closure, error recovery |
| 15 | `/my-shortlist` | Poor | shares `localhost:3001` links; DB write on GET; compare modal has no dialog semantics | user control, data integrity |
| 16 | `/partner-commissions` | Poor | table clipped at 390 (tuition cut mid-value); 3 KPI tiles; dead `mayViewRates` branch; unweighted average | responsive, truthfulness of data |
| 17 | `/payments` | Poor | no totals/status/method/receipts; page is a wall of identical rows (`take: 100`) | visibility of status, aesthetic-minimalist |
| 18 | `/profile` | Poor | 8 unlabeled inputs, `alert()` errors, no grouping, 3 currency sources | recognition over recall, accessible forms |
| 19 | `/programs` | Poor | 170 cards, unpaginated (~33 screens); names link to analytics for every role; delete hits scholarships API | Hick's law, flexible/efficient use |
| 20 | `/programs/[id]/analytics` | Needs work | **authz fixed (§14 #2)**: only SUPER_ADMIN/MANAGER; student/agency/counselor are redirected and no data leaks (verified §15). Metric label fixed | authorization, privacy |
| 21 | `/reports` | Needs work | no date range/filters; page scope (`{}`) disagrees with the transactions API; CSV only | flexibility, consistency |
| 22 | `/scholarships` | Poor | duplicates `/programs` with different actions; 6 controls per row; truncated names | consistency & standards |
| 23 | `/scholarships/[id]` | Poor | **no Apply CTA**; two currency renderers; share link points at localhost | clear affordance, consistency |
| 24 | `/search` | Poor | 4 unlabeled controls; 58×19 px "View" links; table clipped at 390; silent 50-result cap | accessible names, Fitts's law |
| 25 | `/settings` | Poor | language switcher with one option; currency written to localStorage only; 5 unlabeled inputs | honesty/status, consistency |
| 26 | `/short-courses` | Needs work | **paywall fixed (§14 #3)**: list no longer embeds `meetingLink` for non-enrolled users; "Interested"↔"Enrolled" affordance still conflates browse/enroll | authorization, match to real world |
| 27 | `/short-courses/[id]` | Needs work | **crash + paywall fixed (§14 #3/#4)**: paid detail renders, receipt upload works, link gated until approved (verified §15); enrollment flow still confusing |
| 28 | `/transaction` | Poor | 9-column ledger on mobile (514 px table at 390, confirmed §15.1); `take: 100`; `confirm()` delete; raw "v1" copy | responsive, user control |
| 29 | `/users` | Poor | Actions column clipped at 1440; "Make Super Admin" on **every** row; no search/filter/pagination; AGENCY can open by URL (table 455 px wide at 390, §15.1) | error prevention, flexibility |
| 30 | `/users/[id]` | Poor | "More Details" is now gated (§14 #2), but "Student" layout still renders any role and documented controls are missing | least privilege, conceptual model |
| 31 | `/users/[id]/analytics` | Needs work | **authz + money fixed (§14 #2/#10)**: SUPER_ADMIN/MANAGER only, refunds excluded, per-currency totals; page-level redirect surfaces as a 200 payload redirect (§15 nuance) | authorization, data integrity |
| 32 | `/visitor-form` | Poor | 6 unlabeled fields; promises follow-up but only Delete exists; MANAGER sees a dead branch | match to real world, accessible forms |

**Totals (post-fix):** 0 Blocked · 22 Poor · 9 Needs work · 1 Good. `/apply` is unblocked by §14 #13 and
verified at runtime in §15.2. The seven pages that flipped from Blocked to Needs work are fixed in §14
(#2, #3, #4, #5, #10, #13) and verified at runtime in §15/§15.2, but have not been re-reviewed visually after the fix.
No page scores "Good" inside the authenticated app.

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
8. Add Apply CTA to `/scholarships/[id]`; unify program detail URLs.
9. Password reset + approval-state messaging + session revocation UX.
10. Implement or remove `/sub-agencies` (schema + page + roles + tests); add or remove `/my-documents`.
11. Reconcile nav/guards (`/users` AGENCY, `/transaction` COUNSELOR, `/visitor-form` MANAGER). *(`/programs` proxy matcher entry: DONE, §14 #7.)*
12. Fix reports transaction scope; add date range.

### S2 — UX / accessibility / responsive
13. Label every dashboard form (`htmlFor`/`id`, `autoComplete`, `aria-invalid`, `role="alert"`); replace `alert`/`confirm` with toast + AlertDialog.
14. Mobile reflow: `/home` (253 px), `/search` (395 px), `/partner-commissions` (146 px), `/transaction` (514 px table), `/users` (455 px table), `/scholarships` (+ detail header), `/my-applications` (80 px), `/payments`, `/my-shortlist` — all confirmed in §15.1. `/scholarships` also overflows at 1440.
15. Pagination + result counts + sorting on users/programs/scholarships/application/transaction; mobile cards.
16. Enrollment affordance split; compare modal semantics; carousel pause (**DONE, §14 #12**); contrast tokens.
17. Real i18n or remove the language switcher; persist currency to `User.preferredCurrency`.

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
times out, for both the pooled and direct hostnames. There was no local Postgres, so a disposable Docker
Postgres was used to finish the runtime work (§15). Neon itself is still unreachable, which means the
`qa-*` fixtures there are still not deleted; everything else below is now either verified locally or still
genuinely open.

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
- `.audit-visual2.ts` — the capture/metrics harness behind `.audit-shots/v2/`.

Removed after inspection: `.audit-playwright.ts`, `.audit-runtime*.ts`, `.audit-visual.ts`, `.audit-debug.ts`, the 31 full-page dev PNGs, and the empty/stale metrics files.

- No source files were modified during the audit itself; the follow-up fix pass is recorded in §14.
- Production server `next start -p 3210` was started for verification and stopped afterwards.
- Local test DB: Docker container `sa-portal-pg` (postgres:17-alpine, host port 5433, database `studyabroad`,
  schema via `prisma db push` + `prisma db seed`). It is **not** referenced by `.env`; it only ever existed as a
  per-process `DATABASE_URL` override. Remove with `docker rm -f sa-portal-pg`.
- **Pending Neon DB cleanup:** the interrupted run left five temporary accounts
  (`qa-admin-…@studyabroad.test`, `qa-manager-…`, `qa-counselor-…`, `qa-agency-…`, `qa-student-…`, all
  `active`) plus their QA courses/transactions. They are visible in `/users`. `.audit-check.ts` deletes
  exactly these rows; re-run it as soon as Neon is reachable.
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
