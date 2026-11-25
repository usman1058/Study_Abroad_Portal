# Public CheckMyUni Website

This is the public marketing/catalog website. It runs separately from the portal and consumes only the portal's public program API. Contact form entries are created in the portal Visitor Form queue.

## Run locally

From the repository root:

1. Copy `apps/website/.env.example` to `apps/website/.env.local`.
2. Start the portal on port 3000 with `pnpm dev`.
3. In another terminal, start the public website on port 3001 with `pnpm website:dev`.

The website is at `http://localhost:3001`; the portal stays at `http://localhost:3000`.

For production, deploy the portal and website as separate projects from the same repository. Keep the portal project root at the repository root; set the public website project's root directory to `apps/website`. Configure `PORTAL_API_BASE_URL`, `NEXT_PUBLIC_PORTAL_URL`, and `NEXT_PUBLIC_SITE_URL` separately in each environment.

See [`WEBSITE_ARCHITECTURE.md`](../../WEBSITE_ARCHITECTURE.md) for page map, data boundaries, and design decisions.
