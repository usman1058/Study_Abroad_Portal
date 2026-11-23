# Public Website Architecture and Design

## Product boundary

The repository contains two independently runnable Next.js applications:

- `src/app` remains the authenticated student, partner, consultant, and admin portal on port **3000**.
- `apps/website/src/app` is the public marketing and discovery website on port **3001**.

They can be deployed as two Vercel projects from the same repository. The portal remains at its portal subdomain; the website uses the primary domain. The public site never reads portal sessions or private student data.

## Data flow

```text
Public browser
   ├── website pages (SSR, public catalog only)
   └── website /api/contact
           └── portal /api/public/contact ──> VisitorLead ──> admin Visitor Form

Website server components
   └── portal /api/public/programs ──> published program and university fields
```

The website consumes only an allowlisted public projection of admin-managed programs. It does not connect directly to the database. Contact submissions are validated and rate limited by the portal, and become `VisitorLead` records with source `public_website`; admins continue managing them from the existing Visitor Form page. The website server proxies submissions, so no cross-origin browser access or portal credentials are needed.

## Local development and deployment

- Portal: `pnpm dev` → `http://localhost:3000`
- Public website: `pnpm website:dev` → `http://localhost:3001`
- Website environment: copy `apps/website/.env.example` to `apps/website/.env.local`; set `PORTAL_API_BASE_URL` to the portal origin and `NEXT_PUBLIC_PORTAL_URL` to the portal origin.
- For Vercel, create a second project from this repository with Root Directory `apps/website`. Keep the portal project rooted at the repository root. Set `PORTAL_API_BASE_URL` to the deployed portal origin and `NEXT_PUBLIC_PORTAL_URL` to the portal subdomain in the website project.

## Public page map

| Route | Purpose |
| --- | --- |
| `/` | Main landing page, discovery paths, process explanation, and live catalog highlights |
| `/about` | Mission, support approach, and how the service works |
| `/applications` | Searchable/filterable public catalog of programs administered in the portal |
| `/applications/[id]` | Program detail, costs, entry criteria, documents, intakes, and apply CTA |
| `/contact` | Accessible enquiry form, submitted into the admin Visitor Form queue |
| `/faq` | Common questions with keyboard-native expandable answers |
| `/terms` | Public terms of use |
| `/privacy` | Privacy notice for enquiries and application handoff |

“Applications” on the public site means the public program opportunities catalog. A visitor can read details without an account; applying still happens in the authenticated student portal. Private student application records are never exposed.

## UI/UX and visual system

- **Brand:** retain the portal's deep navy (`#0A192F`) and blue (`#2563EB`) so the website and portal feel related. Use warm ivory (`#F8F7F3`) page surfaces and restrained amber (`#F3B54A`) accents to make the public experience feel welcoming without changing portal controls.
- **Typography:** Plus Jakarta Sans for display headings and Inter for body/UI text, matching the existing portal. Use a clear 12/14/16/20/28/40/56px type scale and generous line height for long-form pages.
- **Layout:** editorial wide hero, readable max-width content, consistent 12-column desktop grid, cards with quiet borders, generous whitespace, and a compact sticky navigation. Mobile collapses to a single column and an accessible menu.
- **Home page hierarchy:** brand/navigation → value proposition and primary actions → live program discovery → process steps → support/partner pathways → final enquiry CTA → footer.
- **Catalog usability:** explicit search label, country/level/field filters, result count, reset action, empty/error states, clear tuition/intake details, and pagination. Cards link to stable application/program IDs.
- **Detail usability:** scannable overview, fees, entry requirements, required documents, intake information, and a clear apply action; unknown optional values are shown as unavailable rather than fabricated.
- **Accessibility:** semantic landmarks, skip link, visible keyboard focus, WCAG AA contrast targets, labeled inputs, inline form errors and status announcements, meaningful link labels, no color-only status, native `<details>` FAQ, and reduced-motion support.
- **Content policy:** do not invent rankings, partner universities, outcomes, testimonials, success rates, or legal commitments. All program facts come from portal-managed catalog records. Replace draft legal text with approved policy before launch.

## Future extension points

Keep public content/data reads behind the portal's public API. Add a CMS only when marketing staff need non-program copy editing. Add analytics/consent controls only after choosing a provider and retention policy. Add structured data and a sitemap after route metadata and production domains are confirmed.
