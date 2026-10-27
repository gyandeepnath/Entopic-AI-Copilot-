/* The reference LLM proxy (server/llm-proxy.example.js) must not be an open
   relay. The first version allowed every origin and asked for no credential:
   a deployed copy spent the clinic's Anthropic credit for anyone who found
   its URL, on whatever model they named (second full audit, 2026-10-27). */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

/* Load the ES module's text as a script: strip the `export default` so the
   handler can be exercised in Node without a module loader or package type. */
function loadProxy(upstreamCalls) {
  const src = fs.readFileSync(path.resolve(__dirname, "..", "server", "llm-proxy.example.js"), "utf8")
    .replace("export default {", "var __worker = {");
  const ctx = {
    Request, Response, Headers, JSON, String, Number, Math, Array, Promise, console,
    fetch: async (url, init) => {
      upstreamCalls.push({ url, init });
      if (/auth\/v1\/user/.test(url)) {
        return new Response("{}", { status: init.headers.Authorization === "Bearer good-session" ? 200 : 401 });
      }
      return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }), { status: 200 });
    }
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: "llm-proxy.example.js" });
  return ctx.__worker;
}

function post(body, token) {
  const h = { "Content-Type": "application/json", Origin: "null" };
  if (token) h.Authorization = "Bearer " + token;
  return new Request("https://proxy.test/", { method: "POST", headers: h, body: JSON.stringify(body) });
}
const MSG = { model: "claude-sonnet-5", max_tokens: 100, messages: [{ role: "user", content: "58F, blur" }] };

test("with no access control configured, the proxy refuses to run", async () => {
  const calls = [];
  const r = await loadProxy(calls).fetch(post(MSG, "anything"), { ANTHROPIC_API_KEY: "k" });
  assert.strictEqual(r.status, 503);
  assert.strictEqual(calls.length, 0, "nothing reached Anthropic");
});

test("a request without the right token is refused", async () => {
  const calls = [];
  const w = loadProxy(calls);
  const env = { ANTHROPIC_API_KEY: "k", PROXY_TOKEN: "s3cret-token-value" };
  assert.strictEqual((await w.fetch(post(MSG), env)).status, 401);
  assert.strictEqual((await w.fetch(post(MSG, "s3cret-token-valuX"), env)).status, 401);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual((await w.fetch(post(MSG, "s3cret-token-value"), env)).status, 200);
  assert.strictEqual(calls.length, 1);
});

test("a signed-in user of the clinic's own Supabase project is accepted instead", async () => {
  const calls = [];
  const w = loadProxy(calls);
  const env = { ANTHROPIC_API_KEY: "k", SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon" };
  assert.strictEqual((await w.fetch(post(MSG, "good-session"), env)).status, 200);
  assert.strictEqual((await w.fetch(post(MSG, "stolen-or-expired"), env)).status, 401);
});

test("the caller cannot choose an expensive model or an unbounded response", async () => {
  const calls = [];
  const w = loadProxy(calls);
  const env = { ANTHROPIC_API_KEY: "k", PROXY_TOKEN: "t0ken-t0ken" };
  await w.fetch(post({ ...MSG, model: "claude-mythos-5", max_tokens: 100000 }, "t0ken-t0ken"), env);
  const sent = JSON.parse(calls[0].init.body);
  assert.strictEqual(sent.model, "claude-sonnet-5", "only allow-listed models are forwarded");
  assert.ok(sent.max_tokens <= 2000);
});

test("identifiers are still refused before anything is forwarded", async () => {
  const calls = [];
  const w = loadProxy(calls);
  const env = { ANTHROPIC_API_KEY: "k", PROXY_TOKEN: "t0ken-t0ken" };
  const r = await w.fetch(post({ ...MSG, messages: [{ role: "user", content: "call 98765 43210" }] }, "t0ken-t0ken"), env);
  assert.strictEqual(r.status, 422);
  assert.strictEqual(calls.length, 0);
});

test("the app sends its proxy token, and AI features run with a proxy and no key", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "claude.js"), "utf8");
  assert.match(src, /headers\["Authorization"\] = "Bearer " \+ tok/);
  assert.match(src, /if \(!llmAvailable\(\)\) return;/, "remarks are gated on key OR proxy, not key alone");
  assert.match(fs.readFileSync(path.resolve(__dirname, "..", "js", "speech.js"), "utf8"), /llmAvailable\(\)/);
});
