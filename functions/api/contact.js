// Cloudflare Pages Function: POST /api/contact
import { handleContact } from '../../lib/contact-handler.js';
export const onRequestPost = ({ request, env }) => handleContact(request, env);
export const onRequest = () => new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
