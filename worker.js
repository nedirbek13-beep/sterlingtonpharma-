// Cloudflare Worker entry (Workers with static assets). Static files are served by the
// assets binding; only /api/* is handled here.
import { handleContact } from './lib/contact-handler.js';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return handleContact(request, env);
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
