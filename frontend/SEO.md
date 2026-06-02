# SEO Setup Guide — Anand Sandesh Karyalay

This document explains everything that has been added to the codebase for SEO,
**and the manual steps you must do** so that searching for **"anandsandeshkarlay"**
on Google / Bing actually shows your site at the top (including searches for
**anandsandesh**, **anand sandesh**, and common misspellings like **anandsandeshkarlay**).

> **Reality check first**
> A code change alone will *never* put a brand-new website at #1. Google ranks
> sites it has crawled, indexed, and trusted. The work below is split into:
>
> 1. **What the code now does (already done by Cursor).**
> 2. **What you must do manually (only you can do these).**

---

## 1. What the code now does

| File | Purpose |
| --- | --- |
| `index.html` | Title, description, keywords, robots, canonical, hreflang, Open Graph, Twitter card, JSON-LD structured data (Organization, WebSite, LocalBusiness), favicon links, manifest link, geo meta, hidden SEO h1 fallback for crawlers, `<noscript>` fallback. |
| `public/robots.txt` | Tells Google/Bing/etc. they may crawl every public page; blocks `/admin` and `/api/`. Points to the sitemap. |
| `public/sitemap.xml` | Lists every important URL with last-modified date and priority. |
| `public/site.webmanifest` | PWA manifest — lets Google show your logo/colors in mobile search and lets users "install" the site. |
| `public/logo.png` | Logo copied here so `/logo.png` is reachable from the public root (used by Open Graph, Twitter card, manifest, favicon). |
| `src/utils/seo.js` | `useSeo({ title, description, canonical })` hook so each page can set its own title/description. |
| `src/pages/AboutPage.jsx` | Public **About** page (magazine, publisher, books, address) — high priority for Google indexing. |
| `src/pages/AuthPage.jsx` | Homepage `useSeo` (includes **anandsandesh** / **anand sandesh** in description). Link to `/about` in footer. |
| `src/pages/FormPage.jsx` | Subscription form route SEO. |
| `src/pages/ProfileOverviewPage.jsx` | Profile route SEO. |
| `src/pages/PaymentPage.jsx` | Payment route SEO. |
| `src/pages/SuccessPage.jsx` | Confirmation route SEO. |
| `src/pages/AdminPage.jsx` | Admin route SEO with `noindex` (not for public search). |

### Domain (already set)

The canonical domain is **`https://anandsandeshkaryalay.online`** and is
hard-coded into:

- `index.html` (canonical, hreflang, og:url, og:image, twitter:image, all
  three JSON-LD blocks, hidden h1, noscript block)
- `public/robots.txt` (the `Sitemap:` line)
- `public/sitemap.xml` (every `<loc>` and `hreflang` href)
- `src/pages/AuthPage.jsx` (the `useSeo({ canonical: ... })` call)

If you ever change domains, do a project-wide find-and-replace of
`https://anandsandeshkaryalay.online` with the new URL.

---

## 2. What you must do manually (only you can do these)

This is the part that actually makes Google rank you. Do these in order.

### Step 1 — Domain (DONE)

You already own `anandsandeshkaryalay.online`.

### Step 2 — Host the frontend on a real server

Free, fast, and SEO-friendly options for a Vite SPA:

- **Vercel** (`vercel.com`) — `vercel deploy` and you are live with HTTPS.
- **Netlify** — drag-and-drop the `dist/` folder.
- **Cloudflare Pages** — free, very fast, great for India.

Build command: `npm run build`
Publish directory: `dist`

After deploy, point your domain's DNS to the host. HTTPS must work
(Google penalizes plain HTTP).

### Step 3 — Verify ownership in Google Search Console

This is the single most important step.

1. Go to <https://search.google.com/search-console>.
2. Add your domain.
3. Verify ownership (DNS TXT record is the recommended method).
4. Submit your sitemap: `https://your-domain.com/sitemap.xml`.
5. Click **"Request indexing"** for `https://your-domain.com/`.

Without this, Google may take *months* to discover you. With it, indexing
usually happens in 1–3 days.

Repeat for **Bing Webmaster Tools** (<https://www.bing.com/webmasters>) — it
also powers DuckDuckGo, Yahoo, and ChatGPT search.

### Step 4 — Make Google trust the name

To rank for the literal name **"anandsandeshkarlay"** (the spelling people
might type), Google must see that name on your site, *and* on other sites
linking to you. Do these:

1. Create a **Google Business Profile** (free) for "Anand Sandesh Karyalay,
   Shri Anandpur Dham" with the same address that's in `index.html`. This
   alone usually gets a Knowledge Panel for the brand name within weeks.
2. Add a Wikipedia / Wikidata entry if applicable.
3. List on directories: JustDial, Sulekha, IndiaMART, etc., each linking back
   to your domain.
4. Mention the website on every Anand Sandesh magazine printed copy, every
   email, every social media bio. Each public mention is a signal.

### Step 5 — Public About page (DONE)

The public page **`/about`** describes:

- Anand Sandesh monthly magazine (Hindi & English)
- Shri Paramhans Advait Mat Publication Society
- Other spiritual books
- Full address at Shri Anandpur Dham

It is listed in `public/sitemap.xml` with priority `0.9`. After deploy, request
indexing for `https://anandsandeshkaryalay.online/about` in Search Console.

Optional later: a dedicated Contact page or Subscription Plans page (still
useful, but `/about` covers the main SEO need).

### Step 6 — (Recommended) Add pre-rendering

Vite SPAs render in the browser, so Google initially sees an empty page. The
hidden `<h1>` in `index.html` is a good fallback, but **pre-rendering is much
better**. Add it any time after launch:

```bash
npm install -D vite-plugin-prerender-spa
```

…and configure it to pre-render `/` (the homepage) into static HTML at build
time. Or migrate to **Next.js** for full server-side rendering — that's the
gold standard if SEO is a top priority.

### Step 7 — Speed & Core Web Vitals

Google ranks fast sites higher. Test yours at
<https://pagespeed.web.dev>. Target scores:

- Performance ≥ 90
- Accessibility ≥ 95
- SEO ≥ 100  (the code changes above should already give you 100 here)

Your big GIF (`public/36218.gif`, 3.2 MB) hurts performance — convert it to
an MP4 / WebM or a smaller WebP.

---

## How to verify the SEO changes locally

```bash
cd Anandsandesh/frontend
npm run build
npm run preview
```

Open the preview URL (usually `http://localhost:4173`) and:

1. **View Page Source** (Ctrl+U). You should see all the meta tags, the
   hidden `<h1>`, the `<noscript>` block, and three `<script type="application/ld+json">`
   blocks.
2. Visit `http://localhost:4173/robots.txt` — should show the robots file.
3. Visit `http://localhost:4173/sitemap.xml` — should show the sitemap.
4. Visit `http://localhost:4173/site.webmanifest` — should show the manifest.

After deploying to your real domain, validate with:

- <https://search.google.com/test/rich-results> — confirms Google can read
  your structured data.
- <https://www.opengraph.xyz/> — paste your URL to preview the WhatsApp /
  Facebook / Twitter card.
- <https://pagespeed.web.dev> — confirms speed.

---

## Realistic timeline

| Week | What to expect |
| --- | --- |
| Day 0 | Code is SEO-ready (already done). |
| Day 1–3 | Domain bought, deployed, Search Console verified, sitemap submitted. |
| Week 1–2 | Google starts crawling. Site appears for very specific queries (`site:your-domain.com`). |
| Week 2–6 | Brand name searches ("anandsandeshkarlay", "anand sandesh karyalay") begin showing your site, especially with Google Business Profile. |
| Month 2–6 | Rank stabilizes at #1 for your brand name; broader queries depend on content + backlinks. |

There is no faster path. Anyone promising "instant #1 ranking" is selling
something fake.
