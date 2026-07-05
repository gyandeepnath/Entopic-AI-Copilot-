# Supabase integration — exploration for Entopic

**Status: ideas document, not a commitment.** Nothing here is built. No
project has been created and nothing costs money yet. The founder decides
what (if anything) proceeds, and in what order.

**The prime directive is unchanged:** everything clinical is stored and works
**locally**. The exam, the diagnostic engine, the knowledge base, the advisory
panel — all run with zero network, forever. Supabase (or any backend) is a
*satellite* around the local app: it syncs, backs up, authenticates, audits,
and distributes. If the internet disappears mid-exam, nothing changes.

The right mental model: **local-first, cloud-behind**. The device is the
source of truth during care; the cloud catches up when it can.

---

## 1. Backup that just happens (the first and biggest win)

**Today:** all clinic data lives in one browser's `localStorage` (~5 MB
ceiling). A cleared cache, a crashed disk, a stolen laptop, or even the
browser evicting storage = the entire clinic's records gone. The only
protection is remembering to click "Export JSON."

**With Supabase:** every save also drops the change into a local **outbox**;
whenever the device is online, the outbox drains to Postgres in the
background. The clinician never waits on it and never thinks about it.

- Device dies → sign in on a new device → the whole clinic is back.
- Works with the planned localStorage → IndexedDB upgrade (Phase 4): IndexedDB
  removes the 5 MB ceiling locally; Supabase removes the "one device" ceiling.
- Visits are append-mostly, so sync conflicts are rare and resolvable with
  simple last-writer-wins per field.

This alone justifies the integration for a real clinic. It is also the least
clever, least risky piece — a good first step.

## 2. Real sign-in and real multi-user (fixes the placeholder auth)

**Today:** usernames and **plaintext passwords in localStorage**, with a
hardcoded default password in the setup form. Fine for a single-machine demo;
untenable the moment a second person or second device exists.

**With Supabase Auth:** proper hashed credentials, email magic-links or OTP
(nice for non-technical staff — no passwords to forget), password reset that
actually works, and sessions that survive reinstalls.

- **Clinic → users → roles** (optometrist / ophthalmologist / technician /
  admin), matching the real hierarchy. Roles can gate capability: a technician
  records findings; only the doctor finalizes a diagnosis or signs a report.
- **Row-Level Security (RLS)**: the *database itself* enforces that a user can
  only ever see their own clinic's patients. Tenant isolation lives in the DB,
  not in easily-bypassed client code. This is the correct foundation for
  multi-tenant SaaS and the thing reviewers/auditors ask about first.

## 3. Multi-device clinic flow (the workflow unlock)

Once sync + auth exist, one patient chart can be open on multiple machines:

- Technician does VA/refraction/IOP pre-testing at one station → the doctor in
  the exam lane sees those values (and the engine's updated differential)
  appear live via Supabase Realtime.
- The 22-step flow maps naturally onto this: steps 1–10 at pre-testing, steps
  11+ in the lane, one shared visit record.
- "Presence" (who's currently with the patient) prevents two people editing
  the same station blind.

This turns Entopic from a single-seat tool into clinic software without
changing the UI concept at all.

## 4. PII separation, done at the database (privacy by architecture)

The codebase already separates the person (`blankPatient`) from the encounter
(`blankVisit`) — a genuinely good design. Supabase lets us formalize it:

- A `patients` table holding identifiers, tightly access-controlled (and
  candidates for column-level encryption), and an `encounters` table holding
  clinical data keyed only by an opaque patient ID.
- Analytics, the registry, and any AI feature read **only** the de-identified
  side. PII never leaves the clinic boundary except encrypted-at-rest backup.
- For India deployment this maps cleanly onto DPDP Act expectations (consent,
  purpose limitation, breach exposure minimization); for any future markets it
  is the HIPAA/GDPR-shaped posture too.

## 5. The anonymized registry → the validation flywheel (biggest strategic value)

`storage.js` already builds consented, de-identified encounter records
(`buildAnonymizedEncounter`: age bracket, sex, symptom/finding/diagnosis
tokens, treatment category) and queues them locally — today they go nowhere.

**With Supabase:** an Edge Function ingests that queue (opt-in, consented,
de-identified — enforced server-side, not just promised client-side) into a
research dataset. That dataset is:

1. **The calibration engine.** It answers "when Entopic says 80%, is it right
   80% of the time?" — the single number that makes the tool scientifically
   trustworthy, and the input the planned scoring rework (per-domain weights →
   likelihood ratios) needs to be defensible rather than hand-tuned.
2. **The clinical-validation evidence** for papers (JMIR / npj Digital
   Medicine class) and for the patent story.
3. **The feedback loop**: comparing the engine's suggestion with the
   clinician's final signed diagnosis (a field we already have) shows exactly
   where the KB is weak, condition by condition.

No other item on this list compounds in value over time the way this one does.

## 6. Knowledge-base distribution (ship clinical fixes without shipping an app)

The KB is content, not code. Right now a corrected ICD code or a new condition
means redistributing the whole app.

**With Supabase:** a `kb_versions` table + versioned, signed KB bundles in
Storage. The app checks for a newer bundle when online, downloads, verifies the
signature, caches it, and keeps working offline on the cached copy.

- Pairs perfectly with the review queue we already maintain: everything marked
  `NEEDS_CLINICAL_REVIEW` (ICD mappings, alert wordings, exclusion targets)
  could surface in a tiny founder-facing approval page; approving flips it to
  verified and cuts a new KB version that every clinic receives automatically.
- The founder becomes the editorial authority over a living knowledge base —
  the "peer-review workflow" from ARCHITECTURE.md §A.3, made concrete.

## 7. A safe home for the AI features (fixes a quiet security problem)

**Today:** `claude.js` calls the Claude API **directly from the browser**, with
the API key stored in localStorage. Anyone with access to the machine can lift
the key; there's no enforcement of what data accompanies a request.

**With a Supabase Edge Function as proxy:**
- The API key lives server-side only.
- The proxy can **enforce** de-identification (strip anything PII-shaped)
  before any text reaches a third-party model — turning our "never send PII to
  LLMs" guardrail from a promise into a mechanism.
- Per-clinic rate limits and usage metering (matters for SaaS pricing later).
- The firewall stays intact: the LLM remains interpretation-only, downstream,
  optional, and the whole feature degrades gracefully offline.

## 8. Images and drawings (Storage)

Slit-lamp/fundus sketches (`V.sl.drawings`, `V.fun.drawings`) and investigation
photos (`V.inv.photos` is currently just filenames) are exactly what
`localStorage` can't hold and Supabase Storage can: per-clinic buckets, RLS on
objects, signed URLs, local cache for offline viewing. This unlocks actually
attaching OCT/fundus images to visits — a real EMR capability.

## 9. Clinic-facing analytics (later, cheap once data exists)

Off the de-identified side only: case-mix dashboards (dry-eye prevalence,
glaucoma-suspect conversion, referral rates), recall/follow-up lists driven by
`plan.followup`, and engine-performance monitoring (suggestion vs. final
diagnosis agreement per condition). Useful to the founder as a clinician *and*
as evidence of product value when onboarding other clinics.

## 10. Patient-facing touches (much later, needs consent design)

The smart-intake questionnaire (OSDI/SPEED already implemented) could be sent
as a pre-visit link — patient answers at home, answers sync into the visit
before they arrive. Appointment reminders via scheduled Edge Functions.
Flagged as "later" deliberately: patient-facing = consent, identity, and
messaging costs; not needed to prove the platform.

---

## What Supabase must NEVER become

- **A runtime dependency for diagnosis.** The engine, KB, and full 22-step
  exam run offline, always. Sync is fire-and-forget; reads come from the local
  store; no spinner ever waits on the cloud during care.
- **A place where PII and analytics mix.** The two-table separation is
  structural, not conventional.
- **A silent scorer.** No diagnostic logic moves server-side. Determinism and
  inspectability stay on-device where the flow map can show them.

## Sequencing recommendation (each step independently shippable)

| Step | What | Depends on | Risk | Cost |
|---|---|---|---|---|
| 0 | IndexedDB local store (no Supabase at all) | — | Low | Free |
| 1 | Supabase project + Auth + clinics/users/RLS | 0 | Low | Free tier |
| 2 | Outbox sync: patients + visits (backup-by-default) | 1 | Medium | Free tier |
| 3 | Anonymized-registry ingestion (the flywheel) | 2 | Low | Free tier |
| 4 | KB version distribution + founder review page | 1 | Low | Free tier |
| 5 | Edge-Function LLM proxy (key security + PII enforcement) | 1 | Low | Free tier |
| 6 | Realtime multi-device, Storage for images, analytics | 2 | Medium | Likely Pro (~$25/mo) |

Free tier (500 MB database, 50k monthly auth users, 1 GB storage) comfortably
covers steps 1–5 for a solo clinic and pilot partners. The first real money
(~$25/month Pro) only becomes worth it around step 6 / multiple clinics.

**Recommendation:** when you're ready, greenlight **steps 0–2** as one arc —
they convert Entopic from "demo that loses data" to "clinic software with
automatic backup and real sign-in" without touching the UI or the engine. Step
3 is the strategic one for the science; it's small once 2 exists. Everything
above is reversible until step 2 ships to a real clinic.

**Cost/commitment note (guardrail):** creating the Supabase org/project, and
any paid tier, waits for your explicit go-ahead. The Supabase tooling is
already connected to these sessions, so once you say go, the build can be
hands-off for you.
