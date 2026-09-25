/* Sterlington catalogue: search + filters over the pre-rendered product cards. */
(function () {
  'use strict';
  const toolbar = document.querySelector('[data-toolbar]');
  if (!toolbar) return;
  const q = toolbar.querySelector('[data-filter-q]');
  const cats = toolbar.querySelectorAll('[data-filter-cat] input');
  const form = toolbar.querySelector('[data-filter-form]');
  const klass = toolbar.querySelector('[data-filter-class]');
  const count = toolbar.querySelector('[data-count]');
  const resets = document.querySelectorAll('[data-filter-reset]');
  const empty = document.querySelector('[data-empty]');
  const cards = Array.from(document.querySelectorAll('[data-product]'));
  const blocks = Array.from(document.querySelectorAll('[data-cat-block]'));
  const total = cards.length;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const classKey = (label) => { const l = norm(label); if (l.includes('antibiotic')) return 'antibiotic'; if (l.includes('antifungal')) return 'antifungal'; if (l.includes('analgesic')) return 'analgesic'; if (l.includes('metabolic')) return 'metabolic'; return 'other'; };
  cards.forEach((c) => { c.dataset.hay = norm([c.dataset.name, c.dataset.active, c.dataset.code, c.dataset.class, c.dataset.strengths].join(' ')); c.dataset.ck = classKey(c.dataset.class); });

  const state = () => ({ q: norm(q.value.trim()), cat: Array.from(cats).find((r) => r.checked)?.value || '', form: form.value, ck: klass.value });
  let timer = 0;
  function apply(push) {
    const s = state();
    let shown = 0;
    const perBlock = {};
    cards.forEach((c) => {
      const ok = (!s.q || c.dataset.hay.includes(s.q)) && (!s.cat || c.dataset.cat === s.cat) && (!s.form || c.dataset.form === s.form) && (!s.ck || c.dataset.ck === s.ck);
      if (ok) { shown++; perBlock[c.dataset.cat] = (perBlock[c.dataset.cat] || 0) + 1; }
      setVisible(c, ok);
    });
    blocks.forEach((b) => {
      const n = perBlock[b.dataset.catBlock] || 0;
      b.classList.toggle('is-empty', n === 0);
      const counter = b.querySelector('[data-cat-count]'); if (counter) counter.textContent = n;
    });
    count.textContent = shown === total ? `Showing all ${total} products` : `Showing ${shown} of ${total} products`;
    empty.hidden = shown !== 0;
    const active = !!(s.q || s.cat || s.form || s.ck);
    resets.forEach((r) => { if (r.closest('[data-toolbar]')) r.hidden = !active; });
    if (push) {
      const u = new URL(location.href);
      ['q', 'cat', 'form', 'class'].forEach((k) => u.searchParams.delete(k));
      if (s.q) u.searchParams.set('q', q.value.trim()); if (s.cat) u.searchParams.set('cat', s.cat); if (s.form) u.searchParams.set('form', s.form); if (s.ck) u.searchParams.set('class', s.ck);
      history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
    }
  }
  function setVisible(card, ok) {
    if (ok) { card.hidden = false; requestAnimationFrame(() => card.classList.remove('is-filtered')); }
    else if (!card.hidden) {
      card.classList.add('is-filtered');
      if (reduceMotion.matches) card.hidden = true; else setTimeout(() => { if (card.classList.contains('is-filtered')) card.hidden = true; }, 260);
    }
  }
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => apply(true), 140); });
  cats.forEach((r) => r.addEventListener('change', () => apply(true)));
  form.addEventListener('change', () => apply(true));
  klass.addEventListener('change', () => apply(true));
  toolbar.addEventListener('submit', (e) => { e.preventDefault(); apply(true); });
  resets.forEach((r) => r.addEventListener('click', (e) => { e.preventDefault(); q.value = ''; cats[0].checked = true; form.value = ''; klass.value = ''; apply(true); q.focus(); }));
  // initial state from URL (?form=solution, ?cat=oral, ?q=amox, ?class=antifungal)
  const p = new URLSearchParams(location.search);
  if (p.get('q')) q.value = p.get('q');
  if (p.get('cat')) { const r = Array.from(cats).find((x) => x.value === p.get('cat')); if (r) r.checked = true; }
  if (p.get('form') && Array.from(form.options).some((o) => o.value === p.get('form'))) form.value = p.get('form');
  if (p.get('class') && Array.from(klass.options).some((o) => o.value === p.get('class'))) klass.value = p.get('class');
  apply(false);
})();
