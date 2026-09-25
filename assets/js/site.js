/* Sterlington Pharma — site behaviour
   1. Precision Field (canvas motif derived from the pack facet geometry)
   2. Header state, product mega-menu, mobile menu (dialog, focus trap)
   3. Scroll reveals & pointer parallax
   4. Contact form: validation, loading, success and error states
*/
(function () {
  'use strict';
  if (/[?&]snap\b/.test(location.search)) document.documentElement.classList.add('snap');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- 1. Precision Field ---------- */
  class PrecisionField {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.color = canvas.dataset.fieldColor || '#0b5094';
      this.spacing = Number(canvas.dataset.fieldSpacing) || 96;
      this.alpha = Number(canvas.dataset.fieldAlpha || 1);
      this.rgb = PrecisionField.hexToRgb(this.color);
      this.t = 0; this.raf = 0; this.visible = false; this.running = false;
      this.resize = this.resize.bind(this);
      this.tick = this.tick.bind(this);
      this.ro = new ResizeObserver(this.resize);
      this.ro.observe(canvas.parentElement);
      this.io = new IntersectionObserver((entries) => {
        this.visible = entries[0].isIntersecting;
        if (this.visible) this.start(); else this.stop();
      }, { rootMargin: '80px' });
      this.io.observe(canvas);
      this.resize();
    }
    static hexToRgb(hex) { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
    resize() {
      const rect = this.c.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = Math.max(1, Math.round(rect.width)); this.h = Math.max(1, Math.round(rect.height));
      this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
      this.c.style.width = this.w + 'px'; this.c.style.height = this.h + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.build();
      this.draw();
    }
    build() {
      // Jittered triangular lattice: the pack facets are a low-poly field, the pack molecule is nodes + bonds.
      const s = this.spacing, cols = Math.ceil(this.w / s) + 2, rows = Math.ceil(this.h / (s * 0.866)) + 2;
      const seed = 7;
      const rand = PrecisionField.prng(seed);
      this.cols = cols; this.rows = rows;
      this.pts = [];
      for (let r = 0; r < rows; r++) {
        for (let q = 0; q < cols; q++) {
          const x = (q + (r % 2 ? 0.5 : 0)) * s - s;
          const y = r * s * 0.866 - s;
          this.pts.push({ x, y, jx: (rand() - 0.5) * s * 0.42, jy: (rand() - 0.5) * s * 0.42, ph: rand() * Math.PI * 2, sp: 0.6 + rand() * 0.8, node: rand() < 0.22, amp: s * (0.05 + rand() * 0.06) });
        }
      }
    }
    static prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    pos(p, t) {
      if (reduceMotion.matches) return [p.x + p.jx, p.y + p.jy];
      return [p.x + p.jx + Math.sin(t * p.sp + p.ph) * p.amp, p.y + p.jy + Math.cos(t * p.sp * 0.8 + p.ph) * p.amp];
    }
    draw() {
      const ctx = this.ctx, [r, g, b] = this.rgb, a = this.alpha, t = this.t;
      ctx.clearRect(0, 0, this.w, this.h);
      const cols = this.cols, rows = this.rows, P = this.pts;
      const xy = new Array(P.length);
      for (let i = 0; i < P.length; i++) xy[i] = this.pos(P[i], t);
      // facets (very faint alternating fills)
      ctx.lineWidth = 1;
      for (let rI = 0; rI < rows - 1; rI++) {
        for (let q = 0; q < cols - 1; q++) {
          const i = rI * cols + q, odd = rI % 2;
          const A = xy[i], B = xy[i + 1], C = xy[i + cols + (odd ? 1 : 0)], D = xy[i + cols + (odd ? 0 : -1 < 0 ? 0 : 0)];
          if (!A || !B || !C) continue;
          if ((rI + q) % 3 === 0) {
            ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath();
            ctx.fillStyle = `rgba(${r},${g},${b},${0.035 * a})`; ctx.fill();
          }
        }
      }
      // edges
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.16 * a})`;
      ctx.beginPath();
      for (let rI = 0; rI < rows; rI++) {
        for (let q = 0; q < cols; q++) {
          const i = rI * cols + q, A = xy[i];
          if (q < cols - 1) { const B = xy[i + 1]; ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); }
          if (rI < rows - 1) {
            const odd = rI % 2;
            const j1 = i + cols + (odd ? 0 : -1), j2 = i + cols + (odd ? 1 : 0);
            if (q > 0 || odd) { const C = xy[j1]; if (C) { ctx.moveTo(A[0], A[1]); ctx.lineTo(C[0], C[1]); } }
            if (q < cols - 1 || !odd) { const D = xy[j2]; if (D) { ctx.moveTo(A[0], A[1]); ctx.lineTo(D[0], D[1]); } }
          }
        }
      }
      ctx.stroke();
      // nodes (the molecule dots on the packs)
      for (let i = 0; i < P.length; i++) {
        if (!P[i].node) continue;
        const [x, y] = xy[i];
        const pulse = reduceMotion.matches ? 1 : 0.75 + 0.25 * Math.sin(t * 1.3 + P[i].ph);
        ctx.beginPath(); ctx.arc(x, y, 2.1 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.55 * a})`; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.18 * a * pulse})`; ctx.stroke();
      }
    }
    tick(now) {
      if (!this.running) return;
      if (this.last === undefined) this.last = now;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      this.t += dt * 0.45;
      this.draw();
      this.raf = requestAnimationFrame(this.tick);
    }
    start() {
      if (this.running || reduceMotion.matches) { this.draw(); return; }
      this.running = true; this.last = undefined; this.raf = requestAnimationFrame(this.tick);
    }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
  }
  const fields = [];
  document.querySelectorAll('canvas[data-field]').forEach((c) => fields.push(new PrecisionField(c)));
  reduceMotion.addEventListener('change', () => fields.forEach((f) => (reduceMotion.matches ? (f.stop(), f.draw()) : f.visible && f.start())));
  document.addEventListener('visibilitychange', () => fields.forEach((f) => (document.hidden ? f.stop() : f.visible && f.start())));

  /* ---------- 2. Header, menus ---------- */
  const header = document.querySelector('[data-site-header]');
  const setHeader = () => header && header.classList.toggle('is-solid', window.scrollY > 24);
  setHeader(); window.addEventListener('scroll', setHeader, { passive: true });

  document.querySelectorAll('[data-nav-menu]').forEach((item) => {
    const btn = item.querySelector('.nav-menu-btn');
    if (!btn) return;
    const open = (v) => { item.classList.toggle('is-open', v); btn.setAttribute('aria-expanded', String(v)); };
    btn.addEventListener('click', () => open(!item.classList.contains('is-open')));
    item.addEventListener('keydown', (e) => { if (e.key === 'Escape') { open(false); btn.focus(); } });
    document.addEventListener('click', (e) => { if (!item.contains(e.target)) open(false); });
    item.addEventListener('mouseleave', () => open(false));
  });

  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (toggle && menu) {
    let lastFocus = null;
    const focusables = () => Array.from(menu.querySelectorAll('a[href], button:not([disabled])'));
    const openMenu = () => {
      lastFocus = document.activeElement;
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      toggle.setAttribute('aria-expanded', 'true'); toggle.setAttribute('aria-label', 'Close menu');
      header.classList.add('is-open'); document.body.classList.add('menu-open');
      setTimeout(() => focusables()[0] && focusables()[0].focus(), 80);
    };
    const closeMenu = () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu');
      header.classList.remove('is-open'); document.body.classList.remove('menu-open');
      const done = () => { menu.hidden = true; };
      reduceMotion.matches ? done() : setTimeout(done, 320);
      if (lastFocus) lastFocus.focus();
    };
    toggle.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
    document.addEventListener('keydown', (e) => {
      if (menu.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
    window.matchMedia('(min-width: 1101px)').addEventListener('change', (m) => { if (m.matches && !menu.hidden) closeMenu(); });
  }

  /* ---------- 3. Reveals & parallax ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  revealEls.forEach((el) => { const d = el.dataset.revealDelay; if (d) el.style.setProperty('--d', d); });
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add('is-in'));

  if (finePointer.matches && !reduceMotion.matches) {
    document.querySelectorAll('[data-parallax]').forEach((stage) => {
      const section = stage.closest('section') || stage;
      let raf = 0, px = 0, py = 0;
      section.addEventListener('pointermove', (e) => {
        const r = section.getBoundingClientRect();
        px = ((e.clientX - r.left) / r.width - 0.5) * 2; py = ((e.clientY - r.top) / r.height - 0.5) * 2;
        if (!raf) raf = requestAnimationFrame(() => { stage.style.setProperty('--px', px.toFixed(3)); stage.style.setProperty('--py', py.toFixed(3)); raf = 0; });
      });
      section.addEventListener('pointerleave', () => { stage.style.setProperty('--px', '0'); stage.style.setProperty('--py', '0'); });
    });
  }

  /* ---------- 4. Contact form ---------- */
  document.querySelectorAll('[data-contact-form]').forEach((form) => {
    const status = form.querySelector('[data-status]');
    const submit = form.querySelector('[data-submit]');
    const started = form.querySelector('[data-started]');
    if (started) started.value = String(Date.now());
    // prefill from query string (?type=quotation&product=slug)
    const qs = new URLSearchParams(location.search);
    const setSel = (name, val) => { const el = form.elements[name]; if (el && val && Array.from(el.options).some((o) => o.value === val)) el.value = val; };
    setSel('type', qs.get('type')); setSel('product', qs.get('product'));
    if (qs.get('product') || qs.get('type')) { const h = document.getElementById('contact-form'); if (h && location.hash === '') h.scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'auto' : 'smooth' }); }

    const fields = Array.from(form.querySelectorAll('.fld-input[required], .fld-check[required]'));
    const messages = {
      valueMissing: 'This field is required.',
      typeMismatch: 'Enter a valid email address, e.g. name@company.com.',
      tooShort: 'Please add a little more detail (at least 20 characters).',
      consent: 'Please confirm you agree to the privacy policy.',
    };
    const errorFor = (el) => {
      let err = form.querySelector('#' + el.id + '-error');
      if (!err) { err = document.createElement('p'); err.className = 'fld-error'; err.id = el.id + '-error'; (el.closest('.fld') || el.parentNode).appendChild(err); }
      return err;
    };
    const validate = (el) => {
      const v = el.validity;
      let msg = '';
      if (el.type === 'checkbox') msg = el.checked ? '' : messages.consent;
      else if (v.valueMissing) msg = messages.valueMissing;
      else if (v.typeMismatch) msg = messages.typeMismatch;
      else if (v.tooShort) msg = messages.tooShort;
      const err = errorFor(el);
      err.textContent = msg;
      err.hidden = !msg;
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      const desc = [el.getAttribute('aria-describedby') || '', msg ? err.id : ''].join(' ').replace(err.id, '').trim();
      el.setAttribute('aria-describedby', (desc + (msg ? ' ' + err.id : '')).trim());
      if (!el.getAttribute('aria-describedby')) el.removeAttribute('aria-describedby');
      return !msg;
    };
    fields.forEach((el) => {
      el.addEventListener('blur', () => { if (el.value || el.type === 'checkbox') validate(el); });
      el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') validate(el); });
      el.addEventListener('change', () => { if (el.getAttribute('aria-invalid') === 'true') validate(el); });
    });
    const setStatus = (kind, html) => { status.className = 'form-status' + (kind ? ' is-' + kind : ''); status.innerHTML = html || ''; };
    const mailtoFallback = (data) => {
      const subject = encodeURIComponent(`Enquiry: ${data.type || 'general'} — ${data.organisation || ''}`);
      const body = encodeURIComponent(Object.entries(data).filter(([k]) => !['website', 'started', 'consent'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('\n'));
      return `mailto:info@sterlingtonpharma.com?subject=${subject}&body=${body}`;
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ok = fields.map(validate).every(Boolean);
      if (!ok) { const first = fields.find((el) => el.getAttribute('aria-invalid') === 'true'); first && first.focus(); setStatus('error', 'Please check the highlighted fields and try again.'); return; }
      const data = Object.fromEntries(new FormData(form).entries());
      form.classList.add('is-loading'); submit.setAttribute('aria-busy', 'true'); setStatus('', '');
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        let payload = {}; try { payload = await res.json(); } catch (_) { /* non-JSON response */ }
        if (!res.ok || payload.ok === false) throw new Error(payload.error || `Request failed (${res.status})`);
        const wrap = form.parentNode;
        const success = document.createElement('div');
        success.className = 'form-success'; success.setAttribute('tabindex', '-1'); success.setAttribute('role', 'status');
        success.innerHTML = '<div class="form-success-icon"><svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><path d="M6 13.5 11 18l9-10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h3>Thank you. Your enquiry has been received.</h3><p>We aim to respond within one business day. If your enquiry is urgent, call <a href="tel:+447376237959">+44 7376 237959</a>.</p><button class="btn btn--secondary" type="button">Send another enquiry</button>';
        wrap.replaceChild(success, form);
        success.focus();
        success.querySelector('button').addEventListener('click', () => { wrap.replaceChild(form, success); form.reset(); form.classList.remove('is-loading'); submit.removeAttribute('aria-busy'); fields.forEach((el) => el.removeAttribute('aria-invalid')); form.querySelectorAll('.fld-error').forEach((n) => n.remove()); setStatus('', ''); if (started) started.value = String(Date.now()); form.querySelector('.fld-input').focus(); });
      } catch (err) {
        form.classList.remove('is-loading'); submit.removeAttribute('aria-busy');
        setStatus('error', `We could not send your enquiry just now. Please email us directly at <a href="${mailtoFallback(data)}">info@sterlingtonpharma.com</a> (this link opens a pre-filled email) or call <a href="tel:+447376237959">+44 7376 237959</a>.`);
      }
    });
  });
})();
