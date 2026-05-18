# CLAUDE.md — Sterlington Injectable Pharmaceutical UK Ltd

> This file is the master instruction set for any AI assistant (Claude, Cursor, Copilot) working on this project.
> Read this entire file before making any changes. Follow every instruction exactly.

---

## Project Overview

**Company:** Sterlington Injectable Pharmaceutical UK Ltd
**Website:** https://sterlingtonpharma.com
**Type:** B2B pharmaceutical supply company — NOT a consumer pharmacy
**Location:** Edinburgh, Scotland, United Kingdom
**Contact:** +44 7376 237959 | info@sterlingtonpharma.com

**What this company does:**
Sterlington is a precision-led B2B supplier of sterile injectable and oral pharmaceutical products. It sources from GMP-certified manufacturers and distributes to licensed distributors, hospital procurement teams, and healthcare institutions worldwide. It does NOT sell to the general public.

---

## Repository Structure

```
sterlingtonpharma/
├── index.html          ← The entire website (single file, all images embedded as base64)
├── CLAUDE.md           ← This file — AI instructions
├── README.md           ← Project overview for GitHub
└── .gitignore          ← Files to exclude from git
```

**Critical:** The website is a single `index.html` file. All product images are embedded as base64 data URIs inside the file. There are NO separate image files. Do NOT break this architecture.

---

## Tech Stack

- **HTML/CSS/JavaScript** — pure, no frameworks, no build tools
- **Fonts:** Google Fonts (Inter + Playfair Display) loaded via CDN
- **Images:** All embedded as base64 inside index.html
- **Hosting:** Cloudflare Pages (auto-deploys from GitHub main branch)
- **Domain:** sterlingtonpharma.com (Cloudflare registrar)
- **Version Control:** GitHub — username nedirbek13-beep

**Deploy flow:**
```
Edit index.html in Cursor
→ git add . && git commit -m "description"
→ git push origin main
→ Cloudflare Pages auto-deploys in ~60 seconds
→ sterlingtonpharma.com updates live
```

---

## Brand Identity

**Tone:** Serious, precise, professional. Think pharmaceutical manufacturer, not retailer.
**Voice:** Authoritative but approachable. Never salesy. Never casual.
**Style references:** Bespoke Pharmaceutical (bespokepharmaceutical.com), Pfizer (pfizer.com)

**Typography:**
- Headlines: Playfair Display (serif, italic for emphasis)
- Body: Inter (clean, professional)

**Colour Palette:**
- Dark: `#0a0e14` (near black — primary dark)
- Darker: `#05080c` (footer background)
- Charcoal: `#1a1f2a`
- Gold accent: `#c9a961` (use sparingly — headings, eyebrows, highlights)
- Gold dark: `#a88a47`
- White: `#ffffff`
- Off-white: `#fafafa`
- Cream: `#f5f3ef`
- Text: `#0a0e14`
- Muted: `#8b95a3`
- Border: `rgba(10,14,20,0.08)`

**Never use:** Bright greens, neon colours, gradients that look cheap, Comic Sans or similar fonts, all-caps body text.

---

## Website Sections (in order)

1. **Header** — sticky nav with logo, 5 nav links, Contact CTA button
2. **Hero** — headline, subtext, two CTA buttons, stacked product images right side
3. **Why Sterlington Exists** — dark background, 3 numbered points
4. **Platform Philosophy** — cream background, 4 numbered cards
5. **Capabilities** — 4 cards (Injectables, IV Infusions, Oral Suspensions, Documentation)
6. **Products** — filterable grid of 19 products with prices, click opens modal
7. **Operations** — dark background, bullet points, quote box
8. **Partners / Who We Work With** — 4 partner types + quote
9. **Contact** — form + contact info cards
10. **CTA Band** — full-width call to action
11. **Footer** — 4-column grid

---

## Products (Complete List — DO NOT REMOVE ANY)

### Injectables (cat: inject)
| Name | Code | Dose | Price | Expiry |
|---|---|---|---|---|
| Metronidazole | STR-INJ-001 | 500mg/100ml | $8.50 | 2027-03-31 |
| Levofloxacin | STR-INJ-002 | 500mg/100ml, 200mg/100ml | $12.40 | 2027-05-15 |
| Ciprofloxacin | STR-INJ-003 | 200mg/100ml | $7.90 | 2027-04-22 |

### IV Infusions (cat: infusion)
| Name | Code | Dose | Price | Expiry |
|---|---|---|---|---|
| D-Fructose-1,6-Diphosphate | STR-IV-001 | 5g, 2g | $14.80 | 2027-08-10 |
| Paracetamol IV | STR-IV-002 | 1g/100ml | $6.20 | 2027-06-30 |
| Gentamicin | STR-IV-003 | 40mg/ml | $9.30 | 2027-09-12 |
| Vancomycin | STR-IV-004 | 500mg | $13.60 | 2027-07-25 |
| Meropenem | STR-IV-005 | 1g | $14.50 | 2027-10-08 |
| Co-trimoxazole IV | STR-IV-006 | 40mg/200mg per 5ml | $7.10 | 2027-05-18 |

### Oral Suspensions (cat: oral)
| Name | Code | Dose | Price | Expiry |
|---|---|---|---|---|
| Amoxicillin | STR-OR-001 | 250mg/5ml | $5.40 | 2027-11-20 |
| Cefixime | STR-OR-002 | 100mg/5ml | $6.80 | 2027-09-30 |
| Azithromycin | STR-OR-003 | 200mg/5ml | $7.50 | 2027-08-15 |
| Clarithromycin | STR-OR-004 | 125mg/5ml | $7.20 | 2027-07-12 |
| Cephalexin | STR-OR-005 | 250mg/5ml | $5.90 | 2027-06-28 |
| Doxycycline | STR-OR-006 | 100mg/5ml | $6.40 | 2027-04-30 |
| Erythromycin | STR-OR-007 | 200mg/5ml | $5.80 | 2027-10-05 |
| Fluconazole Oral | STR-OR-008 | 50mg/5ml | $8.90 | 2027-12-15 |
| Clindamycin Oral | STR-OR-009 | 75mg/5ml | $9.50 | 2027-08-22 |
| Nystatin | STR-OR-010 | 100,000 IU/ml | $5.60 | 2027-11-08 |

---

## Rules — What AI Must NEVER Do

1. **Never break the single-file architecture** — do not split index.html into multiple files without explicit instruction
2. **Never remove base64 image data** — the IMGS object in JavaScript contains all product images; never delete or shorten it
3. **Never change the domain** — always sterlingtonpharma.com
4. **Never make it look consumer/retail** — this is strictly B2B pharmaceutical
5. **Never add prices that say "free" or promotional language** — this is a B2B catalogue, not a shop
6. **Never use Comic Sans, Impact, or decorative fonts** — Inter and Playfair Display only
7. **Never push directly to main without testing** — always check the file opens correctly in browser first
8. **Never delete any of the 19 products** — only add or update
9. **Never change contact details** without explicit instruction from the owner
10. **Never add fake testimonials or reviews** — this is a serious pharmaceutical company

---

## Rules — What AI Should Always Do

1. **Maintain the gold + dark aesthetic** — all new sections must use the existing colour palette
2. **Keep Playfair Display for all headings** — with italic emphasis on key phrases
3. **Keep the eyebrow pattern** — small gold uppercase labels before every section title
4. **Keep all product modal specs** — Product Code, Category, Form, Shelf Life, Origin, Distribution
5. **Test in browser before committing** — open index.html in Safari/Chrome and verify it looks correct
6. **Write meaningful git commit messages** — e.g. "Add Ampicillin product to injectable section" not "update"
7. **Keep the file under 800KB** — if it grows larger, optimise images
8. **Preserve the contact form** — it must always be present and functional

---

## Git Workflow

```bash
# Check what changed
git status

# Stage all changes
git add .

# Commit with a clear message
git commit -m "Your clear description of what changed"

# Push to GitHub (triggers Cloudflare auto-deploy)
git push origin main
```

**Branch strategy:** Work on `main` only for now. When the project grows, create feature branches.

---

## Cloudflare Pages Setup

- **Project connected to:** GitHub repo `nedirbek13-beep/sterlingtonpharma-`
- **Build command:** (none — static HTML file)
- **Output directory:** `/` (root)
- **Branch:** main
- **Custom domain:** sterlingtonpharma.com

Every `git push origin main` automatically deploys to sterlingtonpharma.com within 60 seconds.

---

## How to Add a New Product

When asked to add a new product, follow this exact pattern in the JavaScript products array:

```javascript
{
  n: "Product Name",
  cat: "inject",          // inject | infusion | oral
  lbl: "Category Label",
  ds: ["500mg/100ml"],    // array of dose strings
  fm: "Form description · volume",
  img: "imagekeyname",    // must exist in IMGS object
  price: "9.99",
  code: "STR-INJ-004",
  exp: "2027-12-31",
  desc: "Clinical description of the product and its indications."
}
```

If no image is available for a new product, ask the owner to provide one before adding it.

---

## Owner Notes

- Owner: Nedir (based in Edinburgh, Scotland / also connected to Turkmenistan)
- Owner has **no coding background** — explain changes in plain English
- Owner uses **MacBook Pro**
- Owner's Cursor is connected to GitHub
- Preferred communication: clear, direct, no jargon
- When making changes, always tell the owner: what you changed, why, and what to check in the browser

---

*Last updated: May 2026*
*Maintained by: Claude (Anthropic) via Cursor*
