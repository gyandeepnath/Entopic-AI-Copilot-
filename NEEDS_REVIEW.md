# NEEDS_REVIEW — items awaiting the founder's decision

This is the running list of things the engineering work **deliberately did
not decide**, because they depend on clinical judgment, product direction, or
spend. Nothing here was silently guessed. Clear an item by confirming or
correcting it; then it can be removed.

Legend: 🟥 clinical-safety-adjacent · 🟧 clinical accuracy · 🟦 product/architecture

---

## Clinical content to verify

### 🟧 Expansion batches (88 provisional conditions) — review via the editor
`knowledge/expansion.js` holds **88 AI-drafted conditions** (batches 1 & 2)
that grew the KB from 137 → **225**. Every one is structurally valid, can
actually fire, and doesn't perturb the curated differentials (all enforced by
`tests/kb-expansion.test.js`) — but the **clinical content is provisional**:
the token choices are textbook approximations from the existing vocabulary, and
none have ICD codes yet. Please review them (ideally in the **Knowledge Base
Editor** → open each, correct tokens/urgency, add an ICD code, save). They are
segregated in one file, so anything you dislike is trivial to fix or drop.

**Reaching "at least 5x" (≈685):** this is deliberately an ongoing, gated
process, not a one-shot dump. Two reasons engineering paced it this way:
1. **Safety** — mass-generating hundreds of "verified-looking" conditions
   would violate the never-fabricate rule; the gated editor+seeder pipeline
   keeps every addition provisional and structurally sound.
2. **Distinguishability** — with the current ~262 producible tokens, past a
   few hundred conditions new entries start becoming mutual near-duplicates the
   engine can't tell apart (which would *hurt* accuracy). Getting cleanly to 5x
   therefore pairs more condition batches with **expanding the exam's input
   surface** (more symptoms/signs/measurements → more tokens), so the added
   conditions stay distinct. That input-surface growth is the recommended next
   engineering increment. **Decision for you:** happy with this
   quality-gated trajectory, or do you want raw volume prioritized sooner?

### 🟧 ICD-10 code mappings — ALL 130 conditions now coded
Every code in `knowledge/icd-map.js` was looked up and validated as a real,
billable ICD-10-CM 2026 code via the ICD-10 tool — but a *valid* code is not
necessarily the *right* code for the intended clinical entity, and defaults use
the **unspecified eye/stage** variant. Please confirm each mapping. The entries
marked `caution` in the file are the judgment calls that most need your eye:
- **Diabetic Retinopathy** → `E11.319` — **assumes type-2 DM and no macular
  edema.** Type-1 is `E10.319`; severity/ME change the code. This is the most
  important one to confirm.
- **CRVO / BRVO / CME / PVD** → these default to a specific eye ("right") or a
  stability/edema status because ICD requires it. Refine per patient.
- **Microbial Keratitis** → `H16.9` (unspecified keratitis) — organism-specific
  or corneal-ulcer code instead?
- **Compressive Optic Neuropathy** → `H47.099`; **Cortical Visual Impairment**
  → `H47.619` (cortical blindness); **Quadrantanopia** → `H53.459`;
  **Divergence Insufficiency/Excess**, **Accommodative Infacility**, **Fusional
  Vergence Dysfunction** — all mapped to non-specific buckets (no dedicated
  code exists).
- **Choroidal Melanoma** → `C69.30` (site code, not melanoma-specific).
- **Keratoglobus** and **Pellucid Marginal Degeneration** share `H18.719`
  (corneal ectasia).
- **HLA-B27 Uveitis / Traumatic Iritis** → generic iridocyclitis codes; the
  systemic association / external cause should be coded separately.

Laterality/stage capture in the UI is still a product decision (the coding
page currently shows a laterality dropdown but doesn't yet drive the code).

### 🟧 Seven new conditions (2026-07-12 expansion) — verify before trusting
Added to reduce dangerous KB gaps; each is an **AI-authored textbook feature
set**, provisional until you confirm. Flagged inline in the KB files too.
- **Orbital Cellulitis** (urgent) — req `lid_swelling_diffuse` +
  `pain_eye_movement`; excludes preseptal cellulitis (correct direction).
  Confirm the feature set and that suppressing preseptal when orbital scores
  high is what you want.
- **Endophthalmitis** (urgent) — req `pain_severe` + `reduced_vision`, sup
  includes `post_surgery`, `hypopyon_visible`. Confirm.
- **Scleritis** (urgent) vs **Episcleritis** (benign) — scleritis req
  `deep_boring_pain`; excludes episcleritis when it scores high. Confirm the
  discriminators (deep boring pain, pain worse at night, phenylephrine
  no-blanch) and that scleritis should be flagged urgent.
- **Thyroid Eye Disease** — req `proptosis`; sup `thyroid_history`,
  `lid_retraction`, restrictive diplopia. Confirm.
- **Horner Syndrome** (urgent) — req `ptosis` + `anisocoria`; **`con:
  diplopia`** is the discriminator vs CN III palsy — confirm that's clinically
  right. Confirm urgency (an acute painful Horner can be a carotid
  dissection).
- **Migraine with Visual Aura** — req `scintillating_scotoma`; `con: redness,
  field_loss`. Confirm.

ICD-10 codes for all seven were looked up as real/billable (FY2026) but
default to unspecified eye/laterality and some are site/neurologic buckets —
same review status as the rest of `icd-map.js`.

### 🟥 Leukocoria alert wording
`js/engine.js` now fires an urgent alert on the `leukocoria` token:
> "Leukocoria — URGENT referral: rule out retinoblastoma / congenital cataract"

Engineering added this phrasing. Please confirm the wording and the referral
urgency are what you want a clinician to see.

### 🟧 Unresolvable exclusion targets (1 remaining)
One exclusion rule still points at a condition that doesn't exist in the KB,
so it can never fire (flagged inline with `NEEDS_CLINICAL_REVIEW`):
- **Dry Eye (Evaporative/MGD)** excludes `acute_keratitis` — no such condition.
  Which keratitis (if any) should this suppress?

~~Preseptal Cellulitis excludes `orbital_cellulitis`~~ — **RESOLVED
2026-07-12**: Orbital Cellulitis added as an urgent condition with the
correct-direction exclusion; the inverted rule was removed.

---

## Scoring / methodology (affects diagnostic ranking — your call)

### 🟧 Sparse-definition score inflation — RESOLVED 2026-07-12 (please sanity-check)
**Fixed** at your go-ahead. The engine no longer normalizes against each
condition's own maximum (the mechanism that let leaner definitions win).
Score is now: required-criteria fraction (60%) + saturating credit for
*matched* supportive tokens (25%) + saturating credit for *matched* objective
tests (15%), with per-contradiction penalties and a small temporal
multiplier. The textbook dry-eye picture now ranks correctly:

| Condition | Old score | New score |
|---|---|---|
| Dry Eye Disease – Evaporative (MGD) | 0.61 (3rd) | **0.89 (1st)** |
| Dry Eye Disease – Aqueous Deficient | 0.64 | 0.74 |
| Exposure Keratopathy (Surface Related) | **0.67 (1st)** | 0.68 |

All golden vignettes passed unchanged. **What still needs you:** the weights
(0.60/0.25/0.15, contradiction ×0.55, temporal ×1.08/0.85) are *structural
engineering constants*, not calibrated clinical statistics. Turning them into
likelihood-ratio-style values needs real outcome data — that's what the
registry flywheel is for. Please eyeball a handful of differentials against
your clinical judgment and tell me if any ranking feels off.

---

## For later (architecture — needs a decision + possibly spend)

### 🟦 Backend / persistence (Supabase) — BUILT (free tier)
Done, at your go-ahead: Supabase project `entopic` (free tier, $0/mo), full
schema + RLS + Realtime, and an offline-first client sync layer. Tenant
isolation is proven server-side. See `docs/CLOUD_SETUP.md`. Open items for you:
- **Run the live two-browser sync test** once on a normal network (the build
  sandbox couldn't reach the project domain to test the WebSocket live). Steps
  are in `docs/CLOUD_SETUP.md`.
- **Multi-clinician invites**: today the clinic *creator* self-enrolls; adding
  teammates to an existing clinic needs an invite flow (next backend step).
- **Enable leaked-password protection** (Supabase Auth → one toggle;
  HaveIBeenPwned check). Minor, recommended.
- **Push the full KB to the cloud** table when ready:
  `node tools/seed-cloud-kb.js` (idempotent upsert). A 5-condition sample is
  seeded now to prove the round-trip.

### 🟦 Registry flywheel (de-identified encounters → cloud) — READY, awaiting go-ahead
Every completed exam already builds a **fully de-identified** encounter record
(`buildAnonymizedEncounter` in `js/storage.js`: age *bracket* not DOB, sex,
symptom/finding/diagnosis tokens, treatment *category* — no names, no free
text, no PII) and queues it locally in `registry_queue`. Nothing drains that
queue yet, so it just accumulates on-device.

Wiring it to the existing cloud `encounters` table would give you an anonymized
clinical registry — the raw material for calibrating the scoring engine against
real presentations (the "sparse-definition score inflation" item above needs
exactly this kind of data). It's a bounded, offline-first addition (same outbox
pattern as patient sync).

**Why engineering did not just switch it on:** it starts a *new outbound flow
of clinical data* to the cloud. Even fully de-identified, that's your call to
make, not a silent default. If you want it, say so and it gets built + tested
behind an explicit opt-in toggle (off by default). The de-identification is
already in place and unit-testable; the live round-trip needs a normal network
to verify (this sandbox can't reach the project domain).

### 🟦 Local persistence hardening — DONE
IndexedDB safety mirror (increment J) removes the "clear cache = lose clinic"
risk. A full IndexedDB primary store (replacing localStorage) remains a future
option but is lower priority now that the mirror + cloud backup exist.

### 🟦 Local app login is a convenience gate, not a security boundary
The in-app username/password (the very first screen) is stored **in plain
text in the browser's localStorage**, and all clinic data in localStorage is
readable by anyone with access to the device profile anyway. So this login
deters casual access only — it is not encryption and not real authentication.
(The **cloud** login is real authentication — Supabase Auth with proper
hashing.) Options, in increasing effort: (a) accept it as a device-local gate
and say so in the UI; (b) hash the stored password (stops shoulder-surfing
the storage, still doesn't protect the data itself); (c) encrypt clinic data
at rest with a key derived from the password — real protection, but a
forgotten password then means unrecoverable local data. Recommendation: (a)
now, revisit (c) if devices are shared. Your call.

### 🟦 Offline-first: fonts load from a CDN
`index.html` pulls web fonts from Google Fonts. Cosmetic (system-font
fallback works), but it's a network dependency in an offline-first app.
Low-priority: self-host the fonts to make the app fully self-contained.
