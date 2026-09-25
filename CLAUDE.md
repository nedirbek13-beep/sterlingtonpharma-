# CLAUDE.md — Sterlington Injectable Pharmaceutical UK Ltd

Master instructions for any AI assistant working on this repository. Read fully before changing anything.

## The company (verified facts only)
- Registered name: **Sterlington Injectable Pharmaceutical UK Ltd**, company no. **17067636**, incorporated 3 March 2026, England and Wales.
- Registered office: 50 Princes Street, Ipswich, United Kingdom, IP1 1RJ. Director: Daniel Milchev Petkov.
- SIC codes: 46460 Wholesale of pharmaceutical goods; 46900 Non-specialised wholesale trade.
- Contact: +44 7376 237959 · info@sterlingtonpharma.com · https://sterlingtonpharma.com
- Business model: **B2B only** — hospitals, licensed distributors, institutional buyers. Never consumer/retail.
- Product range brand on packaging: **SterliX**. Products are listed by generic (INN) name.

Everything above comes from Companies House and the owner. Do **not** add founding years, market counts, countries,
certifications, awards, partners, facilities, testimonials, sales figures or clinical claims that are not verified.
The earlier "founded 2016 in Edinburgh" copy conflicts with the register and was removed — do not reintroduce it
without written confirmation from the owner.

## Architecture
- Static site, no framework, no runtime dependencies. Pages are **generated** by `node tools/build.mjs` from `src/`.
- Edit `src/` only. Root-level `*.html`, `products/*.html` and `sitemap.xml` are build output (committed so Cloudflare needs no build step).
- Product data lives in `src/data/products.json` (single source of truth). Company facts in `src/data/site.json`.
- Styles: `assets/css/site.css` (tokens at the top). Behaviour: `assets/js/site.js`, `assets/js/catalogue.js`.
- Contact form backend: `lib/contact-handler.js` used by `worker.js` (Workers) and `functions/api/contact.js` (Pages).
- Local preview: `node tools/serve.mjs` → http://localhost:8792 (clean URLs like production).
- Deploy: push `main` to GitHub `nedirbek13-beep/sterlingtonpharma-`; Cloudflare deploys automatically.

## Design system (keep it)
- Colours: ink `#1a2235`, navy `#132c4a`, blue `#0b5094`, blue-100 `#c7ddf0`, paper-2 `#faf9f7`, paper-3 `#f3f6fa`, muted `#6b7894`, brass `#c9a961` (hairlines only, never text).
- Per-product accent = the colour of the pack's dosage-form band (in `products.json`); the build derives a darker `ink` variant for text contrast.
- Type: Source Serif 4 (display, product names) + Inter (UI, body, tables). Both carry Cyrillic for future RU content.
- Signature motif: the "precision field" — jittered triangular lattice with nodes, derived from the pack facets and molecule.
  Canvas version: `data-field` (site.js). Static versions: `assets/img/facet-*.svg` masks, `.facet-edge` section dividers.
- No gold luxury styling, no stock photos, no glowing blobs, no pill buttons, no fake badges.
- Motion: transform/opacity only, entrance sequencing on `[data-seq]`, scroll reveals on `[data-reveal]`, all disabled under `prefers-reduced-motion`.

## Pharmaceutical content rules
- Preserve product names, strengths, dosage forms and pack sizes exactly as in `products.json`. Never "correct" them silently — flag doubts to the owner.
- No indications, dosing, safety claims or regulatory status beyond what the owner supplies in writing.
- Product descriptions (`desc`) are the owner's original copy; they are shown as short class descriptions only.
- Product expiry dates on record (`expiryOnRecord`) are kept in the data but are **not** displayed.

## Never
- Never invent facts, certificates, markets, partners or statistics.
- Never change contact details without instruction.
- Never remove any of the 19 products; only add or update.
- Never commit secrets. Email delivery keys live in Cloudflare secrets (see README).
- Never hand-edit generated HTML.

## Owner
Nedir — no coding background. Explain changes in plain English: what changed, why, what to check in the browser.
