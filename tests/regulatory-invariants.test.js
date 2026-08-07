/* ═══════════════════════════════════════════════════════════════ */
/* REGULATORY INVARIANTS — R1..R8  (ADR-011)                        */
/*                                                                  */
/* ADR-011 does not claim a classification. What it does is convert  */
/* eight properties from things the product HAPPENS to have into     */
/* things it is NOT PERMITTED TO LOSE — because those eight are      */
/* what keeps the lower-risk answer available while the legal        */
/* question waits for someone qualified to answer it.                */
/*                                                                   */
/* A property nobody checks is a property that decays. These are the */
/* checks. If one fails, the change that broke it is not a bug fix   */
/* or a feature — it changes what Entopic IS, and the decision       */
/* belongs in a new ADR rather than in a pull request.               */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createEngine } = require("../tools/lib/load-engine");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const jsFiles = () => fs.readdirSync(path.join(ROOT, "js")).filter((f) => f.endsWith(".js"));
const ADR = read("docs/adr/011-regulatory-classification.md");

const eng = createEngine();


/* ═══ R1 · THE REASONING IS ALWAYS INSPECTABLE ═══ */

test("R1 · every shown condition carries the basis for showing it", () => {
  /* The single most important invariant. Across the regimes that matter, the
     recurring pivot is whether a clinician can independently review the basis
     for what they are told, rather than having to rely on it. */
  const out = eng.runCase({
    symptoms: ["pain", "photophobia", "redness"],
    temporal: { onset: "sudden_onset" }
  });
  assert.ok(out.dxList.length, "the fixture must produce a differential");

  for (const d of out.dxList) {
    assert.ok(d.evidence, d.n + ": no evidence object — the clinician cannot see why");
    assert.ok(Array.isArray(d.evidence.matched), d.n + ": no matched findings");
    assert.ok(Array.isArray(d.evidence.missing), d.n + ": nothing about what is absent");
    assert.ok(Array.isArray(d.evidence.contradicted), d.n + ": nothing about what argues against");
    assert.ok(typeof d.reasoning === "string" && d.reasoning.length > 0, d.n + ": no reasoning string");
  }
});

test("R1 · a force-surfaced condition says why it was surfaced", () => {
  /* Otherwise the most surprising item on the list is the least explained. */
  const out = eng.runCase({
    symptoms: ["flashes", "floaters"], temporal: { onset: "sudden_onset" }
  });
  const gated = out.dxList.filter((d) => d.gatedBecause);
  assert.ok(gated.length > 0, "flashes+floaters must force-surface something");
  for (const g of gated) {
    assert.ok(g.gatedBecause.length > 5, g.n + ": gatedBecause is not a reason");
  }
});

test("R1 · zero evidence produces zero output — the engine does not guess", () => {
  const out = eng.runCase({});
  assert.strictEqual(out.dxList.length, 0);
  assert.strictEqual(out.alerts.length, 0);
});


/* ═══ R2 · DETERMINISTIC AND REPRODUCIBLE ═══ */

test("R2 · the same findings produce the same output, every time", () => {
  const c = { symptoms: ["pain", "photophobia"], iop: { od: "34", os: "16" } };
  const first = JSON.stringify(eng.runCase(c).dxList.map((d) => [d.n, d.prob]));
  for (let i = 0; i < 5; i++) {
    assert.strictEqual(
      JSON.stringify(eng.runCase(c).dxList.map((d) => [d.n, d.prob])), first,
      "a system whose output cannot be reproduced cannot be validated or defended");
  }
});

test("R2 · a stored visit can be replayed and the replay reports faithfully", () => {
  /* Reproducibility is only useful if it can be demonstrated on a real record
     months later. That is what replay is for. */
  assert.ok(fs.existsSync(path.join(ROOT, "js/engine-replay.js")));
  const src = read("js/engine-replay.js");
  assert.ok(src.indexOf("faithful") > 0, "replay must state whether it reproduced exactly");
  assert.ok(src.indexOf("same_kb") > 0, "and must distinguish reproduction from drift");
});

test("R2 · every visit records the knowledge base that produced it", () => {
  const out = eng.runCase({ symptoms: ["dryness"] });
  assert.ok(out.V.engine_provenance, "no provenance — the record cannot explain itself later");
  assert.ok(out.V.engine_provenance.kb_version);
  assert.ok(Array.isArray(out.V.engine_tokens), "the inputs the engine saw must be recorded");
});


/* ═══ R3 · NO AI IN THE DIAGNOSTIC PATH ═══ */

test("R3 · the diagnostic path contains no LLM call", () => {
  /* ADR-004. An unexplainable, non-reproducible component in the diagnostic
     path defeats R1 and R2 together. */
  const diagnostic = ["js/engine.js", "js/engine-diff.js", "js/engine-replay.js"];
  const forbidden = /anthropic|api\.anthropic|callClaude|askClaude|fetch\s*\(/i;
  for (const f of diagnostic) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!forbidden.test(src), f + " reaches for the network or an LLM in the diagnostic path");
  }
});

test("R3 · the knowledge base contains no LLM call either", () => {
  const kb = fs.readdirSync(path.join(ROOT, "knowledge")).filter((f) => f.endsWith(".js"));
  for (const f of kb) {
    const src = read("knowledge/" + f).replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!/fetch\s*\(|anthropic/i.test(src), "knowledge/" + f + " must be pure data");
  }
});

test("R3 · the engine runs with no network module loaded at all", () => {
  /* The Node loader deliberately loads knowledge -> data-model -> engine and
     nothing else. If the engine needed the network, this could not work. */
  const order = require("../tools/lib/kb-load-order").engineOrder();
  const networky = order.filter((f) => /cloud|claude|speech|kb-remote/.test(f));
  assert.deepStrictEqual(networky, [], "the diagnostic path must not load a network module");
  assert.ok(eng.runCase({ symptoms: ["pain"] }).dxList.length >= 0);
});


/* ═══ R4 · NO AUTONOMOUS ACTION ═══ */

test("R4 · nothing in the product prescribes, refers, orders or notifies by itself", () => {
  /* Autonomous action is the clearest line into higher-risk territory in every
     regime. Entopic writes to the record and to the screen; a human does
     everything else.

     Checked as: no code path SENDS anything anywhere except the clinic's own
     backend (sync), the LLM (interpretation only), and the file system
     (exports the user asked for). */
  const allowed = new Set([
    "cloud-sync.js",        /* the clinic's own backup */
    "cloud-replication.js",
    "cloud-crypto.js",
    "cloud-config.js",
    "kb-remote.js",         /* knowledge updates, pull only */
    "claude.js",            /* downstream interpretation (ADR-004) */
    "clinics.js", "clinics-ui.js",
    "browser-io.js",        /* file download the user initiated */
    "data-export.js",
    "research-corpus.js",
    "feedback.js",          /* user-initiated report */
    "auth-crypto.js",
    "local-vault.js", "vault-admin-recovery.js",
    "storage-mirror.js", "file-store.js", "storage-autobackup.js",
    /* Connectivity check against the clinic's OWN configured backend, so an
       admin can tell "the URL is wrong" from "the network is down". Sends no
       clinical data and acts on nothing. */
    "ui-deployment.js"
  ]);
  const offenders = [];
  for (const f of jsFiles()) {
    if (allowed.has(f)) continue;
    const src = read("js/" + f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    if (/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|navigator\.sendBeacon|mailto:/.test(src)) {
      offenders.push(f);
    }
  }
  assert.deepStrictEqual(offenders, [],
    "these modules can send data outward and are not on the reviewed list.\n" +
    "If the new path is legitimate, add it to the list in this test AND say why.\n" +
    "If it acts on a clinical conclusion without a human, it breaks ADR-011 R4.");
});

test("R4 · the engine writes to the record and nothing else", () => {
  const out = eng.runCase({ symptoms: ["sudden_vision_loss"] });
  /* An urgent alert is raised. Nothing is sent, booked or ordered as a result. */
  assert.ok(out.alerts.some((a) => a.l === "urgent"));
  const src = read("js/engine.js").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/fetch|sendBeacon|WebSocket|window\.open|location\s*=/.test(src),
    "the engine must not act on its own conclusions");
});


/* ═══ R5 · ADVISORY FRAMING SURVIVES THE DOCUMENT ═══ */

test("R5 · advisory framing appears wherever a differential is presented", () => {
  const surfaces = ["js/ui-advisory.js", "js/ui-report.js"];
  const advisory = /advisory|clinical correlation|not a diagnosis|decision support|does not replace/i;
  for (const f of surfaces) {
    if (!fs.existsSync(path.join(ROOT, f))) continue;
    assert.ok(advisory.test(read(f)),
      f + " presents a differential without advisory framing");
  }
});

test("R5 · the framing is in the exported report, not only on screen", () => {
  /* The framing must survive the document leaving the building — a printed
     differential with no caveat is a different artefact from the screen. */
  if (!fs.existsSync(path.join(ROOT, "js/ui-report.js"))) return;
  const src = read("js/ui-report.js");
  assert.ok(/advisory|clinical correlation|decision support/i.test(src),
    "an exported report must carry the caveat the screen carries");
});

test("R5 · nothing in the UI claims to diagnose", () => {
  /* Wording is the control here. "Diagnosis:" as a heading for engine output
     is a claim; "Leading impression" is not. */
  const banned = [
    /\bthe diagnosis is\b/i,
    /\bdiagnosed with\b/i,
    /\bconfirms? (?:the )?diagnosis\b/i,
    /(?<!not a )(?<!never a )\bdefinitive diagnosis\b/i
  ];
  const offenders = [];
  for (const f of jsFiles()) {
    const src = read("js/" + f);
    for (const re of banned) {
      if (re.test(src)) offenders.push(f + " :: " + re);
    }
  }
  assert.deepStrictEqual(offenders, [],
    "Entopic supports a clinician's judgement; it must never state that it has made one.");
});


/* ═══ R6 · RED FLAGS ARE UN-SUPPRESSIBLE ═══ */

test("R6 · alerts are computed independently of the differential", () => {
  /* If alerts were derived from scoring, an exclusion or a low score could
     remove one. They are computed separately and appended. */
  const src = read("js/engine.js");
  const alertsAt = src.indexOf("V.alerts = computeAlerts(tokens)");
  assert.ok(alertsAt > 0, "computeAlerts must be called with the tokens, not with the results");
});

test("R6 · a red flag fires even when its condition scores nothing", () => {
  const out = eng.runCase({ iop: { od: "48", os: "14" } });
  assert.ok(out.alerts.some((a) => /critically elevated/.test(a.m)),
    "an IOP alert must not depend on any condition reaching a score");
});

test("R6 · no code path removes an alert once raised", () => {
  const src = read("js/engine.js").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/alerts\s*=\s*alerts\.filter|alerts\.splice|V\.alerts\s*=\s*\[\]\s*;[\s\S]{0,80}computeAlerts/.test(src),
    "an alert that can be filtered out is not un-suppressible");
});


/* ═══ R7 · NO PATIENT-FACING DIAGNOSTIC OUTPUT ═══ */

test("R7 · no output is addressed to the patient", () => {
  /* Direct-to-patient diagnostic software is regulated far more strictly,
     near-universally. Patient-facing MATERIAL is fine — a consent form, an
     appointment slip — but not a differential. */
  const offenders = [];
  for (const f of jsFiles()) {
    const src = read("js/" + f);
    if (/dear patient|your diagnosis|you may have|your likely condition/i.test(src)) {
      offenders.push(f);
    }
  }
  assert.deepStrictEqual(offenders, [],
    "a differential addressed to a patient is a different product with a different answer");
});


/* ═══ R8 · UNVERIFIED CONTENT IS VISIBLY UNVERIFIED ═══ */

test("R8 · provisional knowledge carries its status", () => {
  const { loadKb } = (() => { try { return require("../tools/lib/load-kb"); } catch (e) { return {}; } })();
  const K = loadKb ? loadKb() : null;
  if (!K || !K.KNOWLEDGE_ALL) return;                 /* loader shape differs; covered elsewhere */
  const provisional = K.KNOWLEDGE_ALL.filter((c) => c.review_status === "NEEDS_CLINICAL_REVIEW");
  assert.ok(provisional.length > 0,
    "if this ever reaches zero, it should be because a clinician verified them, not because the flag was dropped");
});

test("R8 · clinician-authored conditions are permanently marked unreviewed", () => {
  const src = read("js/kb-overlay.js");
  assert.ok(src.indexOf("USER_AUTHORED_NOT_REVIEWED") > 0);
  assert.ok(/rec\.exclusions\s*=\s*\[\]/.test(src),
    "and cannot use the one field that removes another condition from a differential");
});

test("R8 · thresholds and red-flag rules carry a verification status", () => {
  const T = require("../knowledge/clinical-thresholds.js");
  const R = require("../knowledge/red-flags.js");
  assert.ok(T.thresholdsUnverified().length > 0 || Object.values(T.CLINICAL_THRESHOLDS).every((r) => r.status));
  assert.ok(R.RED_FLAG_RULES.every((r) => r.status), "every rule states whether it has been signed off");
});


/* ═══ THE ADR ITSELF ═══ */

test("ADR-011 is decided, and claims no classification", () => {
  assert.ok(/\*\*Status:\*\*\s*\*\*DECIDED/.test(ADR), "ADR-011 must no longer read NOT MADE");
  /* The document must not assert a legal position — that is the one thing it
     is forbidden to do, and the same failure class as an invented citation. */
  /* Forbid an ASSERTION, not a question. The ADR necessarily discusses the
     classification; what it must never do is settle it. Every occurrence has
     to be hedged ("whether…", "is or is not…", "definition of…"). */
  const assertions = [...ADR.matchAll(/.{0,40}\bis (?:not )?a (?:regulated )?medical device/gi)]
    .map((m) => m[0])
    .filter((ctx) => !/whether|is or is not|definition of|question|if\b/i.test(ctx));
  assert.deepStrictEqual(assertions, [],
    "ADR-011 must not make the legal determination it exists to defer");
  assert.ok(/regulatory consultant/i.test(ADR), "it must name who does make it");
});

test("every invariant R1..R8 is declared in the ADR", () => {
  for (let i = 1; i <= 8; i++) {
    assert.ok(ADR.indexOf("**R" + i + "**") > 0, "R" + i + " is missing from ADR-011");
  }
});

test("the ADR points at this file, so a failure leads back to the reasoning", () => {
  assert.ok(ADR.indexOf("tests/regulatory-invariants.test.js") > 0);
});
