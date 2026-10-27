/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — LLM PROXY (example)                                    */
/*                                                                  */
/* Fixes DD finding H-3: with a direct-from-browser call, the        */
/* Anthropic API key is visible to anyone who opens the app and can  */
/* be exfiltrated and abused. This tiny server holds the key         */
/* SERVER-SIDE; the browser calls this URL with no key at all.       */
/*                                                                  */
/* To use it, deploy this and set the app's proxy URL:               */
/*   localStorage.setItem("entopic_llm_proxy", "https://YOUR-PROXY/") */
/* (there is a field for it in the app's settings). Once set, the    */
/* browser never sees the key.                                       */
/*                                                                  */
/* This is a REFERENCE. It runs as-is on Cloudflare Workers and,     */
/* with the tiny Node shim at the bottom, on Vercel/Netlify          */
/* functions. Keep the key in the platform's secret store, never in  */
/* this file.                                                        */
/*                                                                  */
/* Guardrail alignment: the app already de-identifies before calling */
/* (age + sex only, no PII — see js/claude.js buildClinicalSummary). */
/* This proxy re-checks that and refuses a request that smells like  */
/* it carries identifiers, as defence in depth.                      */
/* ═══════════════════════════════════════════════════════════════ */

/* ── WHO MAY USE THIS PROXY (second full audit, 2026-10-27) ──
   The first version had ALLOWED_ORIGINS = ["*"] and no authentication. CORS
   only restrains browsers; a script or another server ignores it. So a
   deployed copy was an OPEN RELAY: anyone who learned its URL could spend the
   clinic's Anthropic credit without limit, on any model they named.

   It now FAILS CLOSED. Configure at least one of, in the platform's secret
   store (never in this file):
     PROXY_TOKEN                     a long random string; enter the same value
                                     in Entopic (Account → AI connection). Rotate
                                     it if a device is lost.
     SUPABASE_URL + SUPABASE_ANON_KEY  accept anyone signed in to YOUR clinic's
                                     own Supabase project (Entopic sends the
                                     signed-in session token automatically).
   With neither set, every request is refused.

   Optional:
     ALLOWED_MODELS   comma-separated; default "claude-sonnet-5". A caller can
                      no longer pick the most expensive model.
     ALLOWED_ORIGINS  comma-separated; default "*". Origin is advisory only (an
                      offline Entopic sends Origin "null"); the token is the
                      access control. */

/* Cheap PII tripwire: the model only ever needs age + sex + findings. If a
   payload contains something that looks like an identifier, refuse it rather
   than forward it. The app already scrubs (js/claude.js llmScrubPII); this is
   defence in depth. Tune to your locale. */
const PII_PATTERNS = [
  /\bMRN\b/i, /\bmedical record\b/i,
  /\b\d{4}-\d{2}-\d{2}\b/,                  /* a bare date of birth */
  /\b\d{10}\b/,                             /* a 10-digit phone / id */
  /\b\d{5}[\s-]\d{5}\b/,                    /* the same, written 98765 43210 */
  /\b[A-Z]{5}\d{4}[A-Z]\b/                  /* e.g. an Indian PAN-shaped id */
];

function looksLikePII(text) {
  return PII_PATTERNS.some((re) => re.test(text || ""));
}

function listFrom(v, dflt) {
  const out = String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
  return out.length ? out : dflt;
}

function corsHeaders(origin, env) {
  const allowed = listFrom(env && env.ALLOWED_ORIGINS, ["*"]);
  const allow = allowed.includes("*") ? "*" : (allowed.includes(origin) ? origin : allowed[0]);
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  };
}

/* Constant-time string comparison (no early exit on the first mismatch). */
function sameSecret(a, b) {
  a = String(a || ""); b = String(b || "");
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0 && a.length > 0;
}

/* Resolves "ok" | "denied" | "unconfigured". */
async function authorise(request, env) {
  if (!env.PROXY_TOKEN && !(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)) return "unconfigured";
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return "denied";
  if (env.PROXY_TOKEN && sameSecret(token, env.PROXY_TOKEN)) return "ok";
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    try {
      const r = await fetch(env.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/user", {
        headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token }
      });
      if (r.ok) return "ok";
    } catch (e) { /* fall through to denied */ }
  }
  return "denied";
}

/* ── Cloudflare Worker entry point ──────────────────────────────── */
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    const who = await authorise(request, env);
    if (who === "unconfigured") {
      return json({ error: { message: "Proxy not configured: set PROXY_TOKEN (or SUPABASE_URL + SUPABASE_ANON_KEY). Refusing to run as an open relay." } }, 503, cors);
    }
    if (who !== "ok") return json({ error: { message: "Not authorised." } }, 401, cors);

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: { message: "Bad JSON" } }, 400, cors); }
    if (!body || !Array.isArray(body.messages)) return json({ error: { message: "messages must be a list" } }, 400, cors);

    /* Defence in depth: never forward a request that carries identifiers. */
    const asText = JSON.stringify(body.messages) + " " + (body.system || "");
    if (looksLikePII(asText)) {
      return json({ error: { message: "Request rejected: it appears to contain patient identifiers. Send de-identified clinical data only." } }, 422, cors);
    }

    /* Clamp what the client may control; the key comes from the secret store. */
    const models = listFrom(env.ALLOWED_MODELS, ["claude-sonnet-5"]);
    const model = models.includes(body.model) ? body.model : models[0];
    const upstream = {
      model: model,
      max_tokens: Math.max(1, Math.min(Number(body.max_tokens) || 800, 2000)),
      system: typeof body.system === "string" ? body.system : undefined,
      messages: body.messages
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,      /* <-- from the platform secret store */
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(upstream)
    });

    const data = await res.text();
    return new Response(data, { status: res.status, headers: { ...cors, "Content-Type": "application/json" } });
  }
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { ...cors, "Content-Type": "application/json" } });
}

/* ── Supabase Edge Function (RECOMMENDED host) ──────────────────────
   Entopic's Content-Security-Policy already allows https://*.supabase.co, so
   a proxy on the clinic's own project needs no change to index.html. Save as
   supabase/functions/llm-proxy/index.ts (plain JS is fine), set the secrets
   with `supabase secrets set ANTHROPIC_API_KEY=… PROXY_TOKEN=…` (or rely on
   SUPABASE_URL + SUPABASE_ANON_KEY, which Supabase provides to functions), then
   enter https://<project>.supabase.co/functions/v1/llm-proxy in Entopic:

   import worker from "./llm-proxy.example.js";
   Deno.serve((req) => worker.fetch(req, Deno.env.toObject()));
*/

/* ── Node (Vercel/Netlify/Express) adapter ──────────────────────────
   Wrap the same handler rather than re-implementing it, so the access
   control above cannot be forgotten in one of the two copies:

   const worker = require("./llm-proxy.example.js").default;   // or import
   module.exports = async (req, res) => {
     const request = new Request("https://proxy.local/", {
       method: req.method, headers: req.headers,
       body: req.method === "POST" ? JSON.stringify(req.body) : undefined
     });
     const r = await worker.fetch(request, process.env);
     r.headers.forEach((v, k) => res.setHeader(k, v));
     res.status(r.status).send(await r.text());
   };
*/
