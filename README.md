# Kami Shiatsu

Website for Kami Shiatsu — Masunaga Shiatsu in Pézenas & Tourbes.
Static, trilingual (FR default, EN, ES), no dependencies, hosted free on Cloudflare Pages.

- **Content**: `content/settings.json` (contact, prices) and `content/{fr,en,es}.json` (all text)
- **Build**: `node build.js` → writes the site to `_site/`
- **Design**: `assets/style.css`; optimized images in `assets/img/` (originals in `images/`)
- **Non-coder editing**: [Pages CMS](https://pagescms.org), configured in `.pages.yml` — see [GUIDE-MODIFICATION.md](GUIDE-MODIFICATION.md) (in French, for the owner)

## URLs

| Page | FR | EN | ES |
|---|---|---|---|
| Home | `/` | `/en/` | `/es/` |
| Shiatsu | `/shiatsu/` | `/en/shiatsu/` | `/es/shiatsu/` |
| About | `/a-propos/` | `/en/about/` | `/es/sobre-mi/` |
| Legal | `/mentions-legales/` | `/en/legal-notice/` | `/es/aviso-legal/` |

## SEO included

Separate indexable URL per language with `hreflang` + `x-default`, canonical URLs, per-page
title/description, Open Graph image, `HealthAndBeautyBusiness` / `Person` / `BreadcrumbList`
JSON-LD (with offers & areas served), `sitemap.xml` with language alternates, `robots.txt`,
semantic HTML, alt texts, WebP images (~150 KB per page), no render-blocking JS, no cookies.

## Setup (one time)

1. **Web3Forms key** — put it in `content/settings.json` → `web3formsKey`.
2. **Push to GitHub** (private repo is fine).
3. **Cloudflare Pages** — dash.cloudflare.com → Workers & Pages → Create → Pages →
   *Connect to Git* → pick the repo, then:
   - Framework preset: **None**
   - Build command: `node build.js`
   - Build output directory: `_site`

   Every push (including saves from Pages CMS) redeploys automatically.
4. **Domain** — if the project URL isn't `kami-shiatsu.pages.dev`, or once you add a custom domain,
   update `siteUrl` in `content/settings.json` (used for canonical, hreflang, sitemap).
5. **Pages CMS** — the owner creates a free GitHub account; add them as a collaborator on the repo.
   They sign in at app.pagescms.org and open the repo.
6. **Google** — add the site in Google Search Console and submit `/sitemap.xml`.
   Create a **Google Business Profile** (biggest win for local “shiatsu Pézenas” searches) and link the site.

## Local preview

```sh
node build.js && python3 -m http.server 8000 --directory _site
```
