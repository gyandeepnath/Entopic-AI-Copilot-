# Entopic — Roles, Modes & Access Tiers (plan)

*Planning document. No build yet — this is the "think extensively and plan"
deliverable for the multi-persona idea. It commits nothing; it lays out a model,
a recommendation, and the few decisions that are yours (product + spend). Obeys
every `CLAUDE.md` guardrail; §8 checks each one.*

---

## 0. The one insight this whole thing hinges on

**"Who you are" and "what you've paid for" are two different questions. Keep them
on two separate axes.** Almost every product that gets this wrong ends up in a
mess where a student on a university licence is treated like a paying clinic, or
a clinician evaluating the free tier can't see what they'd get.

- **Role** = a *persona / mode*. It shapes the **UI and workflow** — what the app
  opens to, what it emphasises, the vocabulary, the default landing screen.
  (Student, Clinician, Faculty, Admin, Researcher, …). The user can **switch**
  roles; a faculty member is also a clinician some days.
- **Entitlement (Tier)** = a *capability set*. It decides **what is unlocked**
  (Free / Pro / Institutional). It comes from the account/licence, not from the
  role.

A user therefore has **one active role** (a hat they can swap) and **one
entitlement** (what their licence grants). Features check *both*: "is this
relevant to my role?" (show/hide) and "is this in my tier?" (unlocked/locked).

This separation is what lets us give **students the full clinical-reasoning
engine for free** (adoption!) while **charging clinics for the practice-running
features** — cleanly, without ever gating safety.

---

## 1. The startup experience

1. **First run → a friendly "Who are you here as?" picker.** Big cards, plain
   language, no jargon. Choosing a role tailors everything after it. (This is the
   only new "gate" before the app — it is skippable to a sensible default so we
   never trap someone.)
2. The choice is stored locally (`activeRole`) and the **home screen reorganises**
   around it (see §3). Offline, instant, no account required.
3. A **role switcher** lives in the header/home so switching is one tap. Nothing
   is hidden irreversibly — switching to Clinician always reveals the full
   workflow.
4. **Entitlement** is separate: today everyone is effectively "Free/local"; when
   the backend exists, signing in with a licence upgrades the tier. Until then,
   locked features show an honest **"available in Pro / Institutional"** state —
   no fake paywall, no charging.

---

## 2. The personas (modes)

Each persona = a job-to-be-done → a default mode. "Build now?" flags what is
reachable by *reorganising existing features* vs. what needs the backend.

| # | Role | Job-to-be-done | Opens to (default mode) | Emphasised (already exists) | Tier | Build now? |
|---|------|----------------|--------------------------|------------------------------|------|-----------|
| 1 | **Student** | Learn clinical reasoning; study & self-test | **Study** — Casebook + KB browser | Full glass-box engine as a *tutor*, About-condition notes, casebook (grouped/filterable), quiz/"guess-the-dx" mode, reference | **Free** | ✅ mostly |
| 2 | **Clinician / Optometrist / Doctor** (solo) | Run real exams fast; document, prescribe, refer, code | **Patients** dashboard (today's default) | Fast exam capture, engine advisory, SOAP note, Rx, referral, coding/superbill | **Pro** | ✅ (gating later) |
| 3 | **Faculty / Educator** | Teach, curate teaching cases, assess, publish | **Casebook + authoring** | Case annotation/publishing, KB authoring, student logbook review, Present mode | **Pro / Institutional** | ◻ partial |
| 4 | **Hospital / Clinic Admin** | Manage clinicians, audit, throughput, coding compliance | **Org dashboard** | User mgmt, audit trails, aggregate quality/coding metrics, tenant settings | **Institutional** | ✗ needs backend |
| 5 | **Multi-clinician team** | Tech → OD → MD hand-off on one exam | **Shared worklist / role-in-exam** | Real-time multiplayer, per-role views of one reasoning state, supervision | **Institutional** | ✗ needs backend+realtime |
| 6 | **Researcher** | Study de-identified aggregate data; calibration/RWE | **Cohort / analytics** | De-identified cohort filters, calibration dashboards, governed export — **never raw PII** | **Institutional / Research** | ✗ needs backend+governance |
| 7 | **Conference / Workshop** | Present interactive reasoning live | **Present mode** (projector-clean) | Full-screen glass-box reasoning graph, load a case, step through, "what-if" | **Free / Pro** | ◻ reuses flowmap |

**Recommendation: ship roles 1–3 first** (Student, Clinician, Faculty). They are
reachable now by reorganising features Entopic already has (the engine, casebook,
KB browser, SOAP note, KB authoring, flow map). Roles 4–6 are genuinely
backend-and-governance projects; role 7 (Present) is a cheap follow-on that
reuses the existing full-screen reasoning graph.

---

## 3. Role-tailored home (Phase 1, no new features)

Same app, re-emphasised. The home screen already renders a set of cards; per role
we reorder and relabel them:

- **Student** opens to **📚 Casebook** + **📋 Knowledge Base** + a new **Study /
  Quiz** entry; the patient dashboard is present but demoted to a clearly-labelled
  **"Practice patients (sandbox)"** area. Billing/Rx/cloud cards hidden.
- **Clinician** opens to the **Patients dashboard** exactly as today; Casebook and
  KB are secondary; Pro features (cloud sync, exports) visible, locked if not
  entitled.
- **Faculty** opens to **Casebook (authoring)** + **KB Editor** + student review;
  the exam workflow is available for demos.

Nothing is torn out — this is card ordering + show/hide driven by a `roles.js`
capability map. Fully reversible.

---

## 4. Capability map (feature × role × tier)

`✓` = shown & on · `·` = hidden (not relevant to this role, still reachable via
switch) · `🔒` = shown but locked to a higher tier. Safety rows are **always ✓**.

| Capability | Student (Free) | Clinician (Pro) | Faculty (Pro/Inst) | Admin (Inst) | Researcher (Inst) |
|---|---|---|---|---|---|
| **Diagnostic engine + glass-box "why"** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Red-flag safety alerts** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Advisory-only framing** | ✓ | ✓ | ✓ | ✓ | ✓ |
| Offline exam path | ✓ | ✓ | ✓ | ✓ | ✓ |
| Knowledge-base browser + About notes | ✓ | ✓ | ✓ | ✓ | ✓ |
| Casebook (study: grouped/filterable) | ✓ | ✓ | ✓ | · | ✓ |
| Quiz / self-test mode | ✓ | · | ✓ | · | · |
| Real patient records (PII) | 🔒 sandbox only | ✓ | ✓ | ✓ | · |
| SOAP note / documentation | ✓ (practice) | ✓ | ✓ | ✓ | · |
| Prescription printing (real Rx) | 🔒 | ✓ | ✓ | ✓ | · |
| Coding / superbill | · | ✓ | · | ✓ | · |
| Cloud backup / multi-device sync | 🔒 | 🔒→Pro | 🔒→Pro | ✓ | · |
| Casebook **publishing** / course library | · | · | 🔒 Inst | ✓ | · |
| KB authoring / propose to commons | 🔒 (suggest only) | 🔒 | ✓ | ✓ | · |
| Multi-clinician live workflow | · | 🔒 | 🔒 | ✓ | · |
| Org admin / audit / quality metrics | · | · | · | ✓ | · |
| De-identified research export | · | · | · | 🔒 | ✓ (consent-gated) |
| Present mode | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 5. The free-vs-paid principle (recommendation — your call)

> **Free where it teaches. Paid where it runs a practice.**

- **Always free, for everyone, forever:** the diagnostic engine, the glass-box
  reasoning, red-flag safety, the knowledge base + About notes, the casebook for
  study, quiz mode, Present mode. This is the adoption engine and the mission —
  and it costs us nothing per user (offline, no API).
- **Paid (Pro):** the things a *practice* needs — real patient records at scale,
  prescription printing, coding/superbill, cloud backup & multi-device sync,
  exports.
- **Institutional:** multi-clinician workflow, org admin/audit/quality, casebook
  publishing, research export — the backend-heavy, multi-seat features.

Why this split is the right one, not a cynical one: students genuinely don't need
billing or cloud-sync; clinicians genuinely do. We give away exactly the part
that builds skill and trust (and future clinicians who carry Entopic into
practice), and charge for the part that earns a clinic money. Nothing about
safety or reasoning is ever behind a paywall.

**This is a spend/product-direction decision — it's yours.** I've recommended a
split; tell me where to move the lines.

---

## 6. Phasing

- **Phase 1 — now, no backend, reversible (safe to build on your word):**
  role picker + `activeRole` + role switcher + role-tailored home + a capability
  map that shows/hides and shows honest "🔒 Pro/Institutional" states (no real
  charging). Student sandbox framing. Optionally Present mode (reuses the
  flow-map). *Pure presentation/config over existing features.*
- **Phase 2 — needs the backend & real decisions (each founder-gated):**
  account/licence tiers with **real** entitlement enforcement (the current
  cloud-config/cloud-sync scaffolding is the seed, but turning it into a licensing
  authority is an architecture + likely spend decision); hospital admin;
  multi-clinician realtime; researcher cohort/registry with consent governance.
- **Phase 3 — platform:** faculty publishing → the knowledge-pack commons /
  marketplace (Vision Moves 3 & 8).

---

## 7. How it lands in code (Phase 1, minimal, evolve-not-replace)

- New **`js/roles.js`**: a declarative `ROLES` config (id, label, blurb, default
  landing, `capabilities` visibility map) + `getActiveRole()/setActiveRole()`
  (localStorage) + `can(capabilityId)` (role visibility × entitlement tier) +
  `entitlement()` (local flag now; account-driven later).
- New **role-picker screen/modal** (first run + from the switcher).
- **`renderHome()`** consults the active role to order/show cards (a small,
  bounded change — no teardown; the current layout is just the Clinician default).
- Locked features render a shared **🔒 badge + one-line "why/what tier"** — no
  payment code, no backend, nothing irreversible.
- Entitlement is a single local value until the backend exists; **no pricing or
  payment is built in Phase 1.**

Everything Phase 1 is presentation + config, gated behind a role the user chose,
fully reversible by switching roles or clearing the setting.

---

## 8. Guardrail reconciliation (`CLAUDE.md`)

- **Advisory-only / red flags un-suppressible / offline-first:** these are the
  "always ✓" rows in §4 — on for **every** role and **every** tier, including
  free students. Safety and the deterministic engine are never gated. Non-
  negotiable, unchanged.
- **LLM never diagnoses:** roles change UI/visibility only; no role routes
  diagnosis through an LLM.
- **Privacy / PII:** the Student **sandbox** keeps trainees away from storing real
  patient PII; the Researcher role sees **only de-identified, consented** data —
  never raw PII. Separation of PII from analytics is strengthened, not weakened.
- **Preserve the product, evolve don't replace:** the exam flow, engine, advisory
  panel and glass-box map are untouched; roles reorganise emphasis around them.
  The Clinician role *is* today's app.
- **Pause before spend / architecture:** Phase 1 builds **no** payment and **no**
  licensing backend. The free/paid split and any real entitlement enforcement are
  flagged as **your decisions** (§5, §9) and are not built until you choose.

---

## 9. Decisions for you (the founder)

1. **Which personas ship first?** Recommend **Student + Clinician + Faculty**
   (buildable now); defer Admin / Multi-clinician / Researcher to the backend
   phase. Agree, or reprioritise?
2. **The free-vs-paid split (§5).** Recommend "free where it teaches, paid where
   it runs a practice." Confirm, or move specific lines (e.g. should SOAP export
   be free for students? should cloud backup be free?).
3. **Student data stance:** practice/**sandbox patients only** for the free
   student tier (recommended, cleanest for privacy), or allow real records?
4. **Pricing** itself — later, once the split and the backend are settled. Not
   needed to start Phase 1.

Say the word on 1–3 and I'll build Phase 1 (role picker + tailored home +
capability map, no charging, fully reversible). Pricing/enforcement stays parked
until you decide.

*— End of plan. Nothing in the build was changed.*
