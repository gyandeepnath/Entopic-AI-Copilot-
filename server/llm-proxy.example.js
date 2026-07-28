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

/* Restrict this to your app's origin(s) in production. */
const ALLOWED_ORIGINS = ["*"];

/* Cheap PII tripwire: the model only ever needs age + sex + findings. If a
   payload contains something that looks like an identifier, refuse it rather
   than forward it. Tune to your locale. */
const PII_PATTERNS = [
  /\bMRN\b/i, /\bmedical record\b/i,
  /\b\d{4}-\d{2}-\d{2}\b/,                 /* a bare date of birth */
  /\b\d{10}\b/,                            /* a 10-digit phone / id */
  /\b[A-Z]{5}\d{4}[A-Z]\b/                 /* e.g. an Indian PAN-shaped id */
];

function looksLikePII(text) {
  return PII_PATTERNS.some((re) => re.test(text || ""));
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes("*") ? "*"
    : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "null");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

/* ── Cloudflare Worker entry point ──────────────────────────────── */
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: { message: "Bad JSON" } }, 400, cors); }

    /* Defence in depth: never forward a request that carries identifiers. */
    const asText = JSON.stringify(body.messages || []) + " " + (body.system || "");
    if (looksLikePII(asText)) {
      return json({ error: { message: "Request rejected: it appears to contain patient identifiers. Send de-identified clinical data only." } }, 422, cors);
    }

    /* Clamp what the client may control; the key comes from the secret store. */
    const upstream = {
      model: body.model || "claude-sonnet-5",
      max_tokens: Math.min(body.max_tokens || 800, 2000),
      system: body.system,
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

/* ── Node (Vercel/Netlify/Express) adapter ──────────────────────────
   module.exports = async (req, res) => {
     const cors = corsHeaders(req.headers.origin || "");
     Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
     if (req.method === "OPTIONS") return res.status(204).end();
     if (req.method !== "POST") return res.status(405).end();
     const asText = JSON.stringify(req.body.messages || []) + " " + (req.body.system || "");
     if (looksLikePII(asText)) return res.status(422).json({ error: { message: "Contains identifiers." } });
     const r = await fetch("https://api.anthropic.com/v1/messages", {
       method: "POST",
       headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
       body: JSON.stringify({ model: req.body.model || "claude-sonnet-5", max_tokens: Math.min(req.body.max_tokens || 800, 2000), system: req.body.system, messages: req.body.messages })
     });
     res.status(r.status).send(await r.text());
   };
*/
