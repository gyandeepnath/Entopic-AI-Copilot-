# Entopic — Future Graph Readiness Report

**Phase 3 · 2026-08-02**

Whether the knowledge, as it stands, would naturally become a graph — and what
to change so that it would. **No graph database is proposed, and none should be
adopted now.** This is about shape, not technology.

---

## 1. The honest headline

**Entopic's knowledge is already a graph. It just does not know it.**

Every condition names tokens; tokens are named by many conditions. That is a
bipartite graph with 394 condition nodes, 481 token nodes, and roughly 4,000
edges — and the engine already traverses it. `rebuildTokenStats` and
`rebuildRouteRegistry` in `knowledge/loader.js` build adjacency indexes at load.

What is missing is not structure. It is **typed relationships between
conditions**, and **evidence on the edges**.

---

## 2. What extracts cleanly today

### Nodes, already implicit

| Node type | Count | Identifier | Ready? |
|---|---|---|---|
| Condition | 394 | `name` (unique — verified 0 duplicates) | ✅ |
| Token (sign/symptom/finding/test) | 481 | token string | ✅ |
| Domain | 9 | string | ✅ |
| Route | 9 | string | ✅ |
| ICD code | 394 | code | ⚠️ **not unique — 56 codes shared** |
| Age bracket | 4 | token | ✅ |
| Medication | 16 | drug name | ✅ |
| Clinical scale | 1 | name | ✅ (and the only one with a source) |

### Edges, already present as data

| Edge | From → To | Count | Typed? |
|---|---|---|---|
| `REQUIRES` | Condition → Token | ~1,200 | ✅ |
| `SUPPORTED_BY` | Condition → Token | ~2,000 | ✅ |
| `CONTRADICTED_BY` | Condition → Token | ~700 | ✅ |
| `DISCRIMINATED_BY` | Condition → Token (`tests`) | ~600 | ✅ |
| `EXCLUDES` | Condition → Condition | 12 | ✅ but barely used |
| `IN_DOMAIN` / `ON_ROUTE` | Condition → Domain/Route | 788 | ✅ |
| `CODED_AS` | Condition → ICD | 394 | ✅ |
| `CAUSES_EFFECT` | Medication → Condition-ish | ~40 | ⚠️ free text, not token-linked |

**Four distinct, semantically meaningful edge types between conditions and
findings already exist as first-class data.** That is unusually good. Most
clinical knowledge bases have one undifferentiated "associated with".

---

## 3. What is missing, and it is all the same thing

### 3.1 Condition-to-condition relationships — the big gap

There are **no** typed edges between conditions except `EXCLUDES` (12 uses).
Missing, and each blocks something specific:

| Relationship | Blocks |
|---|---|
| `IS_A` / `VARIANT_OF` | Hierarchical differentials; "all forms of uveitis" |
| `LEADS_TO` / `COMPLICATION_OF` | Complication prediction; "what am I preventing?" |
| `DIFFERENTIAL_OF` | Grouped differentials instead of a flat ranked list |
| `PRECEDES` | Natural-history teaching pathways |
| `CO_OCCURS_WITH` | Multi-problem reasoning (which the engine already attempts) |

The sub-typing that *should* be `VARIANT_OF` is currently encoded in strings —
89 condition names contain parentheses, 5 use a dash ("Dry Eye Disease -
Evaporative (MGD)"). The hierarchy exists in the naming and is invisible to
every consumer.

### 3.2 Evidence edges — the other big gap
0 of 394 conditions carry any source. In graph terms every edge is unweighted
and unattributed: the graph can say *that* `high_iop` supports glaucoma, never
*why*, *how strongly*, or *on whose authority*. An evidence graph is the single
most valuable thing this knowledge could become, and it currently cannot exist.

### 3.3 Token typing
Tokens are a flat vocabulary. `high_iop` (a measurement), `flashes` (a symptom),
`RAPD_positive` (a sign) and `B_scan_ultrasound` (an investigation) are
structurally identical. The registry has a `type_hint` field; it is not used
consistently. Typing would let a graph answer "what investigations discriminate
here?" separately from "what symptoms?".

### 3.4 ICD is not a usable identifier
56 codes are shared across conditions. As a node key it would silently merge
distinct diseases. A stable internal id is needed before any graph or registry
export.

---

## 4. Readiness by use case

| Use case | Ready? | What it needs |
|---|---|---|
| **Reasoning graph** (why this differential) | ✅ **Already works** | Nothing — the evidence trail is live in the UI |
| **Semantic search** over conditions | 🟡 Close | 394 narratives exist; needs an index, no schema change |
| **Knowledge graph** (conditions + findings) | 🟡 Close | Extractable today; add typed condition-condition edges |
| **Evidence graph** | ❌ Blocked | KD-01 — no evidence exists to build it from |
| **Patient graph** (patient → visit → finding → condition) | 🟡 Close | Visits already store tokens and differentials; needs a stable condition id |
| **Research graph** (cohorts, prevalence) | 🟡 Partial | Corpus exists and is consented; single-clinic until ADR-012 progresses |
| **Educational graph** (learning pathways) | ❌ Blocked | Needs `IS_A` and `PRECEDES` |
| **AI grounding / RAG** | ✅ **Strong** | Structured, tokenised, deterministic, with per-condition narrative. Best-in-class substrate — but with no citations to ground *to* |

---

## 5. Recommendations — none of which require a graph database

Ordered by value per hour. Every one is additive and backward compatible.

**1. Stable condition identifier (~20 h).** A short opaque `id` per condition,
never reused, never changed. Name and ICD become attributes. Unblocks every
graph, every registry export, and safe renaming. **Do this first — everything
else keys off it.**

**2. Evidence as edge attributes (~120 h + clinical time).** `evidence: [{claim,
source, verbatim, grade}]` on the condition, attributable to specific tokens.
Turns the graph from a structure into an argument.

**3. Type the tokens (~30 h).** Populate `type_hint` consistently: symptom,
sign, measurement, investigation, history, derived. Already in the registry
schema; just unused.

**4. Condition-to-condition edges (~120 h).** Start with `VARIANT_OF`, which is
already encoded in 89 condition names and can be largely inferred and then
clinically confirmed. Then `LEADS_TO`. **⚠ Each edge is a clinical assertion
and needs the founder.**

**5. Adjacency export (~16 h).** A read-only `nodes[] / edges[]` export from
`loader.js`. No database, no dependency — it just makes the graph that already
exists visible and testable, and lets anyone experiment without touching the
runtime.

**6. Keep the flat files (0 h).** Do not adopt a graph database. At 394
conditions the whole graph is ~4,000 edges and the engine traverses it in
0.7 ms. A graph database would add operational weight, break offline-first, and
buy nothing until the knowledge is perhaps 10× larger and relationships are
real. **Revisit at ~3,000 conditions or when `LEADS_TO` chains are being
traversed more than two hops.**

---

## 6. The one-line answer

**Entopic's knowledge is graph-shaped already, and the right move is to make
that explicit in the data — a stable id, typed tokens, typed condition
relationships and evidence on the edges — while keeping it in flat files.**

The structure is not the problem. The missing pieces are the same two things
every other Phase 3 document lands on: **evidence, and a clinician's
signature.**
