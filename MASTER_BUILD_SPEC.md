# Study Abroad & Visa Agency Management System
## Master Build Specification — Final Consolidated Version
### Hand this single file to a coding agent to begin implementation. It supersedes all earlier drafts.

**Tech stack: Next.js (App Router) + TypeScript + PostgreSQL via Prisma + Auth.js (NextAuth) +
server-side PDF generation.**

---

## 0. Project Summary

A single Next.js application for a study-abroad/visa agency. One login, one deployment — the UI,
routes, and API access are strictly divided by **role**, so a Student only ever sees
student-relevant sections and a Partner (staff/agency) only ever sees partner-relevant sections.
One hidden `super_admin` role sits above everyone, invisible to all other roles, controlling the
master catalog (universities/programs, short courses) and commission rates.

---

## 1. Roles

| Role | Visibility | Created by | Notes |
|---|---|---|---|
| `super_admin` | Fully hidden — no other role can see this role exists in any UI or dropdown | Seeded in the database directly, never via UI | Only role that can write to `programs`, `universities`, `short_courses`, commission rate fields |
| `manager` | Highest role a Partner ever sees | `super_admin` | Runs operations; can work student cases directly or delegate |
| `counselor` | Partner staff | `manager` | Day-to-day casework, scoped to assigned students only |
| `agency` | Partner (B2B) | `manager` | Full CRUD on their own students; can recruit sub-agencies |
| `sub_agency` | Same table as `agency`, via self-reference (`parentAgencyId`) | `agency` or `manager` | Sees only their own commission cut, never the parent's — controlled by a per-relationship permission flag |
| `student` | Self-registers | Self (quick signup) | Sees only their own data |

---

## 2. Entry Flow

```
/ (root) → "Are you a Student or a Partner?"
   ├─ Student → login OR signup (firstName, lastName, phone, email, password)
   │            → lands on own dashboard, guided to complete full profile
   │            → self-registration allowed
   │
   └─ Partner → login only, no self-signup
                (accounts always created top-down: super_admin → manager →
                 counselor/agency → sub_agency)
```

**Architecture decision (confirmed): ONE app, ONE codebase, role-based rendering** — not two
separate frontend deployments. A Student and a Partner log into the same application; what
renders is determined entirely by their role. See §7 for how this is enforced securely despite
being a single bundle.

---

## 3. Sidebar / Navigation — Final Structure

### Partner-side sections (role-gated, exact set varies by role)
Home · Users · Scholarships · Short Courses · Search · Application · Sub Agencies · Partner
Commissions · Transaction · Documents · Reports · Settings · WhatsApp quick-launch · Visitor form

### Student-side sections (entirely different, never overlapping)
My Applications · Scholarships (browse) · Short Courses (browse/enroll) · **My Shortlist** (new —
see §5) · My Documents · Messages · Payments · Profile

A student's build of the UI never contains Users, Search, Sub Agencies, Partner Commissions,
Transaction, or catalog-editing controls — these are not hidden, they are not rendered for that
role at all (see §7).

---

## 4. Feature List by Module

### Users
- Role-scoped CRUD — each role can only create/manage roles below it in the hierarchy
- Fields: userTitle, gender, phone, country, status (active/inactive), verified (bool)
- **Guest Invite Links**: generate a scoped, expiring, revocable link granting section-level
  view-or-edit access without a full account. Configurable: which sections visible, view vs edit
  per section, expiry date, instant revoke. Actions taken via the link are logged.

### Scholarships (University/Program Catalog)
- Write access: `super_admin` only. Read: everyone (Partner sees management view, Student sees
  browse/shortlist-only view)
- Fields: university, program name, level, field, tuition fee, application fee, course duration,
  open intake dates, required documents checklist, min GPA/test score, **visaRequired toggle**,
  commission rate (super_admin-only), **plus fields needed for the PDF feature** — see §5

### Short Courses
- Write access: `super_admin` only. Read: everyone
- Fields: title, provider, category, duration, startDates, fee, deliveryMode, prerequisites,
  description, status, linkedProgramId (nullable)
- `ShortCourseEnrollment`: lightweight, no document-verification gate by default

### Search
- Catalog search across universities/programs (Partner-side power tool; on the student side this
  is folded into the Scholarships browse screen instead)

### Application
- One student → many applications, tracked in parallel
- Pipeline: `draft → submitted → under_review → offer → deposit_paid → visa (if visaRequired) →
  enrolled | rejected | withdrawn`
- Documents must be marked `verified` by staff before an application can progress

### Sub Agencies
- Filtered view of the `agencies` self-referencing table
- Commission visibility per relationship controlled by `canViewCommission` flag, settable by
  whoever owns the relationship

### Partner Commissions
- `super_admin` sets base commission % per program
- Agency's cut and any portion passed to a sub-agency tracked as ledger entries (not just live
  percentages), so history survives rate changes

### Transaction
- Manually-entered financial ledger (not auto-pulled from a gateway in v1)
- Structured so a real payment gateway can write to the same table later without a migration

### Documents
- Polymorphic — attached to a Student (passport, general docs) or a specific Application (SOP
  tailored to one university)
- Status: pending / verified / rejected (+ rejection reason)

### Audit Log
- Every create/update/delete logged with actor, action, entity, before/after diff, timestamp

---

## 5. NEW: Shortlist & Course PDF Export System

Based directly on a reference sample (Air Ease Educational Consultants' shortlist PDF) — this is
a real, proven format worth replicating closely. Two connected pieces:

### 5a. Student Shortlist
- A counselor/agency curates a list of recommended programs for a specific student
  (`Shortlist` → many `ShortlistItem` → each pointing to a `Program`)
- Visible to the student under **"My Shortlist"** — a numbered list, each entry showing:
  university logo/icon, university name (linked), course/program name, location, one or more
  **badge tags** (e.g. "High Placement Rate", "Scholarship Available", "MOI Accepted", "Popular
  with Partners"), and a **"View Details"** action
- Student (and staff) can browse this exactly like the uploaded reference: a clean numbered table,
  one row per course

### 5b. Full Shortlist PDF (auto-generated)
- One-click **"Download Full Shortlist PDF"** button generates a branded, multi-page PDF
  containing every course in the student's shortlist, laid out exactly like the reference sample:
  agency header/logo top-right, "Handpicked Courses For You" title, intro line, numbered table with
  university icon, name, program, location, and badge tags per row
- Generated **on demand from live data** — pulls directly from the student's current
  `ShortlistItem` records and the linked `Program`/`University` records, so it's always accurate,
  never a stale manually-maintained document
- **[UPGRADE]** Auto-email or auto-WhatsApp the PDF to the student whenever their counselor updates
  the shortlist, so they're notified without needing to log in and check

### 5c. Individual Course Detail PDF
- Every course — both in the shortlist view and in the general Scholarships catalog — has its own
  **"View Details"** page and a matching **"Download Details PDF"** button
- Layout matches the reference sample precisely:
  - Header: university icon, university name, program name, location, "Go to university page" link
  - **"Why [University]?"** section: a row of highlight cards, each with an icon, a short bold
    title (e.g. "High Placement Rate", "Scholarship Available", "MOI Accepted", "Popular with
    Partners"), and a one-line description
  - **Course Details** grid: Application Fee, Tuition Fee, Offer Turnaround Time, Course Duration,
    Open Intakes, College Rank (QS Ranking) — shown only where the data exists (the reference
    sample correctly omits fields with no data rather than showing blanks)
  - **Eligibility Criteria** section: a plain-language intro line ("[University] requires") followed
    by a bullet list (e.g. "Minimum IELTS score of 6")
- This single-course PDF is downloadable both from a student's own shortlist and from the general
  catalog browse view (any role that can see a course can get its detail PDF)

### 5d. Data implications
`Program` needs additional fields to drive this feature:
```
tags              String[]   // "High Placement Rate", "Scholarship Available", etc.
whyHighlights     Json       // [{ icon, title, description }] — powers the "Why X?" cards
offerTurnaroundDays Int?
collegeRank       String?    // e.g. "251 by QS Rankings"
eligibilityCriteria String[] // e.g. ["Minimum IELTS score of 6"]
universityLogoUrl String?
```
And two new models:
```
Shortlist       — one per student (or reusable per counselor-student pairing)
ShortlistItem   — student's shortlist × Program, with order/position
```

### 5e. Technical approach for PDF generation
Recommend **server-side HTML-to-PDF rendering** (e.g. Puppeteer/Playwright driving headless
Chromium, or a hosted equivalent) rather than a pure PDF-drawing library — the reference layout
uses card-based visual design (icons, colored badge pills, highlight boxes) that's far easier to
achieve accurately with real HTML/CSS templates than with low-level PDF drawing commands. Build
two HTML templates (list view, single-course view), populate them from live data via an API route,
render to PDF, and stream the file back for download. Cache generated PDFs briefly (e.g. a few
minutes) keyed on the underlying data so repeated clicks don't force a full re-render, but always
regenerate if the shortlist/program data has changed since the last cached version.

---

## 6. Small UX / Satisfaction Features (worth building — genuinely improves day-to-day use)

- **Profile completeness indicator** on the student dashboard, nudging them to finish their profile
- **WhatsApp share** button next to every PDF download — one tap sends the shortlist or course
  detail PDF straight to WhatsApp rather than requiring a manual download-then-attach
- **Deadline countdown badges** on shortlist/catalog entries approaching an intake date
- **"Compare Courses"** — student can tick 2–3 shortlisted courses and see a side-by-side comparison
  table (tuition, duration, intake, eligibility) before deciding
- **Currency toggle** on fee displays (show in home currency alongside MYR/local currency)
- **Last-viewed tracking** — counselor can see whether a student has actually opened their shortlist
  or a specific course's details, useful for follow-up timing
- **Auto-reminders** before document-expiry dates (passport, test scores) and before intake
  application deadlines
- **Similar course suggestions** — if a student views one course, suggest 2–3 similar ones from the
  catalog (same field/level/country)
- **One-click re-share**: regenerate and re-send the shortlist PDF after any update, without the
  counselor needing to manually rebuild anything

---

## 7. Enforcement: Single App, Role-Based Rendering — How to Keep It Secure

Since Student and Partner share one codebase, three layers must all be correct:

**a) Frontend — build the nav from role, don't hide it.** The sidebar is constructed from a
`SECTIONS_BY_ROLE` mapping at render time; Partner-only components are never included in a
Student's rendered tree, not just CSS-hidden.

**b) Routing — guard every navigation, not just the nav link.** `middleware.ts` checks the
session's role on every request; a student manually typing a Partner URL is redirected, never
shown the page or its data.

**c) API — the layer that actually matters.** Every route handler under `app/api/**`
independently re-checks the caller's role and ownership before responding, regardless of what the
frontend intended to show. A `GET /api/students/[id]` call must verify the caller either *is* that
student or has explicit permission over them, every single request — this is what stops a
determined user with dev tools open from pulling data the UI never intended to expose them to.

---

## 8. Data Model (Prisma schema)

```prisma
enum Role {
  SUPER_ADMIN
  MANAGER
  COUNSELOR
  AGENCY   // sub_agency distinguished via parentAgencyId, not a separate enum value
  STUDENT
}

enum ApplicationStage {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  OFFER
  DEPOSIT_PAID
  VISA
  ENROLLED
  REJECTED
  WITHDRAWN
}

enum DocumentStatus {
  PENDING
  VERIFIED
  REJECTED
}

model User {
  id              String   @id @default(cuid())
  role            Role
  email           String   @unique
  passwordHash    String
  firstName       String
  lastName        String
  phone           String?
  country         String?
  gender          String?
  status          String   @default("active")
  verified        Boolean  @default(false)

  createdById     String?
  createdBy       User?    @relation("CreatedUsers", fields: [createdById], references: [id])
  createdUsers    User[]   @relation("CreatedUsers")

  parentAgencyId  String?
  parentAgency    User?    @relation("AgencyHierarchy", fields: [parentAgencyId], references: [id])
  subAgencies     User[]   @relation("AgencyHierarchy")

  // Student-specific fields
  passportNumber      String?
  birthday             DateTime?
  countryOfResidence   String?
  nationality          String?
  cityOfResidence      String?
  address              String?
  motherName           String?
  fatherName           String?

  assignedCounselorId String?
  assignedCounselor   User?   @relation("AssignedStudents", fields: [assignedCounselorId], references: [id])
  assignedStudents    User[]  @relation("AssignedStudents")

  applications           Application[]
  documents               Document[]
  transactions             Transaction[]
  shortCourseEnrollments ShortCourseEnrollment[]
  shortlists               Shortlist[]

  agencyPermissionsGiven    AgencyPermission[] @relation("PermissionGrantor")
  agencyPermissionsReceived AgencyPermission[] @relation("PermissionReceiver")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AgencyPermission {
  id                String  @id @default(cuid())
  grantorId         String
  grantor           User    @relation("PermissionGrantor", fields: [grantorId], references: [id])
  receiverId        String
  receiver          User    @relation("PermissionReceiver", fields: [receiverId], references: [id])
  canViewCommission Boolean @default(false)
  canViewFullChain  Boolean @default(false)
}

model University {
  id       String    @id @default(cuid())
  name     String
  country  String
  logoUrl  String?
  programs Program[]
}

model Program {
  id                  String     @id @default(cuid())
  universityId        String
  university          University @relation(fields: [universityId], references: [id])
  name                String
  level               String
  field               String
  location            String?
  tuitionFee          Decimal
  applicationFee      Decimal?
  intakeDates         DateTime[]
  requiredDocuments   String[]
  minGpa              Float?
  visaRequired        Boolean    @default(false)
  commissionRate      Decimal

  // PDF / shortlist display fields
  tags                 String[]  // "High Placement Rate", "Scholarship Available", etc.
  whyHighlights         Json      // [{ icon, title, description }]
  offerTurnaroundDays   Int?
  collegeRank           String?
  eligibilityCriteria   String[]
  courseDurationMonths  Int?

  applications        Application[]
  shortlistItems       ShortlistItem[]
  createdAt            DateTime   @default(now())
}

model Shortlist {
  id         String          @id @default(cuid())
  studentId  String
  student    User            @relation(fields: [studentId], references: [id])
  items      ShortlistItem[]
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
}

model ShortlistItem {
  id          String    @id @default(cuid())
  shortlistId String
  shortlist   Shortlist @relation(fields: [shortlistId], references: [id])
  programId   String
  program     Program   @relation(fields: [programId], references: [id])
  position    Int       @default(0)
  addedAt     DateTime  @default(now())
}

model Application {
  id            String            @id @default(cuid())
  studentId     String
  student       User              @relation(fields: [studentId], references: [id])
  programId     String
  program       Program           @relation(fields: [programId], references: [id])
  stage         ApplicationStage  @default(DRAFT)
  visaStage     String?
  submittedAt   DateTime?
  decisionAt    DateTime?
  documents     Document[]
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

model Document {
  id              String          @id @default(cuid())
  ownerId         String
  owner           User            @relation(fields: [ownerId], references: [id])
  applicationId   String?
  application     Application?    @relation(fields: [applicationId], references: [id])
  type            String
  fileUrl         String
  status          DocumentStatus  @default(PENDING)
  rejectionReason String?
  verifiedById    String?
  uploadedAt      DateTime        @default(now())
}

model ShortCourse {
  id               String   @id @default(cuid())
  title            String
  provider         String
  category         String
  duration         String
  startDates       DateTime[]
  fee              Decimal
  deliveryMode     String
  prerequisites    String?
  description      String?
  status           String   @default("active")
  linkedProgramId  String?
  enrollments      ShortCourseEnrollment[]
  createdAt        DateTime @default(now())
}

model ShortCourseEnrollment {
  id            String      @id @default(cuid())
  studentId     String
  student       User        @relation(fields: [studentId], references: [id])
  shortCourseId String
  shortCourse   ShortCourse @relation(fields: [shortCourseId], references: [id])
  status        String      @default("interested")
  enrolledAt    DateTime    @default(now())
}

model Transaction {
  id                    String   @id @default(cuid())
  type                  String
  amount                Decimal
  currency              String
  relatedStudentId      String?
  relatedStudent        User?    @relation(fields: [relatedStudentId], references: [id])
  relatedApplicationId  String?
  enteredById            String
  date                  DateTime @default(now())
}

model InviteLink {
  id            String   @id @default(cuid())
  token         String   @unique
  createdById   String
  permissionSet Json
  expiresAt     DateTime
  revoked       Boolean  @default(false)
  createdAt     DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String
  action     String
  entityType String
  entityId   String
  before     Json?
  after      Json?
  timestamp  DateTime @default(now())
}
```

---

## 9. Next.js Project Structure

```
app/
├── (public)/page.tsx              # Student vs Partner selector
├── (auth)/
│   ├── student/{login,signup}/page.tsx
│   └── partner/login/page.tsx     # no signup route
├── (dashboard)/                    # single route group, role-based rendering inside
│   ├── layout.tsx                  # builds nav from SECTIONS_BY_ROLE, see §7a
│   ├── home/page.tsx                # partner roles only
│   ├── users/page.tsx               # partner roles only
│   ├── scholarships/page.tsx        # shared, write UI conditional on role
│   ├── short-courses/page.tsx       # shared, write UI conditional on role
│   ├── search/page.tsx              # partner roles only
│   ├── application/page.tsx         # shared, scoped by role
│   ├── sub-agencies/page.tsx        # partner roles only
│   ├── partner-commissions/page.tsx # partner roles only
│   ├── transaction/page.tsx         # partner roles only
│   ├── my-shortlist/page.tsx        # student only
│   ├── my-documents/page.tsx        # student only
│   ├── messages/page.tsx            # shared
│   ├── payments/page.tsx            # shared
│   └── profile/page.tsx             # shared
├── api/
│   ├── shortlist/[studentId]/pdf/route.ts     # generates full shortlist PDF
│   ├── programs/[programId]/pdf/route.ts      # generates single-course detail PDF
│   └── ... every other route handler, each independently role/ownership-checked
└── middleware.ts                    # route guard layer, per §7b
```

---

## 10. Suggested Build Order

1. Prisma schema + migrations, seed one `super_admin`
2. Auth.js: student signup/login, partner login (no signup)
3. `middleware.ts` route guarding
4. Users module (role-scoped CRUD, top-down creation)
5. Guest invite link system
6. Scholarships + Short Courses catalog (super_admin write, everyone read)
7. Student profile completion + document upload/verification
8. Shortlist feature + PDF generation (list + single-course templates)
9. Application pipeline (with visa-toggle behavior)
10. Sub Agencies + Partner Commissions + AgencyPermission flags
11. Transaction ledger
12. Small UX features from §6 (compare, reminders, WhatsApp share, etc.)
13. Home dashboard + notifications + audit log (aggregates everything above)

---

## 11. Open Decisions Still Worth Confirming Before Finalizing

1. Exact wording/purpose of the "Visitor form" sidebar item
2. Final Application pipeline stage names (default proposed in §4, confirm before locking migrations)
3. Full notification trigger list (default set proposed earlier, confirm)
4. Whether Agency accounts need extra fields (company name, license number)
5. Whether Manager's commission visibility is a simple on/off flag or needs tiered levels
6. Whether Short Course enrollment needs a document-verification gate (current assumption: no)
7. Whether student email verification is required in v1
8. Whether the Shortlist is built by staff only, or students can also self-add courses to their
   own shortlist from the browse catalog (current assumption: staff-curated, confirm)
