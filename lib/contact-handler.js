/**
 * Contact form handler shared by the Cloudflare Worker (worker.js) and the
 * Cloudflare Pages Function (functions/api/contact.js).
 * Expects JSON. Sends the enquiry by email through Resend when the
 * environment provides RESEND_API_KEY and CONTACT_TO (and optionally CONTACT_FROM).
 * Without those variables it returns 501 so the front end can offer the email fallback.
 */
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
const clean = (v, max = 2000) => String(v ?? '').replace(CONTROL, '').trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function handleContact(request, env) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  let data;
  try { data = await request.json(); } catch { return json(400, { ok: false, error: 'Invalid JSON' }); }
  // spam guards: honeypot and minimum fill time
  if (clean(data.website)) return json(200, { ok: true });
  const started = Number(data.started || 0);
  if (started && Date.now() - started < 2500) return json(200, { ok: true });

  const f = {
    type: clean(data.type, 60), name: clean(data.name, 120), organisation: clean(data.organisation, 160), email: clean(data.email, 160),
    phone: clean(data.phone, 60), country: clean(data.country, 80), product: clean(data.product, 80), message: clean(data.message, 4000), consent: data.consent ? 'yes' : 'no',
  };
  const errors = [];
  if (!f.type) errors.push('type'); if (!f.name) errors.push('name'); if (!f.organisation) errors.push('organisation'); if (!f.country) errors.push('country');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) errors.push('email');
  if (f.message.length < 20) errors.push('message'); if (f.consent !== 'yes') errors.push('consent');
  if (errors.length) return json(422, { ok: false, error: 'Validation failed', fields: errors });

  if (!env.RESEND_API_KEY || !env.CONTACT_TO) return json(501, { ok: false, error: 'Email delivery is not configured' });
  const from = env.CONTACT_FROM || 'Sterlington website <onboarding@resend.dev>';
  const subject = `[Website enquiry] ${f.type} - ${f.organisation}`;
  const rows = Object.entries(f).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7894;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('');
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#1a2235"><h2 style="font-weight:600">New website enquiry</h2><table>${rows}</table><p style="color:#6b7894;font-size:12px">Sent from sterlingtonpharma.com - ${new Date().toISOString()}</p></div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: env.CONTACT_TO.split(',').map((s) => s.trim()), reply_to: f.email, subject, html, text: Object.entries(f).map(([k, v]) => `${k}: ${v}`).join('\n') }),
  });
  if (!res.ok) return json(502, { ok: false, error: 'Email provider rejected the message' });
  return json(200, { ok: true });
}
