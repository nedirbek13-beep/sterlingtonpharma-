#!/usr/bin/env node
/**
 * Sterlington static build (multilingual).
 *   node tools/build.mjs
 * Reads src/ (data, i18n dictionaries, partials, pages, templates) and writes the deployable
 * HTML to the repository root: English at /, other languages under /ru, /tk, /az.
 * No dependencies. Generated files are committed, so hosting needs no build step.
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
const LANGS = ['en', 'ru', 'tk', 'az'];
const dicts = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(read(path.join(SRC, 'i18n', `${l}.json`)))]));

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const attr = (s) => esc(s).replace(/\s+/g, ' ');
const fmt = (str, vars) => String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
/** plural-aware formatting: a string, or {one, few, many} chosen by `count` (Slavic rules; other languages use a plain string) */
const fmtCount = (tpl, count) => {
  if (typeof tpl === 'string') return fmt(tpl, { count });
  const n = Math.abs(count) % 100, n1 = n % 10;
  const form = n > 10 && n < 20 ? 'many' : n1 === 1 ? 'one' : n1 >= 2 && n1 <= 4 ? 'few' : 'many';
  return fmt(tpl[form] || tpl.many || tpl.one, { count });
};
const deepFmt = (v, vars) => (typeof v === 'string' ? fmt(v, vars) : Array.isArray(v) ? v.map((x) => deepFmt(x, vars)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepFmt(x, vars)])) : v);
function hexToRgb(hex) { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function rgbToHex([r, g, b]) { return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function luminance([r, g, b]) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function contrastOnWhite(rgb) { return 1.05 / (luminance(rgb) + 0.05); }
function inkFor(hex) { let rgb = hexToRgb(hex); let n = 0; while (contrastOnWhite(rgb) < 4.6 && n < 40) { rgb = rgb.map((v) => v * 0.93); n++; } return rgbToHex(rgb); }
function pngSize(file) { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
function jpgSize(file) { const b = fs.readFileSync(file); let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xc3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }; i += 2 + b.readUInt16BE(i + 2); } return { w: 0, h: 0 }; }
function minifyCss(css) { return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim(); }
const writeOut = (rel, html) => { const out = path.join(ROOT, rel); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, html); };

for (const p of products) {
  p.ink = inkFor(p.accent);
  p.cut = pngSize(path.join(ROOT, 'assets/products', `${p.slug}-cut.png`));
  p.cutSmall = pngSize(path.join(ROOT, 'assets/products', `${p.slug}-cut-s.png`));
  p.full = jpgSize(path.join(ROOT, 'assets/products', `${p.slug}.jpg`));
}
const counts = { cat: {}, form: {} };
for (const p of products) { counts.cat[p.cat] = (counts.cat[p.cat] || 0) + 1; counts.form[p.form] = (counts.form[p.form] || 0) + 1; }

/* ---------- tiny template engine ---------- */
const partials = {};
for (const f of fs.readdirSync(path.join(SRC, 'partials'))) partials[f.replace(/\.html$/, '')] = read(path.join(SRC, 'partials', f));
function render(tpl, vars, depth = 0) {
  if (depth > 8) throw new Error('partial recursion');
  tpl = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => { if (!(name in partials)) throw new Error(`missing partial ${name}`); return render(partials[name], vars, depth + 1); });
  tpl = tpl.replace(/\{\{\{\s*([\w.-]+)\s*\}\}\}/g, (_, k) => lookup(vars, k));
  tpl = tpl.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => esc(lookup(vars, k)));
  return tpl;
}
function lookup(vars, key) {
  const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), vars);
  if (v === undefined) throw new Error(`missing variable {{${key}}}`);
  return v;
}

/* ---------- per-language context ---------- */
function langContext(lang) {
  const dict = dicts[lang];
  const base = lang === 'en' ? '' : `/${lang}`;
  const home = base || '/';
  const companyLink = `<a href="${site.companiesHouseUrl}" rel="noopener" target="_blank">${site.companyNumber}</a>`;
  const globals = { n: products.length, year: site.year, legalName: site.legalName, companyNumber: site.companyNumber, companyLink, jurisdiction: dict.meta.jurisdiction || site.jurisdiction, phone: site.phone, email: site.email, director: site.director, registeredOffice: site.registeredOffice, solution: counts.form.solution, powder: counts.form.powder, suspension: counts.form.suspension, base, incorporated: dict.meta.dateIncorporated };
  const t = deepFmt(dict, globals);
  const en = deepFmt(dicts.en, globals);
  // localized product view
  const L = products.map((p) => {
    const pt = (t.data.products && t.data.products[p.slug]) || {};
    const formT = t.data.forms[p.form] || en.data.forms[p.form];
    const catT = t.data.categories[p.cat] || en.data.categories[p.cat];
    return { ...p, formLabel: formT.label, formPlural: formT.plural, presentation: formT.presentation, route: formT.route, catLabel: catT.label, catBlurb: catT.blurb,
      classLabel: (t.data.classes && t.data.classes[p.class]) || p.class, desc: pt.desc || p.desc, inn: pt.inn || '', formTextL: pt.formText || p.formText, url: `${base}/products/${p.slug}` };
  });
  return { lang, dict, base, home, t, en, globals, L, jurisdiction: globals.jurisdiction };
}

/* ---------- product HTML fragments ---------- */
const picture = (p, { cut = true, lazy = true, sizes = '(max-width: 640px) 30vw, 130px', priority = false, cls = '' } = {}) => {
  const base = `/assets/products/${p.slug}${cut ? '-cut' : ''}`;
  const size = cut ? p.cut : p.full;
  const loading = priority ? 'fetchpriority="high" decoding="sync"' : (lazy ? 'loading="lazy" decoding="async"' : 'decoding="async"');
  const alt = `${attr(p.name)} ${attr(p.strengths[0])} ${attr(p.formLabel.toLowerCase())}`;
  if (!cut) return `<picture><source type="image/webp" srcset="${base}.webp"><img class="${cls}" src="${base}.jpg" width="${size.w}" height="${size.h}" alt="${alt}" ${loading}></picture>`;
  const set = (ext) => `${base}-s.${ext} ${p.cutSmall.w}w, ${base}.${ext} ${size.w}w`;
  return `<picture><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img class="${cls}" src="${base}.png" srcset="${set('png')}" sizes="${sizes}" width="${size.w}" height="${size.h}" alt="${alt}" ${loading}></picture>`;
};
const arrow = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h9M7.5 3.5 11 7l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const formTagHtml = (p, t) => `<span>${esc(p.formLabel)}</span><span class="pcard-tag-size"> · ${p.form === 'powder' ? esc(t.common.vial) : esc(p.pack)}</span>`;

function productCard(p, ctx, { lazy = true, tag = 'h3' } = {}) {
  const { t } = ctx;
  return `<article class="pcard pcard--${p.form}" data-product data-name="${attr(p.name)}" data-active="${attr(p.active)} ${attr(p.inn)}" data-cat="${p.cat}" data-form="${p.form}" data-class="${attr(p.class)}" data-code="${p.code}" data-strengths="${attr(p.strengths.join(' '))}" style="--p:${p.accent};--p-ink:${p.ink}">
  <a class="pcard-link" href="${p.url}">
    <div class="pcard-stage" aria-hidden="true"><span class="pcard-facets"></span>${picture(p, { lazy, cls: 'pcard-img' })}<span class="pcard-tag">${formTagHtml(p, t)}</span></div>
    <div class="pcard-body">
      <p class="pcard-class">${esc(p.classLabel)}</p>
      <${tag} class="pcard-name">${esc(p.name)}</${tag}>
      <p class="pcard-meta"><span class="pcard-strength">${esc(p.strengths.join(' · '))}</span><span class="pcard-form">${esc(p.formLabel)}</span></p>
    </div>
    <div class="pcard-foot"><span class="pcard-code">${esc(p.code)}</span><span class="pcard-cta"><span>${esc(t.common.viewProduct)}</span>${arrow}</span></div>
  </a>
</article>`;
}
function catalogueSections(ctx) {
  const { t, L } = ctx;
  return Object.keys(data.categories).map((key, i) => {
    const list = L.filter((p) => p.cat === key);
    return `<section class="cat-block" id="${key}" data-cat-block="${key}" aria-labelledby="cat-${key}">
  <header class="cat-head" data-reveal>
    <p class="eyebrow">${esc(fmt(t.products.categoryN, { num: `0${i + 1}` }))} · <span data-cat-count="${key}">${list.length}</span> ${esc(t.products.productsWord)}</p>
    <h2 class="h-section" id="cat-${key}">${esc(list[0].catLabel)}</h2>
    <p class="lead">${esc(list[0].catBlurb)}</p>
  </header>
  <div class="pgrid" data-grid>
    ${list.map((p) => productCard(p, ctx)).join('\n    ')}
  </div>
</section>`;
  }).join('\n');
}
const featuredSlugs = ['meropenem', 'amoxicillin', 'ciprofloxacin', 'cephalexin', 'vancomycin', 'azithromycin'];
function heroPacks(ctx) {
  const order = ['levofloxacin', 'cephalexin', 'meropenem', 'amoxicillin', 'ciprofloxacin'];
  return order.map((s, i) => { const p = ctx.L.find((x) => x.slug === s); return `<div class="hero-pack hero-pack--${i + 1}" style="--p:${p.accent}" data-depth="${[0.5, 0.8, 1.2, 1, 0.7][i]}">${picture(p, { lazy: i !== 2, priority: i === 2, cls: 'hero-pack-img', sizes: '(max-width: 900px) 34vw, 180px' })}</div>`; }).join('\n');
}
const tileImg = (slug) => { const p = products.find((x) => x.slug === slug); return `<img src="/assets/products/${slug}-cut-s.png" srcset="/assets/products/${slug}-cut-s.webp ${p.cutSmall.w}w, /assets/products/${slug}-cut.webp ${p.cut.w}w" sizes="90px" width="${p.cut.w}" height="${p.cut.h}" alt="" loading="lazy" decoding="async">`; };

/* ---------- pages ---------- */
const pagesDir = path.join(SRC, 'pages');
const pageSources = fs.readdirSync(pagesDir).filter((x) => x.endsWith('.html')).map((f) => { const src = read(path.join(pagesDir, f)); const m = src.match(/^<!--meta\s*([\s\S]*?)-->/); if (!m) throw new Error(`page ${f} has no meta block`); return { file: f, meta: JSON.parse(m[1]), body: src.slice(m[0].length).trim() }; });
const productTpl = read(path.join(SRC, 'templates/product.html'));
const urlFor = (lang, pathname) => site.domain + (lang === 'en' ? '' : `/${lang}`) + (pathname === '/' ? (lang === 'en' ? '/' : '/') : pathname);
const alternatesHtml = (pathname) => LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${urlFor(l, pathname)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${urlFor('en', pathname)}">`;
const langLinksHtml = (lang, pathname, cls) => LANGS.map((l) => { const d = dicts[l].meta; const cur = l === lang; return `<li><a class="${cls}${cur ? ' is-current' : ''}" href="${(l === 'en' ? '' : `/${l}`) + (pathname === '/' ? (l === 'en' ? '/' : '/') : pathname)}" lang="${d.htmlLang}" hreflang="${l}"${cur ? ' aria-current="true"' : ''}><span class="lang-abbr">${l.toUpperCase()}</span><span class="lang-name">${esc(d.nativeName)}</span></a></li>`; }).join('');
const fontPreloads = { ru: '<link rel="preload" href="/assets/fonts/source-serif-4-normal-cyrillic.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="/assets/fonts/inter-normal-cyrillic.woff2" as="font" type="font/woff2" crossorigin>', tk: '<link rel="preload" href="/assets/fonts/source-serif-4-normal-latin-ext.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="/assets/fonts/inter-normal-latin-ext.woff2" as="font" type="font/woff2" crossorigin>', az: '<link rel="preload" href="/assets/fonts/source-serif-4-normal-latin-ext.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="/assets/fonts/inter-normal-latin-ext.woff2" as="font" type="font/woff2" crossorigin>', en: '' };

function baseVars(ctx, page) {
  const { lang, t, base, home, L } = ctx;
  const navKeys = ['products', 'quality', 'company', 'partners', 'contact'];
  const nav = {}; for (const k of navKeys) nav[`nav_${k}`] = page.nav === k ? ' is-active" aria-current="page' : '';
  const pathname = page.path;
  const i18nJson = JSON.stringify({ lang, base, catalogue: t.catalogue, form: { errRequired: t.form.errRequired, errEmail: t.form.errEmail, errShort: t.form.errShort, errConsent: t.form.errConsent, errCheck: t.form.errCheck, errSend: t.form.errSend, successTitle: t.form.successTitle, successBody: t.form.successBody, sendAnother: t.form.sendAnother, mailSubject: t.form.mailSubject }, menuOpen: t.common.menuOpen, menuClose: t.common.menuClose });
  return {
    site, page, t, lang, langUpper: lang.toUpperCase(), locale: t.meta.locale, base, home, year: site.year, today, jurisdiction: ctx.jurisdiction, ...nav,
    canonical: urlFor(lang, pathname), ogImage: site.domain + '/assets/img/og-image.jpg', alternates: alternatesHtml(pathname),
    langLinks: langLinksHtml(lang, pathname, 'lang-link'), langLinksMobile: langLinksHtml(lang, pathname, 'mobile-lang-link'),
    fontPreloads: fontPreloads[lang], i18nJson,
    productCount: products.length, countInject: counts.cat.inject, countInfusion: counts.cat.infusion, countOral: counts.cat.oral,
    countSolution: counts.form.solution, countPowder: counts.form.powder, countSuspension: counts.form.suspension,
    fmtSolutionCount: fmtCount(t.home.fmtProducts, counts.form.solution), fmtPowderCount: fmtCount(t.home.fmtProducts, counts.form.powder), fmtSuspensionCount: fmtCount(t.home.fmtProducts, counts.form.suspension),
    navCategories: Object.keys(data.categories).map((k) => `<li><a href="${base}/products#${k}"><span>${esc(t.data.categories[k].label)}</span><span class="nav-count">${counts.cat[k]}</span></a></li>`).join(''),
    footerCategories: Object.keys(data.categories).map((k) => `<li><a href="${base}/products#${k}">${esc(t.data.categories[k].label)}</a></li>`).join(''),
    productOptions: L.map((p) => `<option value="${p.slug}">${esc(p.name)} — ${esc(p.strengths[0])}</option>`).join(''),
    catalogueSections: catalogueSections(ctx), featuredCards: featuredSlugs.map((s) => productCard(L.find((p) => p.slug === s), ctx)).join('\n'), heroPacks: heroPacks(ctx),
    tileSolution: tileImg('ciprofloxacin') + tileImg('paracetamol-iv'), tilePowder: tileImg('meropenem') + tileImg('vancomycin'), tileSuspension: tileImg('amoxicillin') + tileImg('cephalexin'),
    bodyClass: page.bodyClass || '', headerTheme: page.headerTheme || 'light', extraHead: page.extraHead || '', extraScripts: page.extraScripts || '', jsonLd: page.jsonLd || '',
  };
}
const orgJsonLd = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: site.legalName, alternateName: site.name, url: site.domain + '/', logo: site.domain + '/assets/img/logo@2x.png', email: site.email, telephone: site.phone, address: { '@type': 'PostalAddress', streetAddress: '50 Princes Street', addressLocality: 'Ipswich', postalCode: 'IP1 1RJ', addressCountry: 'GB' }, identifier: { '@type': 'PropertyValue', propertyID: 'Companies House', value: site.companyNumber }, sameAs: [site.companiesHouseUrl] });

const urlList = []; // { path, priority }
let written = 0;
for (const lang of LANGS) {
  const ctx = langContext(lang);
  const { t, L, base } = ctx;
  const outPrefix = lang === 'en' ? '' : `${lang}/`;
  for (const pg of pageSources) {
    const page = { ...pg.meta, title: t[pg.meta.i18n].title, description: t[pg.meta.i18n].description };
    const vars = baseVars(ctx, page);
    vars.t.catalogue.showingAllText = fmt(t.catalogue.showingAll, { total: products.length });
    if (page.path === '/') vars.jsonLd = `<script type="application/ld+json">${orgJsonLd}</script>`;
    const html = render(partials.layout, { ...vars, content: render(pg.body, vars) });
    writeOut(outPrefix + page.out, html); written++;
    if (!page.noindex && lang === 'en') urlList.push({ path: page.path, priority: page.priority || '0.7' });
  }
  for (const p of L) {
    const related = L.filter((x) => x.cat === p.cat && x.slug !== p.slug).slice(0, 3);
    const others = related.length < 3 ? L.filter((x) => x.form === p.form && x.cat !== p.cat && x.slug !== p.slug).slice(0, 3 - related.length) : [];
    const pv = { name: p.name, active: p.active, strength: p.strengths[0], strengths: p.strengths.join(', '), form: p.formLabel.toLowerCase(), formText: p.formTextL, code: p.code, category: p.catLabel, presentation: p.presentation, pack: p.pack };
    const page = { title: fmt(t.product.title, pv), description: fmt(t.product.description, pv), path: `/products/${p.slug}`, nav: 'products', bodyClass: `page-product form-${p.form}`, priority: '0.8' };
    const specRows = [
      [t.product.rowBrand, esc(t.product.rowBrandValue)], [t.product.rowName, esc(p.name)], [t.product.rowActive, esc(p.active) + (p.inn ? ` <span class="spec-note">(${esc(p.inn)})</span>` : '')], [t.product.rowStrength, esc(p.strengths.join(' · '))],
      [t.product.rowForm, `${esc(p.formLabel)} <span class="spec-note">(${esc(p.formTextL)})</span>`], [t.product.rowRoute, esc(p.route)],
      [t.product.rowPack, p.form === 'powder' ? esc(fmt(t.product.rowPackPowder, pv)) : `${esc(p.pack)} — ${esc(p.presentation)}`],
      [t.product.rowCode, `<code>${p.code}</code>`], [t.product.rowCategory, esc(p.catLabel)], [t.product.rowClass, esc(p.classLabel)], [t.product.rowSupply, esc(t.product.rowSupplyValue)],
    ];
    const productJsonLd = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: `${p.name} ${p.strengths[0]}`, alternateName: `${site.brandLine} ${p.name}`, sku: p.code, brand: { '@type': 'Brand', name: site.brandLine }, manufacturer: { '@type': 'Organization', name: site.legalName }, image: site.domain + `/assets/products/${p.slug}.jpg`, description: fmt(t.product.description, pv), category: p.catLabel, url: urlFor(lang, page.path), audience: { '@type': 'MedicalAudience', audienceType: 'Healthcare professionals and licensed distributors' } });
    const vars = { ...baseVars(ctx, page), p, accent: p.accent, ink: p.ink, catLabel: p.catLabel, classLabel: p.classLabel, activeLabel: p.inn ? `${p.active} · ${p.inn}` : p.active, desc: p.desc,
      packPicture: picture(p, { lazy: false, priority: true, cls: 'pd-img', sizes: '(max-width: 900px) 50vw, 200px' }),
      specRows: specRows.map(([k, v]) => `<div class="spec-row"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('\n'),
      strengthChips: p.strengths.map((s, i) => `<span class="chip chip--static${i === 0 ? ' is-on' : ''}">${esc(s)}</span>`).join(''),
      relatedCards: [...related, ...others].map((x) => productCard(x, ctx)).join('\n'), formTag: formTagHtml(p, t), relatedTitle: fmt(t.product.relatedTitle, pv),
      jsonLd: `<script type="application/ld+json">${productJsonLd}</script>`, catAnchor: `${base}/products#${p.cat}` };
    const html = render(partials.layout, { ...vars, content: render(productTpl, vars) });
    writeOut(`${outPrefix}products/${p.slug}.html`, html); written++;
    if (lang === 'en') urlList.push({ path: page.path, priority: '0.8' });
  }
}

/* ---------- css bundle ---------- */
const cssBundle = minifyCss(read(path.join(ROOT, 'assets/css/fonts.css')) + '\n' + read(path.join(ROOT, 'assets/css/site.css')));
fs.writeFileSync(path.join(ROOT, 'assets/css/site.min.css'), cssBundle);

/* ---------- sitemap (all languages, with hreflang alternates) ---------- */
const entries = [];
for (const u of urlList) for (const l of LANGS) entries.push(`  <url><loc>${urlFor(l, u.path)}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority>\n${LANGS.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${urlFor(a, u.path)}"/>`).join('\n')}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor('en', u.path)}"/>\n  </url>`);
writeOut('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`);
console.log(`built ${written} pages in ${LANGS.length} languages, ${entries.length} sitemap URLs, css ${(cssBundle.length / 1024).toFixed(1)}KB`);
