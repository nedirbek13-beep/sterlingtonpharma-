#!/usr/bin/env node
/**
 * Sterlington static build.
 *   node tools/build.mjs
 * Reads src/ (data, partials, pages, templates) and writes the deployable
 * HTML to the repository root: index.html, products.html, products/<slug>.html,
 * quality.html, partners.html, company.html, contact.html, privacy.html,
 * legal.html, 404.html, sitemap.xml.
 * No dependencies. The generated files are committed, so hosting needs no build step.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const read = (p) => fs.readFileSync(p, 'utf8');
const site = JSON.parse(read(path.join(SRC, 'data/site.json')));
const data = JSON.parse(read(path.join(SRC, 'data/products.json')));
const products = data.products;
const today = new Date().toISOString().slice(0, 10);

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const attr = (s) => esc(s).replace(/\s+/g, ' ');
function hexToRgb(hex) { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function rgbToHex([r, g, b]) { return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function luminance([r, g, b]) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function contrastOnWhite(rgb) { return 1.05 / (luminance(rgb) + 0.05); }
/** darken an accent until it reaches >= 4.6:1 on white, so it can be used for text */
function inkFor(hex) { let rgb = hexToRgb(hex); let n = 0; while (contrastOnWhite(rgb) < 4.6 && n < 40) { rgb = rgb.map((v) => v * 0.93); n++; } return rgbToHex(rgb); }
function minifyCss(css) { return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim(); }
function pngSize(file) { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
function jpgSize(file) { const b = fs.readFileSync(file); let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xc3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }; i += 2 + b.readUInt16BE(i + 2); } return { w: 0, h: 0 }; }

for (const p of products) {
  p.ink = inkFor(p.accent);
  p.cut = pngSize(path.join(ROOT, 'assets/products', `${p.slug}-cut.png`));
  p.cutSmall = pngSize(path.join(ROOT, 'assets/products', `${p.slug}-cut-s.png`));
  p.full = jpgSize(path.join(ROOT, 'assets/products', `${p.slug}.jpg`));
  p.formLabel = data.forms[p.form].label;
  p.route = data.forms[p.form].route;
  p.catLabel = data.categories[p.cat].label;
  p.url = `/products/${p.slug}`;
  p.title = `${p.name} ${p.strengths[0]} — ${p.formLabel}`;
}
const counts = { cat: {}, form: {} };
for (const p of products) { counts.cat[p.cat] = (counts.cat[p.cat] || 0) + 1; counts.form[p.form] = (counts.form[p.form] || 0) + 1; }

/* ---------- tiny template engine ---------- */
const partials = {};
for (const f of fs.readdirSync(path.join(SRC, 'partials'))) partials[f.replace(/\.html$/, '')] = read(path.join(SRC, 'partials', f));

function render(tpl, vars, depth = 0) {
  if (depth > 8) throw new Error('partial recursion');
  tpl = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => { if (!(name in partials)) throw new Error(`missing partial ${name}`); return render(partials[name], vars, depth + 1); });
  tpl = tpl.replace(/\{\{\{\s*([\w.-]+)\s*\}\}\}/g, (_, k) => lookup(vars, k, true));
  tpl = tpl.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => esc(lookup(vars, k, false)));
  return tpl;
}
function lookup(vars, key, raw) {
  const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), vars);
  if (v === undefined) throw new Error(`missing variable {{${key}}}`);
  return v;
}

/* ---------- product HTML fragments ---------- */
const picture = (p, { cut = true, lazy = true, sizes = '(max-width: 640px) 30vw, 130px', priority = false, cls = '' } = {}) => {
  const base = `/assets/products/${p.slug}${cut ? '-cut' : ''}`;
  const size = cut ? p.cut : p.full;
  const fallback = cut ? 'png' : 'jpg';
  const loading = priority ? 'fetchpriority="high" decoding="sync"' : (lazy ? 'loading="lazy" decoding="async"' : 'decoding="async"');
  const alt = `${attr(p.name)} ${attr(p.strengths[0])} ${attr(p.formLabel.toLowerCase())} pack`;
  if (!cut) return `<picture><source type="image/webp" srcset="${base}.webp"><img class="${cls}" src="${base}.${fallback}" width="${size.w}" height="${size.h}" alt="${alt}" ${loading}></picture>`;
  const small = p.cutSmall;
  const set = (ext) => `${base}-s.${ext} ${small.w}w, ${base}.${ext} ${size.w}w`;
  return `<picture><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img class="${cls}" src="${base}.png" srcset="${set('png')}" sizes="${sizes}" width="${size.w}" height="${size.h}" alt="${alt}" ${loading}></picture>`;
};

function productCard(p, { lazy = true, tag = 'h3' } = {}) {
  const formTag = `<span>${esc(p.formLabel)}</span><span class="pcard-tag-size"> · ${p.form === 'powder' ? 'Vial' : esc(p.pack)}</span>`;
  return `<article class="pcard pcard--${p.form}" data-product data-name="${attr(p.name)}" data-active="${attr(p.active)}" data-cat="${p.cat}" data-form="${p.form}" data-class="${attr(p.class)}" data-code="${p.code}" data-strengths="${attr(p.strengths.join(' '))}" style="--p:${p.accent};--p-ink:${p.ink}">
  <a class="pcard-link" href="${p.url}">
    <div class="pcard-stage" aria-hidden="true"><span class="pcard-facets"></span>${picture(p, { lazy, cls: 'pcard-img' })}<span class="pcard-tag">${formTag}</span></div>
    <div class="pcard-body">
      <p class="pcard-class">${esc(p.class)}</p>
      <${tag} class="pcard-name">${esc(p.name)}</${tag}>
      <p class="pcard-meta"><span class="pcard-strength">${esc(p.strengths.join(' · '))}</span><span class="pcard-form">${esc(p.formLabel)}</span></p>
    </div>
    <div class="pcard-foot"><span class="pcard-code">${esc(p.code)}</span><span class="pcard-cta"><span>View product</span><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h9M7.5 3.5 11 7l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>
  </a>
</article>`;
}

function catalogueSections() {
  return Object.entries(data.categories).map(([key, c], i) => {
    const list = products.filter((p) => p.cat === key);
    return `<section class="cat-block" id="${key}" data-cat-block="${key}" aria-labelledby="cat-${key}">
  <header class="cat-head" data-reveal>
    <p class="eyebrow">Category 0${i + 1} · <span data-cat-count="${key}">${list.length}</span> products</p>
    <h2 class="h-section" id="cat-${key}">${esc(c.label)}</h2>
    <p class="lead">${esc(c.blurb)}</p>
  </header>
  <div class="pgrid" data-grid>
    ${list.map((p) => productCard(p)).join('\n    ')}
  </div>
</section>`;
  }).join('\n');
}

const featuredSlugs = ['meropenem', 'amoxicillin', 'ciprofloxacin', 'cephalexin', 'vancomycin', 'azithromycin'];
const featuredCards = featuredSlugs.map((s) => productCard(products.find((p) => p.slug === s))).join('\n');

function heroPacks() {
  // The composition: five packs, back row to front row. Order = visual stacking.
  const order = ['levofloxacin', 'cephalexin', 'meropenem', 'amoxicillin', 'ciprofloxacin'];
  return order.map((s, i) => {
    const p = products.find((x) => x.slug === s);
    return `<div class="hero-pack hero-pack--${i + 1}" style="--p:${p.accent}" data-depth="${[0.5, 0.8, 1.2, 1, 0.7][i]}">${picture(p, { lazy: i !== 2, priority: i === 2, cls: 'hero-pack-img', sizes: '(max-width: 900px) 34vw, 180px' })}</div>`;
  }).join('\n');
}

const navCategories = Object.entries(data.categories).map(([k, c]) => `<li><a href="/products#${k}"><span>${esc(c.label)}</span><span class="nav-count">${counts.cat[k]}</span></a></li>`).join('');
const footerCategories = Object.entries(data.categories).map(([k, c]) => `<li><a href="/products#${k}">${esc(c.label)}</a></li>`).join('');
const productOptions = products.map((p) => `<option value="${p.slug}">${esc(p.name)} — ${esc(p.strengths[0])}</option>`).join('');

/* ---------- pages ---------- */
const pagesDir = path.join(SRC, 'pages');
const pageList = [];
function baseVars(page) {
  const navKeys = ['products', 'quality', 'company', 'partners', 'contact'];
  const nav = {};
  for (const k of navKeys) nav[`nav_${k}`] = page.nav === k ? ' is-active" aria-current="page' : '';
  return {
    site, page, year: site.year, today, ...nav,
    canonical: site.domain + (page.path === '/' ? '/' : page.path),
    ogImage: site.domain + '/assets/img/og-image.jpg',
    productCount: products.length,
    countInject: counts.cat.inject, countInfusion: counts.cat.infusion, countOral: counts.cat.oral,
    countSolution: counts.form.solution, countPowder: counts.form.powder, countSuspension: counts.form.suspension,
    navCategories, footerCategories, productOptions,
    catalogueSections: catalogueSections(), featuredCards, heroPacks: heroPacks(),
    bodyClass: page.bodyClass || '',
    headerTheme: page.headerTheme || 'light',
    extraHead: page.extraHead || '',
    extraScripts: page.extraScripts || '',
    jsonLd: page.jsonLd || '',
  };
}

function writeOut(rel, html) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log('wrote', rel, (html.length / 1024).toFixed(1) + 'KB');
}

const orgJsonLd = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Organization', name: site.legalName, alternateName: site.name, url: site.domain + '/',
  logo: site.domain + '/assets/img/logo@2x.png', email: site.email, telephone: site.phone,
  address: { '@type': 'PostalAddress', streetAddress: '50 Princes Street', addressLocality: 'Ipswich', postalCode: 'IP1 1RJ', addressCountry: 'GB' },
  identifier: { '@type': 'PropertyValue', propertyID: 'Companies House', value: site.companyNumber },
  sameAs: [site.companiesHouseUrl],
});

for (const f of fs.readdirSync(pagesDir).filter((x) => x.endsWith('.html'))) {
  const src = read(path.join(pagesDir, f));
  const m = src.match(/^<!--meta\s*([\s\S]*?)-->/);
  if (!m) throw new Error(`page ${f} has no meta block`);
  const page = JSON.parse(m[1]);
  const body = src.slice(m[0].length).trim();
  const vars = baseVars(page);
  if (page.path === '/') vars.jsonLd = `<script type="application/ld+json">${orgJsonLd}</script>`;
  const html = render(partials.layout, { ...vars, content: render(body, vars) });
  writeOut(page.out || f, html);
  if (!page.noindex) pageList.push({ loc: vars.canonical, priority: page.priority || '0.7' });
}

/* ---------- product pages ---------- */
const productTpl = read(path.join(SRC, 'templates/product.html'));
for (const p of products) {
  const related = products.filter((x) => x.cat === p.cat && x.slug !== p.slug).slice(0, 3);
  const others = related.length < 3 ? products.filter((x) => x.form === p.form && x.cat !== p.cat && x.slug !== p.slug).slice(0, 3 - related.length) : [];
  const page = { title: `${p.name} ${p.strengths[0]} ${p.formLabel} | SterliX by Sterlington Pharma`, description: `${p.name} (${p.active}) ${p.strengths.join(', ')}, ${p.formText}. Product code ${p.code}. B2B supply to hospitals and licensed distributors — documentation provided with orders.`, path: p.url, nav: 'products', bodyClass: `page-product form-${p.form}`, priority: '0.8' };
  const specRows = [
    ['Brand line', `${site.brandLine} — Sterlington product range`],
    ['Product name', p.name],
    ['Active ingredient (INN)', p.active],
    ['Strength', p.strengths.join(' · ')],
    ['Dosage form', `${p.formLabel} <span class="spec-note">(${esc(p.formText)})</span>`],
    ['Route of administration', p.route],
    ['Pack size / presentation', p.form === 'powder' ? `${data.forms.powder.presentation} — pack details on request` : `${p.pack} — ${data.forms[p.form].presentation}`],
    ['Product code', `<code>${p.code}</code>`],
    ['Category', p.catLabel],
    ['Therapeutic class', p.class],
    ['Supply', 'B2B wholesale only — hospitals, licensed distributors and institutional buyers'],
  ];
  const strengthChips = p.strengths.map((s, i) => `<span class="chip chip--static${i === 0 ? ' is-on' : ''}">${esc(s)}</span>`).join('');
  const productJsonLd = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: `${p.name} ${p.strengths[0]}`, alternateName: `${site.brandLine} ${p.name}`, sku: p.code, brand: { '@type': 'Brand', name: site.brandLine }, manufacturer: { '@type': 'Organization', name: site.legalName }, image: site.domain + `/assets/products/${p.slug}.jpg`, description: `${p.name} (${p.active}) ${p.strengths.join(', ')} — ${p.formText}. Supplied to licensed organisations only.`, category: p.catLabel, url: site.domain + p.url, audience: { '@type': 'MedicalAudience', audienceType: 'Healthcare professionals and licensed distributors' } });
  const vars = {
    ...baseVars(page), p, accent: p.accent, ink: p.ink,
    packPicture: picture(p, { lazy: false, priority: true, cls: 'pd-img', sizes: '(max-width: 900px) 50vw, 200px' }),
    packPictureFull: picture(p, { cut: false, lazy: true, cls: 'pd-img-full' }),
    specRows: specRows.map(([k, v]) => `<div class="spec-row"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('\n'),
    strengthChips,
    relatedCards: [...related, ...others].map((x) => productCard(x)).join('\n'),
    formTag: p.form === 'powder' ? `${p.formLabel} · Vial` : `${p.formLabel} · ${p.pack}`,
    jsonLd: `<script type="application/ld+json">${productJsonLd}</script>`,
    catAnchor: `/products#${p.cat}`,
  };
  const html = render(partials.layout, { ...vars, content: render(productTpl, vars) });
  writeOut(`products/${p.slug}.html`, html);
  pageList.push({ loc: vars.canonical, priority: '0.8' });
}

/* ---------- css bundle ---------- */
const cssBundle = minifyCss(read(path.join(ROOT, 'assets/css/fonts.css')) + '\n' + read(path.join(ROOT, 'assets/css/site.css')));
fs.writeFileSync(path.join(ROOT, 'assets/css/site.min.css'), cssBundle);
console.log('wrote assets/css/site.min.css', (cssBundle.length / 1024).toFixed(1) + 'KB');

/* ---------- sitemap ---------- */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pageList.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
writeOut('sitemap.xml', sitemap);
console.log(`done: ${pageList.length} URLs`);
