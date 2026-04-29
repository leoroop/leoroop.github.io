// Optional Cloudflare Worker proxy for the portfolio chat.
//
// Why use it: shipping a Groq API key in a static GitHub Pages site
// exposes it to anyone who views the source. This worker holds the key
// as a secret and forwards requests, so the browser never sees it.
//
// Setup (once):
//   1. npm i -g wrangler (or use the dashboard)
//   2. wrangler login
//   3. wrangler init my-portfolio-proxy && copy this file to src/index.js
//   4. wrangler secret put GROQ_API_KEY     (paste your key)
//   5. Edit ALLOWED_ORIGIN below to your site, e.g. "https://<user>.github.io"
//   6. wrangler deploy
//   7. In chat-config.json set:
//        "endpoint": "https://my-portfolio-proxy.<subdomain>.workers.dev",
//        "apiKey": ""
//      The custom endpoint signals the chat client to skip Bearer auth.
//
// The worker forwards the JSON body verbatim to Groq's OpenAI-compatible
// chat-completions endpoint and adds the Authorization header server-side.

const ALLOWED_ORIGIN = 'https://example.github.io'; // <-- change me
const UPSTREAM = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(allowed) });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(allowed) });
    }
    if (origin && origin !== ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders(allowed) });
    }

    const body = await request.text();

    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      },
      body,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders(allowed),
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    });
  },
};
