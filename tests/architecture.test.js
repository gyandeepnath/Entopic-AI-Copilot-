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
/* Data classification USED to live here, because production had no    */
/* one place for it — three hand-maintained lists in three files       */
/* decided what was protected, and they had drifted apart.             */
/*                                                                     */
/* Production now declares it once, in js/data-classification.js, and  */
/* the mirror and the backup derive their lists from it. The table     */
/* below is no longer that source of truth; it is now an INDEPENDENT   */
/* SECOND OPINION. It says what protection each store OUGHT to have,   */
/* written here on purpose so that a careless edit to the production   */
/* table fails a test rather than silently unprotecting a store.       */
/*                                                                     */
/* Two tables that must agree is the point. One table that agrees with */
/* itself would prove nothing.                                         */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");

/* The production declaration. */
const PROD = require("../js/data-classification.js");


/* ═══════════════════════════════════════════════════════════════ */
/* THE EXPECTED CLASSIFICATION — the second opinion                */
/*                                                                  */
/*  class:   phi         identifiable patient data                 */
/*           clinical    patient-derived, de-identified            */
/*           legal       evidence of consent or access             */
/*           operational configuration / device state              */
/*           derived     rebuildable from something else           */
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
  kb_overlays:     { class: "legal",       encrypt: false, mirror: true,  backup: true  },
  competencies:    { class: "legal",       encrypt: false, mirror: true,  backup: true  },
  competency_log:  { class: "legal",       encrypt: false, mirror: true,  backup: true  },
  age_brackets:    { class: "legal",       encrypt: false, mirror: true,  backup: true  },
  /* backup:true — a restore that brought back records WITHOUT the migration
     ledger would look like an unmigrated device and re-run every migration
     over already-migrated data. */
  migrations:      { class: "operational", encrypt: false, mirror: true,  backup: true  },
  autobackup:      { class: "operational", encrypt: false, mirror: true,  backup: true  },
  /* backup:false — a tombstone is a message in flight, not state. Replaying a
     stale one out of a month-old backup could delete a record that has since
     been legitimately restored. Mirrored and encrypted because losing the queue
     silently resurrects a deleted patient. */
  cloud_tombstones:{ class: "operational", encrypt: false, mirror: true,  backup: false },
  research_corpus: { class: "clinical",    encrypt: false, mirror: true,  backup: true  },
  /* backup:true — revised from the original false. The salt has to travel with
     the corpus it belongs to, or every pseudonym in a restored corpus becomes
     unlinkable to anything captured afterwards. It discloses nothing extra:
     the same backup file already carries the patients in full. */
  research_salt:   { class: "operational", encrypt: false, mirror: true,  backup: true  },
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
/* Empty, and it has to stay that way by fixing code rather than by adding
   excuses. All nine original entries were closed on 2026-08-01: the audit
   trail is mirrored, consents / research_corpus / research_salt / feedback are
   mirrored and backed up, and registry_queue no longer claims protection it
   does not need. Anything added here needs a reason a clinician would accept. */
const KNOWN_DIVERGENCES = {};

function actualLists() {
  /* VAULT_PROTECTED is deliberately still a hand-written literal rather than
     derived like the other two. If js/data-classification.js ever failed to
     load, a derived list would evaluate to empty — and an empty
     VAULT_PROTECTED means patient records written in PLAINTEXT while the UI
     still says the vault is on. That failure is silent, and it is a
     confidentiality breach rather than a loss of redundancy. So encryption
     keeps a literal that fails safe, and this test is what keeps it honest. */
  const vault = /VAULT_PROTECTED = \[([^\]]*)\]/.exec(read("js/local-vault.js"));
  const parse = (m) => (m ? m[1].match(/"([a-z_]+)"/g) || [] : []).map((s) => s.replace(/"/g, ""));
  return {
    encrypt: parse(vault),
    /* The mirror and the backup derive from the production table at runtime,
       so the table IS what the code does. */
    mirror: PROD.dataStoresWith("mirror"),
    backup: PROD.dataStoresWith("backup")
  };
}


/* ═══ 1. Data classification is declared in exactly one place ═══ */

test("the production classification table agrees with this file's second opinion", () => {
  /* Two tables, written at different times for different reasons, must say the
     same thing. This is the check that a careless edit to production has to
     get past — and the reason the expectations here are duplicated rather than
     imported. */
  const mismatches = [];
  const prodKeys = PROD.dataStoreKeys().sort();
  const wantKeys = Object.keys(DATA_CLASSIFICATION).sort();
  assert.deepStrictEqual(prodKeys, wantKeys,
    "js/data-classification.js and this test disagree about which stores exist");

  for (const key of wantKeys) {
    const want = DATA_CLASSIFICATION[key];
    const got = PROD.DATA_STORES[key];
    for (const field of ["class", "encrypt", "mirror", "backup"]) {
      if (got[field] !== want[field]) {
        mismatches.push(key + "." + field + ": production says " + JSON.stringify(got[field]) +
          ", this test expects " + JSON.stringify(want[field]));
      }
    }
  }
  assert.deepStrictEqual(mismatches, [],
    "production data classification diverges from the expected classification:\n  " +
    mismatches.join("\n  "));
});

test("every classified store says why it is protected the way it is", () => {
  /* A protection flag with no stated reason is a flag nobody can safely
     change later, because nobody knows what it was for. */
  const silent = PROD.dataStoreKeys().filter((k) => {
    const w = PROD.DATA_STORES[k].why;
    return typeof w !== "string" || w.trim().length < 20;
  });
  assert.deepStrictEqual(silent, [],
    "these stores declare protection without explaining it:\n  " + silent.join("\n  "));
});

test("every classified store declares a shape", () => {
  const bad = PROD.dataStoreKeys().filter(
    (k) => !["array", "object", "string"].includes(PROD.DATA_STORES[k].shape));
  assert.deepStrictEqual(bad, [],
    "a store with no declared shape cannot be checked for corruption:\n  " + bad.join("\n  "));
});

test("the mirror and the backup derive their lists instead of re-hardcoding them", () => {
  /* The whole point of the classification table is that these lists stop being
     maintained by hand. A literal here would restore the drift it removed. */
  const mirror = read("js/storage-mirror.js");
  const storage = read("js/storage.js");
  const backup = read("js/storage-backup.js");

  assert.ok(/MIRROR_KEYS\s*=\s*\(typeof dataStoresWith === "function"\)/.test(mirror),
    "MIRROR_KEYS must derive from dataStoresWith('mirror')");
  assert.ok(/MIRROR_ARRAY_KEYS\s*=\s*\(typeof dataStoresShaped === "function"\)/.test(mirror),
    "MIRROR_ARRAY_KEYS must derive from dataStoresShaped('array')");
  assert.ok(/STORE_EXPECTED_ARRAY\s*=\s*\(typeof dataStoresShaped === "function"\)/.test(storage),
    "STORE_EXPECTED_ARRAY must derive from dataStoresShaped('array')");
  assert.ok(/dataStoresWith\("backup"\)/.test(backup),
    "buildBackupPayload must derive its keys from dataStoresWith('backup')");
});

test("everything the backup writes, the restore reads back", () => {
  /* A store added to the backup but forgotten in the restore is write-only:
     the clinic's data is in the file and never comes home. That is worse than
     not backing it up, because the backup looks complete. */
  const importFn = /function _importDecoded\([\s\S]*?\n}\n/.exec(read("js/storage-backup.js"));
  assert.ok(importFn, "could not find _importDecoded");
  const body = importFn[0];

  const missing = PROD.dataStoresWith("backup").filter(
    (k) => !new RegExp("data\\." + k + "\\b").test(body));
  assert.deepStrictEqual(missing, [],
    "these stores are exported in the backup but never restored from it:\n  " + missing.join("\n  "));
});

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
/* Empty since 2026-08-01. Both entries were closed by introducing the event
   bus (js/events.js) that the previous note said was the correct design:
     - cloud-sync.js now emits "sync:applied" instead of calling renderHome();
     - knowledge/age-classification.js is data again, with its persistence
       moved to js/age-brackets.js and routed through saveStore.
   Storage's four DOM banners went the same way, into js/ui-storage-banners.js. */
const KNOWN_LAYER_VIOLATIONS = {};

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

test("every <script src> resolves to a file that exists", () => {
  /* With no build step nothing verifies these paths. A typo'd or renamed src
     404s silently in the browser: the other 91 scripts still run, so the app
     boots and only the missing module's features are quietly dead. That
     matters more now that storage-mirror, storage and local-vault derive
     their protection lists from js/data-classification.js — a 404 there would
     mean a clinic running with an unprotected mirror and no sign of it. */
  const srcs = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(srcs.length > 50, "expected the full script list, found " + srcs.length);
  const missing = srcs.filter((s) => !fs.existsSync(path.join(ROOT, s)));
  assert.deepStrictEqual(missing, [],
    "index.html loads scripts that do not exist:\n  " + missing.join("\n  "));
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
    /* engine.js raised 2100 -> 2200 for the overlay pass: clinician-authored
       conditions are scored SEPARATELY and merged with core urgents on top, so
       a user condition can never outrank a red flag. Doing it in three lines by
       appending to `results` would have been smaller and would have
       reintroduced exactly that hazard.
       Raised again 2200 -> 2300 for derived alerts (Phase 4 F-1): 51 of 63
       urgent conditions reached the differential with no alert banner. */
    "js/engine.js": 2300, "js/app.js": 2000, "js/data-model.js": 1300,
    /* app.js raised 1950 -> 2000 for the stepHasData extraction, which made
       markDone reusable for any visit rather than only the open one. It is the
       known god module (Top-100 item 4); the cap exists to stop it growing
       casually, not to block a change that improves it. */
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
