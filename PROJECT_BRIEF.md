# Project Brief: Study Abroad Agency Dashboard
### Master build spec — hand this file to a coding agent to begin implementation

---

## 0. Project Summary

A dashboard system for a study-abroad/visa agency. **Single Next.js application**, single login,
single deployment — but the UI, routes, and API access are strictly divided by **role**, so a
Student only ever sees student-relevant sections and a Partner (agency staff) only ever sees
partner-relevant sections. One hidden `super_admin` role sits above everyone, invisible to all
other roles, controlling the master catalog data (universities/programs/scholarships, short
courses) and commission rates.

**Stack decision: Next.js (App Router), TypeScript, PostgreSQL via Prisma, Auth.js (NextAuth)
for authentication.** This document assumes that stack throughout — if the build agent wants to
substitute equivalents (e.g. Drizzle instead of Prisma), the data model and route structure below
should translate directly.

---

## 1. Roles

| Role | Visibility | Created by | Notes |
|---|---|---|---|
| `super_admin` | Hidden — no other role can see this role exists, in UI or in any dropdown/list | Seeded directly in the database, never via UI | Only role that can write to `programs`, `universities`, `short_courses`, and commission rate fields |
| `manager` | Visible, highest role a Partner ever sees | `super_admin` | Manages everything within their agency scope; can work student cases directly or delegate |
| `counselor` | Partner staff | `manager` | Day-to-day casework; scoped to assigned students only |
| `agency` | Partner (B2B) | `manager` | Full CRUD on their own students; can recruit sub-agencies |
| `sub_agency` | Partner (B2B), same table as `agency` via self-reference | `agency` (or `manager`) | Sees only their own commission cut, never the parent's |
| `student` | Self-registers | Self (quick signup) | Sees only their own data, only student-relevant sections |

**Agency and Sub-Agency are the same underlying entity/table**, linked via `parentAgencyId`
(nullable self-reference). "Sub Agencies" as a UI section is simply `agencies WHERE parentAgencyId
IS NOT NULL`, filtered to the current agency's own children.

---

## 2. Entry Flow

```
/  (root)
 └─ role selector: "Student" or "Partner"
     ├─ Student → /login (or /signup if not registered)
     │              signup fields: firstName, lastName, phone, email, password
     │              → lands on their own dashboard, profile-completion prompted
     │              → self-registration IS allowed for students
     │
     └─ Partner → /login
                    NO self-signup — all partner accounts created top-down
                    (manager creates counselor/agency; agency creates sub_agency;
                    super_admin creates manager)
```

After login, **one app, role-based rendering** — see §5 for how this is enforced at three layers
(UI, route guard, API).

---

## 3. Full Feature List by Module

### Users (Partner-side, role-gated)
- CRUD for Manager, Counselor, Agency, Sub-Agency, Student (each role can only manage roles
  below it in the hierarchy — a Manager can create Counselor/Agency but not another Manager or
  Super Admin)
- Fields on creation: userTitle, gender, phone, country, status (active/inactive), verified (bool)
- Guest Invite Links: generate a scoped, expiring, revocable link granting section-level
  view-or-edit access without a full account — see §3a

### 3a. Guest Invite Link
- Configurable: which sections visible, view-only vs edit per section, expiry date, revocable
  instantly
- Implementation: not a real user account — a signed token (JWT or DB row) carrying a
  `permissionSet` JSON + `expiresAt`, validated on each request against that scope
- Log actions taken while using the link (audit trail)

### Scholarships (University/Program catalog)
- Write access: `super_admin` only
- Read access: all roles (Partner sees management view with edit affordances hidden per role;
  Student sees browse/shortlist-only view)
- Fields: university name, program name, level, field, tuition, intake dates, required documents
  checklist, min GPA/test score requirements, **visaRequired toggle** (drives whether the Visa
  stage appears in that program's Application pipeline), commission rate (super_admin-only field)

### Short Courses (new module)
- Write access: `super_admin` only
- Read access: all roles
- Fields: title, provider, category (language/test-prep/foundation/professional/other), duration,
  startDates[], fee, deliveryMode, prerequisites, description, status, linkedProgramId (nullable)
- `ShortCourseEnrollment`: studentId, shortCourseId, status (interested/enrolled/completed/
  withdrawn) — lightweight, no document-verification gate by default (confirm with product owner
  if this should change)

### Search (Partner-side)
- Catalog search across universities/programs — this is NOT a global student/application search

### Application
- One student → many applications (student applies to multiple programs in parallel)
- Pipeline stages (default set, confirm/rename with product owner):
  `draft → submitted → under_review → offer → deposit_paid → visa (if visaRequired) →
  enrolled | rejected | withdrawn`
- Document verification gate: staff must mark each required document `verified` before an
  application can progress past the stage that requires it
- Visa sub-stage only rendered/required when the program's `visaRequired` toggle is on

### Sub Agencies
- Filtered view of `agencies` table (see §1)
- Commission visibility per sub-agency relationship controlled by a permission flag
  (`canViewCommission`), settable by whoever owns the relationship (manager or delegated agency)

### Partner Commissions
- `super_admin` sets base commission % per program
- Agency's cut and whatever they pass down to a sub-agency tracked as separate ledger entries,
  not just percentages, so history is preserved even if rates change later

### Transaction
- Manually-entered financial ledger (not auto-pulled from a payment gateway in v1)
- Fields: type (service_fee/commission_payout/deposit/refund), amount, currency, relatedStudentId,
  relatedApplicationId (nullable), enteredBy, date
- Structure the schema so a real payment gateway can write to the same table later without a
  migration

### Student Portal sections (role = student, entirely separate rendered UI)
- My Applications, Scholarships (browse), Short Courses (browse/enroll), My Documents (upload +
  verification status), Messages, Payments (view/pay), Profile (edit + completeness indicator)
- Explicitly never rendered for this role: Users, Search, Application pipeline management, Sub
  Agencies, Partner Commissions, Transaction, Home (ops dashboard), Settings

### Home Dashboard (Partner-side)
- Activity feed/announcements, language switcher, dark/light mode, notifications bell, account menu
- KPI widgets: leads this week, applications in progress, pending document verifications, upcoming
  visa appointments
- Notification triggers (default set, confirm with product owner): new application, status change,
  document uploaded, document verification needed, message received, commission earned/paid, visa
  stage changed, invite link used

### Cross-cutting: Documents
- Polymorphic document storage — attached to either a Student (passport, general docs) or a
  specific Application (SOP tailored to one university)
- Status: pending / verified / rejected (+ rejection reason)
- Verified by a staff member with permission over that student's case

### Cross-cutting: Audit Log
- Every create/update/delete logged with actorId, action, entityType, entityId, before/after diff,
  timestamp — critical given how much of this system depends on permission flags and commission
  visibility toggles

---

## 4. Data Model (Prisma schema sketch)

```prisma
enum Role {
  SUPER_ADMIN
  MANAGER
  COUNSELOR
  AGENCY
  SUB_AGENCY // enforced via parentAgencyId being non-null on an AGENCY-role user, OR
             // modeled as its own role value pointing back to an Agency — pick one,
             // recommendation: keep AGENCY as the role, use parentAgencyId to distinguish
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
  status          String   @default("active") // active/inactive
  verified        Boolean  @default(false)
  createdById     String?  // who created this account (top-down creation for partners)
  createdBy       User?    @relation("CreatedUsers", fields: [createdById], references: [id])
  createdUsers    User[]   @relation("CreatedUsers")

  // Agency hierarchy (self-referencing)
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

  applications       Application[]
  documents           Document[]
  transactions         Transaction[]
  shortCourseEnrollments ShortCourseEnrollment[]

  agencyPermissionsGiven    AgencyPermission[] @relation("PermissionGrantor")
  agencyPermissionsReceived AgencyPermission[] @relation("PermissionReceiver")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Per-relationship visibility flags (e.g. can a sub-agency see its own commission)
model AgencyPermission {
  id            String  @id @default(cuid())
  grantorId     String
  grantor       User    @relation("PermissionGrantor", fields: [grantorId], references: [id])
  receiverId    String
  receiver      User    @relation("PermissionReceiver", fields: [receiverId], references: [id])
  canViewCommission Boolean @default(false)
  canViewFullChain  Boolean @default(false)
}

model University {
  id       String    @id @default(cuid())
  name     String
  country  String
  programs Program[]
}

model Program {
  id                String   @id @default(cuid())
  universityId      String
  university        University @relation(fields: [universityId], references: [id])
  name              String
  level             String   // undergrad/postgrad/etc
  field             String
  tuition           Decimal
  intakeDates       DateTime[]
  requiredDocuments String[] // checklist template
  minGpa            Float?
  visaRequired      Boolean  @default(false)
  commissionRate    Decimal  // super_admin write-only in application logic
  applications      Application[]
  createdAt         DateTime @default(now())
}

model Application {
  id            String            @id @default(cuid())
  studentId     String
  student       User              @relation(fields: [studentId], references: [id])
  programId     String
  program       Program           @relation(fields: [programId], references: [id])
  stage         ApplicationStage  @default(DRAFT)
  visaStage     String?           // sub-status within VISA stage, only relevant if program.visaRequired
  submittedAt   DateTime?
  decisionAt    DateTime?
  documents     Document[]
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

model Document {
  id              String          @id @default(cuid())
  ownerId         String          // polymorphic-ish: could be studentId directly
  owner           User            @relation(fields: [ownerId], references: [id])
  applicationId   String?         // nullable — some docs are student-level, not application-level
  application     Application?    @relation(fields: [applicationId], references: [id])
  type            String          // passport/diploma/transcript/sop/other
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
  id                  String   @id @default(cuid())
  type                String   // service_fee/commission_payout/deposit/refund
  amount              Decimal
  currency            String
  relatedStudentId    String?
  relatedStudent      User?    @relation(fields: [relatedStudentId], references: [id])
  relatedApplicationId String?
  enteredById         String
  date                DateTime @default(now())
}

model InviteLink {
  id            String   @id @default(cuid())
  token         String   @unique
  createdById   String
  permissionSet Json     // { sections: [...], access: { sectionId: 'view'|'edit' } }
  expiresAt     DateTime
  revoked       Boolean  @default(false)
  createdAt     DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String
  action     String   // create/update/delete
  entityType String
  entityId   String
  before     Json?
  after      Json?
  timestamp  DateTime @default(now())
}
```

*(This is a working sketch, not a final migration — the build agent should refine field types,
add indexes on frequently-queried FKs like `studentId`/`applicationId`/`role`, and reconsider the
`SUB_AGENCY` enum-vs-parentAgencyId question in §4's comment before finalizing.)*

---

## 5. Next.js Project Structure & Enforcement Layers

### App Router structure
```
app/
├── (public)/
│   └── page.tsx                 # role selector: Student vs Partner
├── (auth)/
│   ├── student/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── partner/
│       └── login/page.tsx       # no signup route — partners never self-register
├── (student)/                   # route group, only reachable by role=student
│   ├── layout.tsx               # renders ONLY student nav — built from role, not hidden via CSS
│   ├── applications/page.tsx
│   ├── scholarships/page.tsx
│   ├── short-courses/page.tsx
│   ├── documents/page.tsx
│   ├── messages/page.tsx
│   ├── payments/page.tsx
│   └── profile/page.tsx
├── (partner)/                   # route group, only reachable by partner roles
│   ├── layout.tsx               # renders nav filtered by exact role
│   ├── home/page.tsx
│   ├── users/page.tsx
│   ├── scholarships/page.tsx    # write controls conditionally rendered for super_admin only
│   ├── short-courses/page.tsx   # same
│   ├── search/page.tsx
│   ├── application/page.tsx
│   ├── sub-agencies/page.tsx
│   ├── partner-commissions/page.tsx
│   └── transaction/page.tsx
├── api/
│   └── ... route handlers, EVERY one independently checks session role + ownership
└── middleware.ts                 # route guard layer, see below
```

### middleware.ts (route guard layer)
Runs before any `(student)` or `(partner)` route resolves. Reads the session, and:
- If role is `student` and path is under `(partner)` → redirect to `/student/dashboard`
- If role is a partner role and path is under `(student)` → redirect to `/partner/home`
- If unauthenticated → redirect to the appropriate login

This is the layer that stops a student from reaching `/partner-commissions` by typing the URL
directly, even though the link never appears in their nav.

### API layer (the enforcement that actually matters)
Every route handler under `app/api/**` must, independent of the middleware and independent of
what the frontend renders:
1. Verify the session exists and get the caller's role
2. For any resource-specific request (e.g. `GET /api/students/[id]`), verify the caller either
   *is* that student, or *has permission* over that student (assigned counselor/agency, or is a
   manager/super_admin) — never trust a role check alone without an ownership check on
   student-specific and agency-specific data
3. For `super_admin`-only writes (programs, short courses, commission rates), reject anything
   that isn't `role === 'super_admin'`, checked server-side on every request, not cached from a
   prior check

This is the non-negotiable layer — the UI/route-guard layers are about good UX and defense in
depth, but a determined user with dev tools open can always attempt a direct API call, and the
API is what must refuse it regardless of what the frontend intended to show them.

### Auth
- Auth.js (NextAuth) with a Credentials provider (email+password against `User.passwordHash`,
  bcrypt/argon2 hashed)
- Session includes `role` and `id`, read in middleware and in every API route handler
- Consider a separate `InviteLinkSession` mechanism for the guest-invite-link feature (§3a) rather
  than forcing it through the same auth flow — it's a scoped, expiring, non-account access pattern

---

## 6. Suggested Build Order

1. Prisma schema + migrations (§4), seed script with one `super_admin` row
2. Auth.js setup: student signup/login, partner login (no signup)
3. `middleware.ts` route guarding (§5)
4. Users module (role-scoped CRUD, top-down creation)
5. Guest invite link system (reuses the permission-checking logic from step 4)
6. Scholarships + Short Courses catalog (super_admin write, everyone read)
7. Student profile completion flow + document upload/verification
8. Application pipeline (with visa-toggle behavior)
9. Sub Agencies view + Partner Commissions + AgencyPermission flags
10. Transaction ledger
11. Home dashboard + notifications + audit log (aggregates everything built above)

---

## 7. Open Decisions the Build Agent Should Confirm With the Product Owner Before Finalizing

1. Exact wording/purpose of the "Visitor form" sidebar item (not yet defined)
2. Final Application pipeline stage names (a reasonable default is proposed in §4, confirm before
   locking into migrations)
3. Full notification trigger list (a default set is proposed in §3, confirm)
4. Whether Agency accounts need extra fields (company name, license number) beyond the base User
   fields
5. Whether Manager's commission visibility is a simple on/off flag or needs tiered levels
6. Whether Short Course enrollment should have a document-verification gate like Applications, or
   stay lightweight (current assumption: lightweight)
7. Whether student email verification is required in v1 or can be deferred
