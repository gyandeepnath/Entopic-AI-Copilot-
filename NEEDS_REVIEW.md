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
   engineering increment. **DECIDED (2026-07-13): quality-gated trajectory** —
   grow in validated batches paired with exam-input enrichment; no raw-volume
   dumping. Cloud/owner publish setup deferred (wanted for the future).

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

### 🟧 How history flags map to engine tokens — found in the 2026-09-24 audit
The audit fixed one mapping that was plainly wrong and **left these for you**,
because each is a clinical judgement about what a history item is evidence FOR.
Nothing below was changed.

1. **One generic `family_history` token for five different diseases.** A family
   history of glaucoma, AMD, retinal detachment, keratoconus or high myopia all
   emit the same token. Eleven hereditary conditions *require* it (Lattice,
   Granular, Macular and PPCD corneal dystrophies, Best disease, Choroideremia,
   FEVR, LHON, …) and ~42 use it as support — so a family history of **AMD**
   currently supports **POAG** and satisfies **Lattice Corneal Dystrophy**'s
   requirement. Suggested fix (needs you): one token per family flag
   (`family_history_glaucoma`, …) and you choose which conditions each supports.
2. **Family history of diabetes / of strabismus now contribute nothing.**
   Diabetes used to emit the PATIENT's own `diabetes_history` — the token
   Diabetic Macular Edema, PDR and Diabetic Papillopathy *require* — so a
   patient with distortion and a diabetic parent was shown Diabetic Macular
   Edema. That is fixed. Should either flag support anything?
3. **Past uveitis / herpes → `recurrent_episode`.** That token is *required* by
   Sebaceous Gland Carcinoma, Canaliculitis and Blepharochalasis, among others,
   so a past uveitis satisfies part of a carcinoma's definition.
4. **Past amblyopia → `suppression`.** Is a history of amblyopia evidence of
   current suppression?
5. **The fundus finding "Microaneurysms" emits `diabetes_history`** — a finding
   asserting a history. Possibly intended (undiagnosed diabetes); please confirm.
6. **The "pain + photophobia" safety gate named "Keratitis"**, which matched no
   condition (there are fourteen keratitis entries), so it never surfaced one.
   The dead name was removed — behaviour is unchanged. Which keratitis, if any,
   should that gate force onto the list?

### 🟧 How medications map to engine tokens — found in the 2026-10-27 audit
The medication list feeds the engine by matching words in each drug's listed
side effects (`getMedicationTokens`, js/medication-checker.js). Measured on the
real engine with nothing recorded except the drug:
1. **Changed (please confirm):** isotretinoin, SSRIs and anticholinergics used
   to add `dryness`, the token for dryness the patient reports or the slit lamp
   shows, which the dry-eye conditions *require*. "Sertraline 50mg" alone
   produced two dry-eye diagnoses and exposure keratopathy. The drug no longer
   adds it. Real dryness still adds it through the symptom or finding, and the
   risk is still listed in the medication review.
2. **Not changed:** "Prednisolone 5mg" alone produces **Drug-induced Cataract
   (Steroid)**, because that condition requires only `steroid_history`. Should
   it also require a lens finding (`psc_opacity`) or a visual symptom?
3. **Not changed:** amiodarone's listed "Optic neuropathy" raises no token. The
   matcher looks for "optic" + "neuritis", which only ethambutol's "Optic
   neuritis (toxic)" contains. Should amiodarone raise `toxic_optic_risk`?

### 🟧 Urgent alerts for conditions missing a REQUIRED finding — DONE as option (c), please confirm
**Done in the engine audit (2026-10-27), as recommended below.** The automatic
banner now needs every required finding present. The one exception is a
present finding that is distinctive (listed by ≤ 5 conditions), so that
"high-speed particle" still raises Intraocular Foreign Body before pain is
recorded. The condition is still listed either way. The hand-written red flags
are unchanged. To undo it, raise `derived_alert_partial_df_max` very high (the
exception then applies to everything). Original finding:

A 58-year-old with flashes, floaters and a left RAPD, and **no diabetes
recorded**, gets two extra urgent banners:
- "Proliferative Diabetic Retinopathy — urgent condition in the differential
  (match 17)", although PDR *requires* `diabetes_history`;
- the same for Acute Retinal Necrosis.

They come from the automatic "urgent condition in the differential" alert. It
fires for any urgent condition shown at a match of 15 or more
(`derived_alert_min`, Clinical Safety Register CS-06). It is set to equal the
display floor on purpose, so that nothing urgent is shown without a banner.
The cost is alert fatigue next to the two real red flags. Options:
- (a) keep;
- (b) raise `derived_alert_min` (in `knowledge/clinical-thresholds.js`);
- (c) no derived banner when a required finding is absent, while still
  listing the condition.

Recommendation: (c). It is your call, because it changes what triggers an
urgent banner.

### 🟧 Definitions that let one common symptom name a specific diagnosis — engine audit 2026-10-27
The engine can now only be as specific as the definitions. These conditions
need just **one common finding** as their whole required set. Each is
therefore listed (at a low score) whenever that symptom is recorded, and in
rich presentations they can sit high because they have nothing listed against
them:
- **"pain"** alone → **Traumatic Iritis** (trauma is only *supportive*; it
  sat 2nd on an allergy + uveitis picture with no trauma recorded),
  **Lens-induced Uveitis**, **Herpetic Anterior Uveitis**.
- **"pain_severe"** alone → **Microbial Keratitis**, **Corneal Ulcer**,
  **Herpes Zoster Ophthalmicus (Corneal)**, **Acute Angle Closure Crisis**.
  On a textbook angle-closure picture (IOP 52, halos, vomiting) the three
  keratitis entries come 2nd–4th at 52% while explaining 1 of 5 findings.
- **"blur"** alone → **Diabetic Retinopathy**, **Posterior Uveitis**,
  **CRVO**, **Corneal Edema**.
- **Optic Atrophy**: pale disc is only supportive/test, so its required set
  is "reduced vision" alone. That finding no longer creates a diagnosis on
  its own, so Optic Atrophy now needs other support.

Options, per condition: (a) add the defining finding as **required**, e.g.
`trauma_history` for Traumatic Iritis, a corneal finding for the keratitis
entries, a raised IOP or angle finding for angle closure; (b) leave as is.
Recommendation: (a) for Traumatic Iritis and the keratitis entries. **The
choice of defining finding is clinical, so nothing was changed.**

### 🟧 Pairs the engine cannot separate on their own definitions — engine audit 2026-10-27
On its own full presentation, each of these comes **second** to its partner.
The two definitions are nearly identical, so the engine has no basis to tell
them apart:
- **Punctal Stenosis** vs **Epiphora (Lacrimal Obstruction)**
- **Aniridia** vs **Ocular Albinism**
- **Anterior Polar Cataract** vs **Nuclear Sclerotic Cataract**

A distinguishing finding in either definition would fix each pair.

### 🟧 Age listed as a contradiction — engine audit 2026-10-27
63 conditions list `older_age` (60 and over, `age_older`) **against** them.
Among them are **Central Serous Chorioretinopathy (Chronic)** and **Corneal
Hydrops**. With an age of 60 typed in, each loses 45% of its score, enough
to leave the list on its own textbook picture. **Giant Cell Arteritis**
*requires* `older_age`, so a patient under 60 cannot have it complete.
Please check (1) the 60 cut-off for GCA and (2) whether older age should
count *against* chronic CSC.

### 🟦 New engine settings from the audit (engineering, not clinical) — 2026-10-27
All are marked UNVERIFIED in `knowledge/clinical-thresholds.js`, each with the
measurement behind it:
- `exclusion_demote_factor` 0.5;
- `nondiscriminating_share` 0.5;
- `derived_alert_partial_df_max` 5;
- `urgent_sort_bonus` 0.02 (was 0.08);
- `second_problem_min_findings` 2;
- `unexplained_weight` 0.30 (in `SCORE_WEIGHTS`).

Nothing to decide unless a ranking looks wrong to you in clinic. If one does,
these are the knobs.

### 🟦 Should editing a condition's About summary require re-review? — 2026-10-27
A sign-off covers "findings, urgency, ICD code and About summary", but the
fingerprint that makes a sign-off go stale includes the findings, urgency,
route, exclusions and ICD code — **not the About summary** (it lives in a
separate file). So a later change to a summary keeps your signature. Including
it is easy, but it would send **every condition you have already signed back
for re-review** once. Options: (a) leave as is; (b) include it from now on and
re-review once; (c) include it only for sign-offs made after the change.
Recommendation: (c).

### 🟧 OSDI "N/A" and corneal thickness in two places — found in the 2026-10-27 audit
1. **Changed (please confirm):** the OSDI now offers N/A on items 6–12 (reading,
   night driving, computer, TV, wind, low humidity, air conditioning) and leaves
   N/A items out of the count, as the published form's scoring does. Items 1–5
   have no N/A. Please check this against the OSDI form you use.
2. **Not changed:** corneal thickness can be entered on the IOP page ("CCT") or
   on the Investigations page ("Pachymetry"). The engine's thin-cornea rule
   (CCT < 520 µm → `thin_cornea`) reads **only the IOP-page field**, so a
   thickness entered as Pachymetry has no effect on the differential. Is the
   Investigations "Pachymetry" a central reading the engine should also use?

### 🟧 Exclusion rules delete by name fragment — DONE as option (c), please confirm
**Done in the engine audit (2026-10-27).** An exclusion now **demotes** its
target (×0.5, `exclusion_demote_factor`) and labels it "less likely given …".
It never removes it. Only a condition scoring higher than its target can
demote it. A target with every required finding present, and any urgent
condition, is never demoted. Measured: of 40 exclusion pairs presented
together, 18 lost a condition before and 0 now. Option (b), naming the exact
conditions excluded instead of a fragment such as "uveitis", is still yours
to decide: the fragments still reach the same 24 entries, only gently now.
Original finding:

When a condition scores ≥ 0.5 its exclusion list removes matching conditions
from the differential entirely (urgent ones are always kept). Matching is by
name fragment, so **"Allergic Conjunctivitis" excluding "keratitis" and
"uveitis" deletes all 10 non-urgent keratitis entries** (Herpes Simplex,
Contact Lens Related, Marginal, Interstitial, …) **and all 14 uveitis entries**.
Allergic eye disease (VKC/AKC) can itself cause keratitis. Options:
(a) keep; (b) name the specific conditions excluded; (c) make exclusion
down-rank instead of delete. Recommendation: (b), and consider (c) generally.
Two other rules are inert by design (they target urgent conditions, which are
never excluded): Dry Eye (MGD) → "acute_keratitis", POAG → "acute_angle_closure".

### 🟧 Spectacle advisor: blue-light wording — changed 2026-09-24, please confirm
The advisor said a blue-light filter "reduces digital eye strain" and ranked it
"recommended" for ≥3 h/day screen use. A Cochrane systematic review found
blue-light filtering lenses **may not** reduce eye strain with computer use
(low-certainty evidence) and have probably no effect on acuity: Singh S, Keller
PR, Busija L, et al. *Cochrane Database Syst Rev* 2023;8:CD013244,
doi:10.1002/14651858.CD013244.pub2 (retrieved via PubMed). The claim is removed
and the option is now "optional … not shown to reduce digital eye strain". The
"Anti-fatigue / blue light lens" suggestion (≥6 h/day) no longer promises
strain reduction. Confirm, reword, or remove.

### 🟦 No way to delete a patient record in the app — found 2026-09-24
`deletePatient()` exists (typed-name confirmation, snapshot first, tombstones to
other devices; hardened in this audit) but **no screen calls it**. A clinic that
receives an erasure request, or registers a duplicate, cannot remove the record.
Adding it is a product decision (who may delete; admin only?; retention rules
for clinical records differ by jurisdiction and may *forbid* deletion for a
number of years). Recommendation: admin-only, with the jurisdiction's retention
rule shown in the confirmation.

---

## For later (architecture — needs a decision + possibly spend)

### 🟥 Run db/migrations/006 on your Supabase project — 2026-10-27
It closes the cross-clinic data leak in `orphan_visits`, the guessable join
codes, unattributed audit rows, and self-granted paid tiers (CHANGELOG, part
2). Paste it into the Supabase SQL editor and run it once; re-running is
harmless. It **rotates** any existing short join codes. Nobody could see them
in the app, so in practice this breaks nothing.

### 🟧 Archive files are not encrypted — found 2026-10-27
When old visits are archived, the downloaded archive file is plain JSON with
those visits' full clinical content, even with the vault on. Backups, by
contrast, are encrypted by default. The on-device copy is now sealed. The
file itself needs a decision. It must stay restorable years later on a
different machine, so it cannot use this device's vault key. That leaves a
passphrase you must not lose (like backups), or unencrypted as now.
Recommendation: the same passphrase as backups, entered once per archive.

### 🟦 Who may set the AI key — found 2026-10-27
Any signed-in user can set the AI key or proxy in Account. That decides
whether de-identified clinical text leaves the device, and it bills the
practice. Connecting cloud sync is admin-only for the same reason.
Recommendation: make the AI connection admin-only too.

### 🟧 Cloud encryption key strength — found 2026-10-27
What the cloud stores is encrypted with a key derived from the clinic
passphrase using 150,000 PBKDF2 iterations, and the passphrase can be as
short as 8 characters. Someone holding a copy of the cloud database could try
passphrases offline, and at that setting a short passphrase falls quickly.
OWASP recommends 600,000 iterations for this algorithm (now used for
passwords, the device vault and backup files). It is not changed here
because every device in the clinic must derive the same key: changing it
means **re-encrypting the whole cloud copy** and updating every device at
once, and the stored envelopes do not yet record which setting made them.
Recommendation: before real patient data goes to the cloud, (1) add a key
version to the envelope, (2) move to 600,000 and a 12-character minimum,
(3) re-encrypt in one supervised step.


### 🟦 Two devices editing the same patient's investigation orders — found 2026-09-25
Order changes now reach other devices (before the audit they never did). Cloud
sync resolves a whole **patient record** at a time. If device A (clinician)
and device B (technician) both change the same patient's orders **before
either has synced**, B's change is recorded as a sync conflict: A's version
is kept, the conflict is logged, and B's results do not merge in by
themselves. Normal use (B records results, syncs, then A reviews) is not
affected. The proper fix is to store orders as their own synced records, one
per order, instead of a list inside the patient. That is an architecture
change I have not made. Recommendation: do it before the investigations
workflow is used across devices in a busy unit.

### 🟦 Practice (student) records sync to the cloud like real ones — found 2026-09-25
When cloud sync is on, practice exams are encrypted and sent like real
records, and count toward the clinic's cloud storage. Whether practice data
should leave the device at all is a product decision. Recommendation: keep
practice records on the device only.


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
