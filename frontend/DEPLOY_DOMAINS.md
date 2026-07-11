# Admin / books subdomains

## Production DNS (your registrar)

Wildcard (recommended — one record covers all staff portals):

| Type | Name | Value |
|------|------|--------|
| CNAME | `*` | `ae771a940a12ba13.vercel-dns-017.com` |

Keep separate records:

| Type | Name | Value |
|------|------|--------|
| CNAME | `www` | `ae771a940a12ba13.vercel-dns-017.com` |
| CNAME | `api` | `4eafd185edb18448.vercel-dns-017.com` |

`api` must stay on the **backend** Vercel project target, not the frontend `*` target.

## Vercel (frontend project)

Under **Settings → Domains**, add:

- `anandsandeshkaryalay.online`
- `www.anandsandeshkaryalay.online`
- `*.anandsandeshkaryalay.online` (required when using wildcard DNS)

Wait until each domain shows **Valid** (SSL can take a few minutes).

## Local development

Path URLs (always work on plain `localhost`):

- http://localhost:5173/admin — full admin
- http://localhost:5173/books-admin — books only

Subdomain URLs (any slug in `admin_portals` — add row in DB only):

- http://admin.localhost:5173 — slug `admin`
- http://books.localhost:5173 — slug `books`
- http://ebooks.localhost:5173 — works after you insert `slug=ebooks` in Supabase

The app calls `GET /api/staff/portals/:slug` to load role and UI (books-only vs full admin). No code changes needed for new slugs.

Backend must be running (`npm run dev` in `Anandsandeshbe/backend`) so `/api` proxy works.

## Staff login (DB)

1. Run `sql/create_admin_portals.sql` in Supabase.
2. Run `node scripts/seedAdminPortals.mjs` once, or insert rows in `admin_portals`.

| slug | URL (production) |
|------|------------------|
| `admin` | https://admin.anandsandeshkaryalay.online |
| `books` | https://books.anandsandeshkaryalay.online |
