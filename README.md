# Sterlington Pharma — company website

**Live site:** https://sterlingtonpharma.com
**Company:** Sterlington Injectable Pharmaceutical UK Ltd (company no. 17067636)
B2B wholesaler of sterile injectable and oral medicines. Not a consumer pharmacy.

## What is in this repository

```
index.html, products.html, quality.html, company.html,   ← generated pages (committed, deployable as-is)
partners.html, contact.html, privacy.html, legal.html, 404.html
products/<slug>.html                                    ← 19 generated product pages
assets/css/site.css        design tokens + components
assets/js/site.js          field motif, navigation, reveals, contact form
assets/js/catalogue.js     product search and filters
assets/products/           pack renders (jpg/webp) and keyed cut-outs (png/webp)
assets/img/                logo, icons, facet pattern masks, og-image.jpg
src/data/products.json     THE product data — edit products here
src/data/site.json         company facts, contact details
src/pages/*.html           page sources (body markup + meta block)
src/partials/*.html        layout, header, footer, contact form
src/templates/product.html product page template
tools/build.mjs            generates the HTML above from src/
tools/serve.mjs            local dev server with Cloudflare-style clean URLs
lib/, worker.js, functions/api/contact.js, wrangler.jsonc   contact-form backend for Cloudflare
_headers, _redirects, robots.txt, sitemap.xml, site.webmanifest
```

## Editing the site

1. Edit files under `src/` (never the generated HTML at the root — it is overwritten).
2. Rebuild: `node tools/build.mjs`
3. Preview: `node tools/serve.mjs` then open http://localhost:8792
4. Commit and push `main` — Cloudflare deploys automatically.

No dependencies are needed beyond Node.js 18+ (the machine's Node 24 works).

### Add or change a product
Edit `src/data/products.json`. Each product needs: `slug`, `name`, `active`, `cat` (`inject` | `infusion` | `oral`),
`form` (`solution` | `powder` | `suspension`), `class`, `strengths[]`, `formText`, `pack`, `code`, `desc`, `accent` (the
colour of the pack's dosage-form band) and images in `assets/products/`: `<slug>.jpg`, `<slug>.webp`,
`<slug>-cut.png`, `<slug>-cut.webp` (pack on a transparent background). Then run the build.

## Contact form delivery
The form posts JSON to `/api/contact`. On Cloudflare the handler (`lib/contact-handler.js`) sends the enquiry by email
through Resend when these secrets are set in the Cloudflare dashboard: `RESEND_API_KEY`, `CONTACT_TO`
(and optionally `CONTACT_FROM`). Until they are set, the endpoint returns 501 and the site shows the visitor a
pre-filled email link instead, so no enquiry is lost.

* Workers deployment: `wrangler.jsonc` + `worker.js` (already configured).
* Pages deployment: `functions/api/contact.js` (already configured).

## Screenshots for QA
`node tools/snap.mjs <outDir> <url> 375x812@2:mobile [name]` renders a full-page screenshot with device emulation.
Append `?snap` to a URL to force scroll-reveal content visible.
