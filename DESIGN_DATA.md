# StudyAbroad Portal — Design Data

## Overview

A Next.js application for managing study abroad applications. Two user types: **Students** and **Partners** (Agency staff, Counselors, Managers, Super Admins).

---

## Roles & Hierarchy

| Role | Rank | Description |
|------|------|-------------|
| `SUPER_ADMIN` | 5 | Full access, manages everyone |
| `MANAGER` | 4 | Manages agencies, counselors, students |
| `AGENCY` | 3 | Manages own students and sub-agencies |
| `COUNSELOR` | 2 | Manages assigned students |
| `STUDENT` | 1 | End user — applies to programs |

---

## All Pages (Routes)

### Public Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Landing page — redirects to login or dashboard based on role |
| `/invite/[token]` | `src/app/invite/[token]/page.tsx` | Invite link landing page |

### Auth Pages

| Route | File | Description |
|-------|------|-------------|
| `/student/login` | `src/app/(auth)/student/login/page.tsx` | Student login form |
| `/student/signup` | `src/app/(auth)/student/signup/page.tsx` | Student signup form |
| `/partner/login` | `src/app/(auth)/partner/login/page.tsx` | Partner login form |
| `/partner/signup` | `src/app/(auth)/partner/signup/page.tsx` | Partner signup form |

### Dashboard Pages (require auth)

| Route | File | Roles | Description |
|-------|------|-------|-------------|
| `/home` | `src/app/(dashboard)/home/page.tsx` | Partner | Partner dashboard home |
| `/my-applications` | `src/app/(dashboard)/my-applications/page.tsx` | Student | Student's applications list |
| `/apply` | `src/app/(dashboard)/apply/page.tsx` | Student | New application wizard |
| `/application` | `src/app/(dashboard)/application/page.tsx` | Partner | All applications (pipeline view) |
| `/application/[id]` | `src/app/(dashboard)/application/[id]/page.tsx` | Partner | Single application detail |
| `/programs` | `src/app/(dashboard)/programs/page.tsx` | All | Browse programs by university |
| `/programs/[id]/analytics` | `src/app/(dashboard)/programs/[id]/analytics/page.tsx` | Partner | Program analytics |
| `/users` | `src/app/(dashboard)/users/page.tsx` | Super Admin, Manager | User management |
| `/users/[id]` | `src/app/(dashboard)/users/[id]/page.tsx` | Partner | User detail view |
| `/users/[id]/analytics` | `src/app/(dashboard)/users/[id]/analytics/page.tsx` | Partner | User analytics |
| `/scholarships` | `src/app/(dashboard)/scholarships/page.tsx` | All | Scholarships list |
| `/scholarships/[id]` | `src/app/(dashboard)/scholarships/[id]/page.tsx` | All | Scholarship detail |
| `/short-courses` | `src/app/(dashboard)/short-courses/page.tsx` | All | Short courses list |
| `/short-courses/[id]` | `src/app/(dashboard)/short-courses/[id]/page.tsx` | All | Short course detail |
| `/search` | `src/app/(dashboard)/search/page.tsx` | Partner | Global search |
| `/sub-agencies` | `src/app/(dashboard)/sub-agencies/page.tsx` | Super Admin, Manager, Agency | Sub-agency management |
| `/partner-commissions` | `src/app/(dashboard)/partner-commissions/page.tsx` | Super Admin, Manager, Agency | Commission tracking |
| `/transaction` | `src/app/(dashboard)/transaction/page.tsx` | Super Admin, Manager, Agency | Transaction records |
| `/documents` | `src/app/(dashboard)/documents/page.tsx` | Partner | Document management |
| `/reports` | `src/app/(dashboard)/reports/page.tsx` | Super Admin, Manager, Agency | Reports & analytics |
| `/visitor-form` | `src/app/(dashboard)/visitor-form/page.tsx` | Partner | Visitor lead form |
| `/my-shortlist` | `src/app/(dashboard)/my-shortlist/page.tsx` | Student | Student's shortlisted programs |
| `/messages` | `src/app/(dashboard)/messages/page.tsx` | All | Messaging system |
| `/payments` | `src/app/(dashboard)/payments/page.tsx` | All | Payment records |
| `/profile` | `src/app/(dashboard)/profile/page.tsx` | All | User profile editing |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | All | User settings |

---

## Page Details — Sections, Forms & Buttons

---

### `/` — Landing Page
**File:** `src/app/page.tsx`

**Sections:**
- Hero with "SA" logo badge
- "StudyAbroad Portal" heading
- "Are you a student or a partner?" subtitle
- Two cards side by side (Student / Partner)

**Buttons/Links:**
- "I am a Student" card → `/student/login`
- "I am a Partner" card → `/partner/login`

**Behavior:** Redirects logged-in users to their dashboard (Student → `/my-applications`, Partner → `/home`)

---

### `/student/login` — Student Login
**File:** `src/app/(auth)/student/login/page.tsx`

**Sections:**
- Auth shell with title "Student Login"
- Subtitle: "Sign in to track your applications, shortlist and documents."
- Footer: "New here? Create a free account" link

**Form:** `LoginForm`
- Email input (required, type=email)
- Password input (required, with show/hide toggle)
- "Sign in" button (full width)

**Footer:** Link to `/student/signup`

---

### `/student/signup` — Student Signup
**File:** `src/app/(auth)/student/signup/page.tsx`

**Sections:**
- Auth shell with title "Student Signup"
- Subtitle about creating an account
- Footer: "Already have an account? Sign in" link

**Form:** `SignupForm`
- First name (required)
- Last name (required)
- Phone (required, type=tel)
- Email (required, type=email)
- Password (required, min 8 chars, with show/hide toggle)
- "Create account" button (full width)

**Footer:** Link to `/student/login`

---

### `/partner/login` — Partner Login
**File:** `src/app/(auth)/partner/login/page.tsx`

**Sections:**
- Auth shell with title "Partner Login"
- Subtitle about partner workspace
- Footer: "New here? Create a free account" link

**Form:** `LoginForm` (same as student login)
- Email input (required)
- Password input (required, with show/hide toggle)
- "Sign in" button (full width)

**Footer:** Link to `/partner/signup`

---

### `/partner/signup` — Partner Signup
**File:** `src/app/(auth)/partner/signup/page.tsx`

**Sections:**
- Auth shell with title "Partner Signup"
- Subtitle about partner account
- Footer: "Already have an account? Sign in" link

**Form:** `PartnerSignupForm`
- Company-specific fields
- "Create account" button

**Footer:** Link to `/partner/login`

---

### `/home` — Partner Dashboard Home
**File:** `src/app/(dashboard)/home/page.tsx`

**Sections:**
1. **Hero banner** (gradient background)
   - Role label (e.g., "Super Admin workspace")
   - "Good to see you, {firstName}." greeting
   - Unread notifications count or "Everything is up to date"
   - "Applications" button → `/application`
   - "Find a student" button → `/search`

2. **Ad rail** (Super Admin or when ads exist, mobile only)

3. **Dashboard metrics** (4 cards)
   - "Applications in progress" → `/application`
   - "Pending documents" → `/documents`
   - "New leads" (last 7 days) → `/users` (if can manage)
   - "Visa-stage cases" → `/application`

4. **Application activity chart** (6-month trend line chart, SVG)
   - "View application pipeline" link → `/application`

5. **Pipeline health** (stage distribution bars: DRAFT, SUBMITTED, UNDER_REVIEW, OFFER, VISA, ENROLLED)
   - "Manage pipeline" link → `/application`

6. **Recent application activity** (list of 6 most recent with student name, program, stage badge, date)
   - "View all" link → `/application`

7. **Workspace tools** (quick action cards)
   - "Review applications" → `/application`
   - "Verify documents" → `/documents`
   - "Open messages" → `/messages`
   - "Manage students" → `/users` (Super Admin/Manager only)
   - "Open reports" → `/reports` (not Counselor)
   - "Short courses" → `/short-courses`

8. **Administration metrics** (Super Admin only, 4 cards)
   - "Total students" → `/users`
   - "Active programs" → `/programs`
   - "Course enrollments" → `/short-courses`
   - "Recorded revenue" → `/transaction`

9. **Ad rail sidebar** (desktop only, Super Admin can manage)

---

### `/my-applications` — Student Applications
**File:** `src/app/(dashboard)/my-applications/page.tsx`

**Sections:**
1. **Hero banner** (gradient background)
   - "Student workspace" label
   - "Your study journey, in one place." heading
   - "New application" button → `/apply`
   - "Explore programs" button → `/programs`

2. **Ad rail** (advertisements)

3. **"Keep your journey moving" card** (3 quick links)
   - "Check documents" → `/documents`
   - "Explore courses" → `/short-courses`
   - "Find a program" → `/programs`

4. **Success message** (when `?submitted=1`)

5. **Metric cards** (4 cards)
   - "Total applications"
   - "Offers received"
   - "In progress"
   - "Documents pending"

6. **"My course list" card**
   - Enrolled courses grid or available courses
   - "Browse courses" link → `/short-courses`

7. **Application activity chart** (6-month bar chart)

8. **Application progress chart** (stage distribution bars)
   - Combined tuition of active applications

9. **Application tabs** (with counts)
   - All, Drafts, Waiting for Approval, Missing Documents, Offer Letter Received, Visa & Enrolled, Rejected

10. **Application cards grid**
    - University logo, program name, university name
    - Stage badge
    - Missing documents warning
    - Tuition, submitted date, documents verified count
    - "Edit draft" link → `/apply?draft={id}` (drafts only)
    - "Submit draft" button (DraftSubmitButton, drafts only)

---

### `/apply` — Application Wizard
**File:** `src/app/(dashboard)/apply/page.tsx`

**Sections:**
1. **Header** with "← My Applications" back link
2. **Draft warning card** (if editing draft without program)
3. **4-step wizard** (`ApplicationWizard`)

**Wizard Steps:**

**Step 1 — Personal details:**
- First name (required)
- Last name (required)
- Gender (select: Male/Female/Other, required)
- Date of birth (date input, required)
- Passport number (required)
- Nationality
- Country of residence
- City of residence
- Address (textarea)
- Mother's name
- Father's name

**Step 2 — Academic history** (dynamic rows):
- Level (select: High School/Diploma/Foundation/Bachelor/Master/Other)
- Institution (required)
- Field of study
- From year
- To year
- Grade / CGPA
- "+ Add education entry" button
- "Remove this entry" button per row

**Step 3 — Documents:**
- Upload document component
- Document list with status badges (Verified/Pending/Rejected)
- Verified count display

**Step 4 — University & submit:**
- Program select dropdown (or draft completion message)

**Buttons:**
- "← Back" (navigate steps)
- "Save & continue" (steps 0-1)
- "Continue" (step 2)
- "Submit application" / "Complete & submit draft" (step 3)
- "Close" (refresh)

---

### `/application` — Partner Applications List
**File:** `src/app/(dashboard)/application/page.tsx`

**Sections:**
1. **Header** with title "Applications" and subtitle
2. **Stage filter** dropdown (`StageFilter`)
3. **Applications table**
   - Columns: Student, Program, University, Stage, Updated
   - Student name links to `/users/{id}`
   - Program name links to `/application/{id}`
   - Stage badge with color coding

---

### `/application/[id]` — Application Detail
**File:** `src/app/(dashboard)/application/[id]/page.tsx`

**Sections:**
1. **Header**
   - "← Applications" back link
   - Program name heading
   - University · Student name (links to `/users/{id}`)
   - Stage badge

2. **Pipeline card** (left column, 2/3 width)
   - `ApplicationStageForm` — stage progression controls
   - Visa stage tracking (if visa required)

3. **Documents card** (left column)
   - Document list with type, upload date, rejection reason
   - "Open file" link
   - Status badge (Verified/Pending/Rejected)
   - "Verify" button (VerifyDocument, for non-verified)
   - Verified count in header
   - Warning: "Applications can only progress once all required documents are verified"

4. **Program details card** (right column, 1/3 width)
   - University, Level, Field, Tuition, Visa required

5. **Message student card** (right column)
   - `MessageForm` with recipient pre-filled

---

### `/programs` — Programs List
**File:** `src/app/(dashboard)/programs/page.tsx`

**Sections:**
1. **Header** with title "Programs" and subtitle
2. **Programs filter** (`ProgramsFilter`)
   - Search input
   - Country dropdown
   - City dropdown
3. **Program listings**
   - **Student view:** `BulkExportList` with checkboxes for shortlist
   - **Partner view:** University-grouped cards with program rows

**University Card (Partner):**
- University logo, name, city, country
- Program count badge
- Program rows: name, level badge, field, next intake, tuition fee
- "View details" (ProgramDetailDialog)
- "Edit" (ProgramForm, Super Admin only)
- "Delete" (DeleteButton, Super Admin only)

**Buttons/Links:**
- Search/filter controls
- Program name → `/programs/{id}/analytics`
- Shortlist toggle (Student)
- "New program" (ProgramForm, Super Admin only)

---

### `/programs/[id]/analytics` — Program Analytics
**File:** `src/app/(dashboard)/programs/[id]/analytics/page.tsx`

**Sections:**
1. **Header** with university name, program name, subtitle
2. **Metric cards** (3 cards)
   - Applications count
   - Program views count
   - Conversion rate (%)
3. **Application stages card**
   - Stage badges with counts
4. **Students using this program card**
   - Student list with name and stage badge

---

### `/users` — User Management
**File:** `src/app/(dashboard)/users/page.tsx`

**Sections:**
1. **Header** with title "Users" and subtitle
2. **User creation form** (`UserForm`)
   - Role selection (based on actor's creatable roles)
   - Name, email, phone, password
   - Counselor assignment (if applicable)
3. **Invite link form** (`InviteLinkForm`)
   - Student selection
   - Expiry setting
4. **Accounts table**
   - Columns: Name, Email, Role, Phone, Status, Created, Actions
   - Name links to `/users/{id}`
   - Role badge (color-coded)
   - Status badge (active/pending/inactive)
5. **Guest invite links list**
   - Token, student name, expiry
   - Status badge (Active/Expired/Revoked)
   - "Revoke" button

**Buttons:**
- "Create user" (UserForm submit)
- "Generate invite link" (InviteLinkForm)
- "Approve" (ApproveButton, for pending users)
- "Promote" (PromoteUserButton, Super Admin only)
- "View" → `/users/{id}`
- "Delete" (DeleteButton)
- "Revoke" (for invite links)

---

### `/users/[id]` — User Detail
**File:** `src/app/(dashboard)/users/[id]/page.tsx`

**Sections:**
1. **Header**
   - Full name heading
   - Email · Country · Role · Profile completeness %
   - "Promote" button (Super Admin only)
   - "WhatsApp" link
   - "More Details" button → `/users/{id}/analytics`

2. **Applications card** (left column, 2/3 width)
   - Application list with program name, university, stage badge
   - "Open" link → `/application/{id}`

3. **Documents card** (left column)
   - Document list with type and status badge

4. **Contact & account card** (right column, 1/3 width)
   - Phone, Country, Company, Status

5. **Shortlist (staff-curated) card** (right column)
   - `ShortlistBuilder` — add/remove programs
   - "Download shortlist PDF" link

6. **Message student card** (right column)
   - `MessageForm` with recipient pre-filled

---

### `/users/[id]/analytics` — User Analytics
**File:** `src/app/(dashboard)/users/[id]/analytics/page.tsx`

**Sections:**
1. **Header** with user name and subtitle
2. **Metric cards** (4 cards)
   - Applications count
   - Transactions count
   - Recorded payments (MYR)
   - Course enrollments count
3. **Application breakdown card**
   - Stage badges with counts

---

### `/scholarships` — Scholarships List
**File:** `src/app/(dashboard)/scholarships/page.tsx`

**Sections:**
1. **Header** with title "Scholarships" and subtitle
2. **Currency switcher** (Student only)
3. **"Add program" button** (Super Admin only)
4. **Programs table**
   - Columns: University/Program, Level, Field, Tuition, Next intake, Tags, Actions
   - University logo, name, program name, location
   - Level badge, tuition fee, visa requirement
   - Next intake date
   - Tag badges (max 2 + overflow count)
   - Actions: View details, PDF download, Shortlist toggle, Apply, Edit, Delete

**Buttons/Links:**
- "View details" (ProgramDetailDialog)
- "PDF" download link
- Shortlist toggle (Student)
- "Apply" button (ApplyButton, Student)
- "Edit" (ProgramForm, Super Admin)
- "Delete" (DeleteButton, Super Admin)
- "Add program" (ProgramForm, Super Admin)

---

### `/scholarships/[id]` — Scholarship Detail
**File:** `src/app/(dashboard)/scholarships/[id]/page.tsx`

**Sections:**
1. **Header card**
   - University logo, name, program name, location
   - "Go to university page" link (external)
   - Shortlist toggle (Student)
   - Currency switcher (Student)
   - "Download Details PDF" button
   - "WhatsApp" share button

2. **Tags row** (badge list)

3. **"Why {university}?" card**
   - Highlight cards with icon, title, description

4. **Program details card**
   - Application fee, Tuition fee, Offer turnaround, Course duration, Open intakes, College rank, Minimum GPA

5. **Similar courses card**
   - 3 related programs (same field/level/university)

6. **Share section**
   - Copy link, WhatsApp share

---

### `/short-courses` — Short Courses List
**File:** `src/app/(dashboard)/short-courses/page.tsx`

**Sections:**
1. **Header** with title "Short Courses" and subtitle
2. **"New course" button** (Super Admin only)
3. **Stats cards** (Super Admin only, 3 cards)
   - Active courses
   - Enrolled students
   - Pending applications/payments
4. **Course cards grid** (3 columns)
   - Provider, Title, Category badge
   - Description (2-line clamp)
   - Duration, Delivery mode, Next start date, Fee
   - "More Details" link → `/short-courses/{id}`
   - "Enroll" button (EnrollButton, Student)
   - "Edit" (ShortCourseForm, Super Admin)
   - "Delete" (DeleteButton, Super Admin)

---

### `/short-courses/[id]` — Short Course Detail
**File:** `src/app/(dashboard)/short-courses/[id]/page.tsx`

**Sections:**
1. **Header** with course title, provider, category
2. **Course details card**
   - Description, duration, delivery mode, start dates, fee
   - Class schedule, meeting link
   - Prerequisites
3. **Enrollment card** (Student)
   - Enroll button with payment type handling
4. **Admin actions** (Super Admin)
   - Edit, Delete

---

### `/search` — Global Search
**File:** `src/app/(dashboard)/search/page.tsx`

**Sections:**
1. **Header** with title "Search"
2. **Search filters**
   - Search input
   - Filter options
3. **Results list**
   - Student/Program/Application results
   - Links to detail pages

---

### `/sub-agencies` — Sub-Agency Management
**File:** `src/app/(dashboard)/sub-agencies/page.tsx`

**Sections:**
1. **Header** with title "Sub Agencies"
2. **Agency cards/list**
   - Agency name, contact info
   - Student count
   - Actions (view, edit, delete)
3. **"Add sub-agency" button** (Super Admin/Manager)

---

### `/partner-commissions` — Partner Commissions
**File:** `src/app/(dashboard)/partner-commissions/page.tsx`

**Sections:**
1. **Header** with title "Partner Commissions"
2. **Commission table**
   - Agency name, application, commission amount, status
3. **Filters**
   - Date range, agency filter
4. **Summary cards**
   - Total commissions, Paid, Pending

---

### `/transaction` — Transactions
**File:** `src/app/(dashboard)/transaction/page.tsx`

**Sections:**
1. **Header** with title "Transaction"
2. **Transaction form** (`TransactionForm`)
   - Amount, type, description
3. **Transaction table**
   - Date, student, amount, type, currency
4. **Filters**
   - Date range, type filter

---

### `/documents` — Document Management
**File:** `src/app/(dashboard)/documents/page.tsx`

**Sections:**
1. **Header** with title "Documents"
2. **Document list/table**
   - Student name, document type, upload date, status
   - Status badge (Pending/Verified/Rejected)
3. **Actions**
   - "Verify" button
   - "Reject" button
   - "View" document link
4. **Filters**
   - Status filter, student filter

---

### `/reports` — Reports
**File:** `src/app/(dashboard)/reports/page.tsx`

**Sections:**
1. **Header** with title "Reports"
2. **Report types**
   - Applications report
   - Revenue report
   - Enrollment report
3. **Charts and tables**
   - Visual analytics
   - Data tables
4. **Export options**
   - PDF export
   - CSV export
5. **Date range filter**

---

### `/visitor-form` — Visitor Lead Form
**File:** `src/app/(dashboard)/visitor-form/page.tsx`

**Sections:**
1. **Header** with title "Visitor Form"
2. **Visitor lead form** (`VisitorLeadForm`)
   - Name, email, phone
   - Interest/notes
3. **Submit button**

---

### `/my-shortlist` — Student Shortlist
**File:** `src/app/(dashboard)/my-shortlist/page.tsx`

**Sections:**
1. **Header** with title "My Shortlist"
2. **Shortlisted programs list**
   - Program cards with university, level, field, tuition
   - Remove button
3. **"Download PDF" button**
4. **Empty state** when no items

---

### `/messages` — Messaging
**File:** `src/app/(dashboard)/messages/page.tsx`

**Sections:**
1. **Header** with title "Messages"
2. **Message thread list** (left panel)
   - Conversation list with user names
   - Unread indicators
3. **Message view** (right panel)
   - Message history
   - `MessageForm` for reply
4. **New message** button

---

### `/payments` — Payments
**File:** `src/app/(dashboard)/payments/page.tsx`

**Sections:**
1. **Header** with title "Payments"
2. **Payment records table**
   - Date, student, amount, method, status
3. **Status badges**
   - Pending, Completed, Failed, Refunded
4. **Filters**
   - Date range, status filter
5. **Summary cards**
   - Total received, Pending, Refunded

---

### `/profile` — User Profile
**File:** `src/app/(dashboard)/profile/page.tsx`

**Sections:**
1. **Header** with title "Profile" and user info
2. **Profile completeness bar** (Student only)
   - Progress bar with percentage
   - "Complete your profile..." hint
3. **Edit profile form** (`ProfileForm`)

**Form Fields (Student):**
- Title (select: None/Mr/Mrs/Ms/Dr)
- Gender (select: Unspecified/Male/Female/Other)
- Phone
- Country
- Preferred currency (select from CURRENCIES)
- Passport number
- Birthday (date)
- Nationality
- Country of residence
- City of residence
- Address
- Mother's name
- Father's name

**Form Fields (Partner):**
- Title, Gender, Phone, Country, Preferred currency
- Company name
- License number

**Buttons:** "Save profile"

---

### `/settings` — Settings
**File:** `src/app/(dashboard)/settings/page.tsx`

**Sections:**
1. **Header** with title "Settings"
2. **Change password form** (`ChangePasswordForm`)
   - Current password
   - New password
   - Confirm new password
3. **Preferences**
   - Language switcher
   - Currency preference
4. **Danger zone**
   - Delete account option

---

### `/invite/[token]` — Invite Link
**File:** `src/app/invite/[token]/page.tsx`

**Sections:**
1. **Invite landing**
   - Invite details (role, inviter)
   - "Accept invite" → signup flow
   - Expired/revoked state

---

## Shared Components

### `DashboardShell`
- Wraps all dashboard pages
- Contains `Sidebar` + `Topbar` + main content area
- Responsive: sidebar collapses on mobile, toggle button on desktop

### `Sidebar`
- Logo/brand link (SA badge)
- Navigation sections (role-based filtering)
- User create button (Partner only, `SidebarUserCreate`)
- WhatsApp quick launch link (Partner only)
- User info footer with avatar initial

### `Topbar`
- Mobile menu toggle (hamburger)
- User name and email display
- Currency selector

### `AuthShell`
- Centered card layout
- Title, subtitle, footer slot
- Used by all auth pages

---

## Form Components

| Component | File | Fields |
|-----------|------|--------|
| `LoginForm` | `src/components/login-form.tsx` | Email, Password |
| `SignupForm` | `src/components/signup-form.tsx` | First name, Last name, Phone, Email, Password |
| `PartnerSignupForm` | `src/components/partner-signup-form.tsx` | Company details, License, etc. |
| `ProfileForm` | `src/components/profile-form.tsx` | Title, Gender, Phone, Country, Currency, Passport, Birthday, Nationality, Address, Parents' names, Company name, License number |
| `ApplicationWizard` | `src/components/application-wizard.tsx` | Personal details, Academic history (dynamic), Documents, Program selection |
| `ApplicationStageForm` | `src/components/application-stage-form.tsx` | Stage progression, Visa stage |
| `UserForm` | `src/components/user-form.tsx` | Role, Name, Email, Phone, Password, Counselor assignment |
| `ProgramForm` | `src/components/program-form.tsx` | University, Name, Level, Field, Location, Tuition fee, Application fee, Intake dates, Required documents, Min GPA, Visa required, Commission rate, Tags, Offer turnaround, College rank, Eligibility criteria, Course duration |
| `ShortCourseForm` | `src/components/short-course-form.tsx` | Title, Provider, Category, Duration, Start dates, Fee, Delivery mode, Class schedule, Meeting link, Prerequisites, Description, Linked program, Payment type, Bank details |
| `MessageForm` | `src/components/message-form.tsx` | Recipient (pre-filled), Message content |
| `ChangePasswordForm` | `src/components/change-password-form.tsx` | Current password, New password, Confirm password |
| `VisitorLeadForm` | `src/components/visitor-lead-form.tsx` | Name, Email, Phone, Interest |
| `TransactionForm` | `src/components/transaction-form.tsx` | Amount, Type, Description |
| `InviteLinkForm` | `src/components/invite-link-form.tsx` | Student selection, Expiry |

---

## Reusable UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `Button` | `src/components/ui/button.tsx` | Primary/secondary/ghost/danger variants, sizes |
| `Input` | `src/components/ui/input.tsx` | Text input with label |
| `Select` | `src/components/ui/select.tsx` | Dropdown select |
| `Textarea` | `src/components/ui/textarea.tsx` | Multi-line text input |
| `Label` | `src/components/ui/label.tsx` | Form label |
| `Card` | `src/components/ui/card.tsx` | Content card container (CardHeader, CardTitle, CardContent, CardDescription) |
| `Badge` | `src/components/ui/badge.tsx` | Status/role badge with tone variants |
| `Dialog` | `src/components/ui/dialog.tsx` | Modal dialog |
| `PasswordInput` | `src/components/password-input.tsx` | Password with show/hide toggle |

---

## Action Components

| Component | File | Purpose |
|-----------|------|---------|
| `DeleteButton` | `src/components/delete-button.tsx` | Delete with confirmation dialog |
| `ApproveButton` | `src/components/approve-button.tsx` | Approve pending user |
| `PromoteUserButton` | `src/components/promote-user-button.tsx` | Promote user role |
| `DraftSubmitButton` | `src/components/draft-submit-button.tsx` | Submit draft application |
| `EnrollButton` | `src/components/enroll-button.tsx` | Enroll in short course |
| `ApplyButton` | `src/components/apply-button.tsx` | Quick apply action |
| `ShortlistToggle` | `src/components/shortlist-toggle.tsx` | Add/remove shortlist |
| `UploadDocument` | `src/components/upload-document.tsx` | Document upload |
| `VerifyDocument` | `src/components/verify-document.tsx` | Verify/reject document |
| `UploadReceipt` | `src/components/upload-receipt.tsx` | Payment receipt upload |
| `ProgramDetailDialog` | `src/components/program-detail-dialog.tsx` | Program details modal |
| `DocumentViewer` | `src/components/document-viewer.tsx` | Document preview |
| `ReportActions` | `src/components/report-actions.tsx` | Report export/actions |
| `CompareCourses` | `src/components/compare-courses.tsx` | Course comparison |
| `CourseFilter` | `src/components/course-filter.tsx` | Course filtering |
| `ProgramsFilter` | `src/components/programs-filter.tsx` | Program filtering (search, country, city) |
| `StageFilter` | `src/components/stage-filter.tsx` | Application stage filter |
| `BulkExportList` | `src/components/bulk-export-list.tsx` | Bulk select & export to PDF |
| `ShortlistBuilder` | `src/components/shortlist-builder.tsx` | Build staff-curated shortlist |
| `FeeDisplay` | `src/components/currency.tsx` | Currency conversion display |
| `CurrencySwitcher` | `src/components/currency.tsx` | Change display currency |
| `LanguageSwitcher` | `src/components/language-switcher.tsx` | i18n language toggle |
| `DashboardAdRail` | `src/components/dashboard-ad-rail.tsx` | Advertisement display |
| `SidebarUserCreate` | `src/components/sidebar-user-create.tsx` | Quick user creation in sidebar |
| `AgencyPermissionToggle` | `src/components/agency-permission-toggle.tsx` | Toggle agency permissions |

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/signup` | POST | User registration |
| `/api/auth/[...nextauth]` | * | NextAuth authentication |
| `/api/applications` | POST | Create application |
| `/api/applications/[id]/submit` | POST | Submit draft application |
| `/api/applications/[id]` | * | Application CRUD |
| `/api/profile` | PUT | Update profile |
| `/api/users` | GET/POST | User list/create |
| `/api/users/[id]` | * | User CRUD |
| `/api/programs` | * | Program CRUD |
| `/api/programs/[id]/pdf` | GET | Download program PDF |
| `/api/short-courses` | * | Short course CRUD |
| `/api/scholarships` | * | Scholarship CRUD |
| `/api/documents` | * | Document CRUD |
| `/api/invites` | * | Invite link CRUD |
| `/api/visitor-form` | POST | Submit visitor lead |
| `/api/visitor-form/[id]` | * | Visitor form CRUD |
| `/api/shortlist/[studentId]/pdf` | GET | Download shortlist PDF |

---

## Application Stages

| Stage | Description |
|-------|-------------|
| `DRAFT` | Application started but not submitted |
| `SUBMITTED` | Submitted for review |
| `UNDER_REVIEW` | Being reviewed by staff |
| `OFFER` | Offer letter received |
| `DEPOSIT_PAID` | Deposit payment completed |
| `VISA` | Visa application in progress |
| `ENROLLED` | Successfully enrolled |
| `REJECTED` | Application rejected |
| `WITHDRAWN` | Withdrawn by student |

---

## Document Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Uploaded, awaiting verification |
| `VERIFIED` | Verified by staff |
| `REJECTED` | Rejected by staff |

---

## Permission Rules

- **Super Admin:** Full access to everything
- **Manager:** Manages agencies, counselors, students (not Super Admins)
- **Agency:** Manages own students and sub-agencies
- **Counselor:** Manages assigned students only
- **Student:** Self-service only (own applications, profile, documents)

Sidebar sections are filtered by role — partner-only sections are completely absent from student navigation.

---

## Sidebar Navigation Sections

| Section | Icon | Route | Visible To |
|---------|------|-------|------------|
| Home | Home | `/home` | Partner |
| My Applications | FileText | `/my-applications` | Student |
| Apply Application | FilePlus | `/apply` | Student |
| Programs | Globe | `/programs` | All |
| Users | Users | `/users` | Super Admin, Manager |
| Scholarships | GraduationCap | `/scholarships` | All |
| Short Courses | BookOpen | `/short-courses` | All |
| Search | Search | `/search` | Partner |
| Application | ClipboardList | `/application` | Partner |
| Sub Agencies | Network | `/sub-agencies` | Super Admin, Manager, Agency |
| Partner Commissions | Percent | `/partner-commissions` | Super Admin, Manager, Agency |
| Transaction | Wallet | `/transaction` | Super Admin, Manager, Agency |
| Documents | ShieldCheck | `/documents` | Partner |
| Reports | BarChart3 | `/reports` | Super Admin, Manager, Agency |
| Visitor Form | ClipboardCheck | `/visitor-form` | Partner |
| My Shortlist | Star | `/my-shortlist` | Student |
| Messages | MessageSquare | `/messages` | All |
| Payments | CreditCard | `/payments` | All |
| Profile | User | `/profile` | All |
| Settings | Settings | `/settings` | All |
