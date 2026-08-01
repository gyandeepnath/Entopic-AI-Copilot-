/* ═══════════════════════════════════════════════════════════════ */
/* ARCHITECTURE CONTRACTS                                           */
/*                                                                  */
/* Phase 1 finding: Entopic's most important architectural          */
/* properties are TRUE but not ENFORCED. They hold because one      */
/* person has held them in their head. Nothing stops the next       */
/* engineer breaking them, and nothing would tell them they had.    */
/*                                                                  */
/* This file makes the architecture executable. It adds no          */
/* behaviour, changes no clinical logic, and breaks nothing — it    */
/* only asserts what the architecture already claims, so that a     */
/* violation becomes a red test instead of a slow decay.            */
/*                                                                  */
/* It is also the SINGLE SOURCE OF TRUTH for data classification.   */
/* Three separate hand-maintained lists currently decide what data  */
/* is protected (vault / mirror / backup) and they have drifted.    */
/* The table below states the INTENT; the tests measure the         */
/* reality against it and name every divergence explicitly, with a  */
/* reason. Divergences are recorded, not silently fixed — changing  */
/* what gets encrypted or mirrored is a behaviour change and        */
/* belongs to a deliberate migration, not to a test file.           */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");


/* ═══════════════════════════════════════════════════════════════ */
/* THE DATA CLASSIFICATION TABLE — single source of truth          */
/*                                                                  */
/*  class:   phi        identifiable patient data                  */
/*           clinical   patient-derived, de-identified             */
/*           legal      evidence of consent or access              */
/*           operational配置 / device state                          */
/*           derived    rebuildable from something else            */
/*                                                                  */
/*  encrypt: should be unreadable without the clinic passphrase    */
/*  mirror:  should survive a cleared localStorage                 */
/*  backup:  should travel to a replacement device                 */
/* ═══════════════════════════════════════════════════════════════ */
const DATA_CLASSIFICATION = {
  patients:        { class: "phi",         encrypt: true,  mirror: true,  backup: true  },
  visits:          { class: "phi",         encrypt: true,  mirror: true,  backup: true  },
  users:           { class: "phi",         encrypt: true,  mirror: true,  backup: true  },
  audit:           { class: "legal",       encrypt: true,  mirror: true,  backup: true  },
  consents:        { class: "legal",       encrypt: false, mirror: true,  backup: true  },
  kb_signoffs:     { class: "legal",       encrypt: false, mirror: true,  backup: true  },
  research_corpus: { class: "clinical",    encrypt: false, mirror: true,  backup: true  },
  research_salt:   { class: "operational", encrypt: false, mirror: true,  backup: false },
  feedback:        { class: "operational", encrypt: false, mirror: true,  backup: true  },
  settings:        { class: "operational", encrypt: false, mirror: true,  backup: true  },
  vault_meta:      { class: "operational", encrypt: false, mirror: true,  backup: false },
  registry_queue:  { class: "derived",     encrypt: false, mirror: false, backup: false }
};

/* Divergences between the table above and the code as it stands today.
   Each one is a KNOWN GAP with a reason, not an oversight. Removing an entry
   from here without changing the code will fail the test — which is the point:
   the list can only shrink by fixing the gap.

   Recorded 2026-08-01 (Phase 1 architecture review). */
const KNOWN_DIVERGENCES = {
  "audit/mirror": "The audit trail is encrypted and backed up but NOT mirrored, so a " +
    "cleared localStorage destroys the access log — the one artefact most likely to be " +
    "needed as evidence. Fixing this changes what the mirror stores and must be a " +
    "deliberate migration.",
  "consents/mirror": "No protection of any kind. This is the legal basis for every " +
    "record in the research corpus; a restore returns patients without their consent state.",
  "consents/backup": "As above.",
  "research_corpus/mirror": "The accumulating research asset is lost on device replacement.",
  "research_corpus/backup": "As above.",
  "research_salt/mirror": "Without the salt, existing pseudonyms cannot be reproduced, so a " +
    "restored corpus cannot be linked to newly captured encounters.",
  "feedback/mirror": "Clinical-concern reports are lost on device replacement.",
  "feedback/backup": "As above.",
  "registry_queue/mirror": "Legacy store, superseded by research_corpus, still mirrored. " +
    "Harmless but should be retired."
};

function actualLists() {
  const vault = /VAULT_PROTECTED = \[([^\]]*)\]/.exec(read("js/local-vault.js"));
  const mirror = /MIRROR_KEYS = \[([^\]]*)\]/.exec(read("js/storage-mirror.js"));
  const payload = /function buildBackupPayload\(\)[\s\S]*?\n}/.exec(read("js/storage.js"));
  const parse = (m) => (m ? m[1].match(/"([a-z_]+)"/g) || [] : []).map((s) => s.replace(/"/g, ""));
  return {
    encrypt: parse(vault),
    mirror: parse(mirror),
    backup: (payload ? [...payload[0].matchAll(/^\s{4}([a-z_]+):/gm)].map((m) => m[1]) : [])
      .filter((k) => !["version", "exported"].includes(k))
  };
}


/* ═══ 1. Data classification is declared in exactly one place ═══ */

test("every protected store is classified, and every classified store is real", () => {
  const actual = actualLists();
  const seen = new Set([...actual.encrypt, ...actual.mirror, ...actual.backup]);
  const unclassified = [...seen].filter((k) => !DATA_CLASSIFICATION[k]);
  assert.deepStrictEqual(unclassified, [],
    "these stores are protected by some mechanism but are not in the classification table — " +
    "add them, so that one place states what every store is and why:\n  " + unclassified.join("\n  "));
});

test("the three protection mechanisms match the classification, or the gap is declared", () => {
  /* The architectural point: three hand-maintained lists in three files cannot
     stay aligned by discipline alone. This test is the alignment. */
  const actual = actualLists();
  const undeclared = [];

  for (const key of Object.keys(DATA_CLASSIFICATION)) {
    const want = DATA_CLASSIFICATION[key];
    for (const mech of ["encrypt", "mirror", "backup"]) {
      const has = actual[mech].includes(key);
      if (has === want[mech]) continue;
      const id = key + "/" + mech;
      if (!KNOWN_DIVERGENCES[id]) {
        undeclared.push(id + "  (classification says " + want[mech] + ", code says " + has + ")");
      }
    }
  }

  assert.deepStrictEqual(undeclared, [],
    "the code diverges from the data classification in ways nobody has written down.\n" +
    "Either fix the code, or add the divergence to KNOWN_DIVERGENCES with a reason:\n  " +
    undeclared.join("\n  "));
});

test("a declared divergence that has been fixed must be removed from the list", () => {
  /* Stops KNOWN_DIVERGENCES becoming a permanent excuse list: once the code
     agrees with the classification, the entry has to go. */
  const actual = actualLists();
  const stale = [];
  for (const id of Object.keys(KNOWN_DIVERGENCES)) {
    const [key, mech] = id.split("/");
    const want = DATA_CLASSIFICATION[key];
    if (!want) { stale.push(id + " (store no longer classified)"); continue; }
    if (actual[mech].includes(key) === want[mech]) stale.push(id + " (now agrees — delete it)");
  }
  assert.deepStrictEqual(stale, [], "stale entries in KNOWN_DIVERGENCES:\n  " + stale.join("\n  "));
});


/* ═══ 2. Offline-first is structural, not aspirational ═══ */

test("the diagnostic engine performs no I/O of any kind", () => {
  /* THE load-bearing architectural property. The engine must be runnable with
     no storage, no network and no DOM — which is what lets the Node harness
     prove the offline path, and what stops a future session quietly making
     diagnosis depend on a fetch. */
  const code = strip(read("js/engine.js"));
  const io = [];
  for (const [name, re] of [
    ["localStorage", /\blocalStorage\b/], ["indexedDB", /\bindexedDB\b/],
    ["fetch", /\bfetch\s*\(/], ["XMLHttpRequest", /\bXMLHttpRequest\b/],
    ["document", /\bdocument\./], ["window.location", /\bwindow\.location\b/],
    ["navigator", /\bnavigator\./]
  ]) if (re.test(code)) io.push(name);

  assert.deepStrictEqual(io, [],
    "js/engine.js referenced " + io.join(", ") + ". The engine must stay pure: " +
    "diagnosis cannot depend on storage, network or DOM, or the offline guarantee dies.");
});

test("the engine and the knowledge base carry no LLM dependency", () => {
  /* Hard guardrail: the LLM is strictly downstream of diagnosis. */
  const surfaces = ["js/engine.js", "knowledge/loader.js"];
  for (const f of surfaces) {
    const code = strip(read(f));
    assert.ok(!/anthropic|claude|openai|callClaude|API_KEY/i.test(code),
      f + " references an LLM. Diagnostic reasoning must stay deterministic and inspectable.");
  }
});


/* ═══ 3. Layer direction ═══ */

/* Layer violations that exist TODAY. Grandfathered with a reason, so the test
   passes on the current tree while making any NEW violation fail — a ratchet,
   not an amnesty. Fixing either changes behaviour, so both are Phase 1
   recommendations rather than Phase 1 edits.

   Recorded 2026-08-01. */
const KNOWN_LAYER_VIOLATIONS = {
  "js/cloud-sync.js": "cloud-sync.js:532 calls renderHome() directly after a sync pulls new " +
    "records. Infrastructure reaching up into the UI. The correct design is an emitted event " +
    "the UI subscribes to; introducing one is a real design change, not a test-file edit.",
  "knowledge/age-classification.js": "reads and writes localStorage directly (lines 74-82), " +
    "which breaks the property that knowledge/ is portable data extractable into a package, " +
    "a server, or a different client. The persistence belongs in the application layer."
};

test("no NEW infrastructure module calls the rendering layer", () => {
  /* Dependencies must point one way: UI → domain → infrastructure. An
     infrastructure module that calls renderMain() cannot be reused, tested in
     isolation, or replaced. */
  const RENDERERS = /\b(renderMain|renderAdvisory|renderSidebar|renderHome|renderChart)\s*\(/;
  const INFRA = ["js/engine.js", "js/local-vault.js", "js/cloud-sync.js",
                 "js/auth-crypto.js", "js/consent.js", "js/research-corpus.js",
                 "js/insights.js", "js/browser-io.js", "js/storage-mirror.js"];
  const violations = INFRA.filter((f) => RENDERERS.test(strip(read(f))))
                          .filter((f) => !KNOWN_LAYER_VIOLATIONS[f]);
  assert.deepStrictEqual(violations, [],
    "these infrastructure/domain modules call the UI directly. Dependencies must point\n" +
    "one way (UI → domain → infrastructure); emit an event instead:\n  " + violations.join("\n  "));
});

test("no NEW knowledge file depends on the application layer", () => {
  /* knowledge/ is the product's asset and must remain portable — extractable
     into a separate package, a server, or a different client entirely. */
  const violations = [];
  for (const f of fs.readdirSync(path.join(ROOT, "knowledge")).filter((x) => x.endsWith(".js"))) {
    const p = "knowledge/" + f;
    if (KNOWN_LAYER_VIOLATIONS[p]) continue;
    if (/\b(loadStore|saveStore|renderMain|renderAdvisory|doSave|localStorage)\b/.test(strip(read(p)))) {
      violations.push(p);
    }
  }
  assert.deepStrictEqual(violations, [],
    "knowledge/ must stay portable data — it must not reach into the application layer:\n  " +
    violations.join("\n  "));
});

test("a grandfathered layer violation that has been fixed must be removed", () => {
  /* Same ratchet as KNOWN_DIVERGENCES: the excuse list can only shrink. */
  const RENDERERS = /\b(renderMain|renderAdvisory|renderSidebar|renderHome|renderChart)\s*\(/;
  const APP = /\b(loadStore|saveStore|renderMain|renderAdvisory|doSave|localStorage)\b/;
  const stale = [];
  for (const f of Object.keys(KNOWN_LAYER_VIOLATIONS)) {
    const code = strip(read(f));
    const still = f.startsWith("knowledge/") ? APP.test(code) : RENDERERS.test(code);
    if (!still) stale.push(f + " (now clean — delete its entry)");
  }
  assert.deepStrictEqual(stale, [], "stale entries in KNOWN_LAYER_VIOLATIONS:\n  " + stale.join("\n  "));
});


/* ═══ 4. Load order is a contract, not a coincidence ═══ */

test("the load order enforces the layer sequence", () => {
  /* With no module system, <script> order IS dependency resolution. These are
     the orderings that are load-bearing rather than incidental. */
  const html = read("index.html");
  const order = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const at = (f) => order.indexOf(f);

  const MUST_PRECEDE = [
    ["js/dom-escape.js", "js/app.js", "the canonical escaper must exist before anything renders"],
    ["knowledge/loader.js", "js/engine.js", "the engine reads an assembled KNOWLEDGE_ALL"],
    ["js/browser-io.js", "js/storage.js", "storage uses lsSet/dlSaveAs"],
    ["js/local-vault.js", "js/storage.js", "storage bridges reads/writes through the vault"],
    ["js/consent.js", "js/research-corpus.js", "the corpus asks consent before every capture"],
    ["js/data-model.js", "js/engine.js", "the engine reads STEPS and the finding vocabularies"],
    ["js/storage.js", "js/app.js", "app.js orchestrates persistence"]
  ];
  for (const [first, second, why] of MUST_PRECEDE) {
    assert.ok(at(first) >= 0 && at(second) >= 0, first + " or " + second + " is not loaded");
    assert.ok(at(first) < at(second), first + " must load before " + second + " — " + why);
  }

  /* error-boundary wraps the renderers by name, so it can only work last. */
  assert.strictEqual(order[order.length - 1], "js/error-boundary.js",
    "error-boundary.js must load LAST: it monkey-patches renderers that must already exist");
});

test("no module is loaded twice", () => {
  const order = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const dupes = order.filter((f, i) => order.indexOf(f) !== i);
  assert.deepStrictEqual([...new Set(dupes)], [],
    "duplicate <script> tags re-execute a module and reset its state:\n  " + dupes.join("\n  "));
});


/* ═══ 5. Complexity budgets ═══ */

test("no NEW module exceeds the size at which one file stops having one job", () => {
  /* Not a style rule — a cohesion rule. Files above ~800 lines in this
     codebase have all turned out to hold several responsibilities.

     The existing offenders are grandfathered WITH their line counts: the test
     fails if they grow, which stops the problem compounding without demanding
     a risky refactor today. New files get the budget from day one. */
  const BUDGET = 800;
  const GRANDFATHERED = {
    "js/engine.js": 2100, "js/app.js": 1950, "js/data-model.js": 1300,
    "js/ui-pages.js": 1300, "js/storage.js": 1200, "js/reasoning-views.js": 900,
    "js/drawing.js": 850, "js/ui-flowmap.js": 800
  };
  const over = [];
  for (const f of fs.readdirSync(path.join(ROOT, "js")).filter((x) => x.endsWith(".js"))) {
    const p = "js/" + f;
    const lines = read(p).split("\n").length;
    const cap = GRANDFATHERED[p] || BUDGET;
    if (lines > cap) over.push(p + " is " + lines + " lines (cap " + cap + ")");
  }
  assert.deepStrictEqual(over, [],
    "these modules exceeded their complexity budget. A file this size has more than one\n" +
    "reason to change. Split it, or raise its grandfathered cap with a written reason:\n  " +
    over.join("\n  "));
});
