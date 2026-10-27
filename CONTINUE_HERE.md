# CONTINUE HERE — handoff for the next session

Everything from this build is saved in git (this branch) + `CHANGELOG.md` (the
full what/why/idea history, newest first). To continue in a new conversation,
just start a session on this repo/branch and read, in order: **`CLAUDE.md` →
`ARCHITECTURE.md` → `CHANGELOG.md`**, then scan the repo.

## Current state (2026-10-27) — read this, the July section below is history
- **v1.6.0, KB 1.4.0.** 394 conditions, 132 loaded files, **1,474 tests**, CI
  green (Node 22). Second full audit done: `docs/SECOND_AUDIT_REPORT.md`.
- **Engine audit done (2026-10-27)** — see the top CHANGELOG entry.
  `tests/engine-consistency.test.js` is the engine's ratchet. It includes
  KB-wide self-consistency (≥ 99% of conditions first on their own picture,
  391/394 today), two-problem presentations, and "a safety-gated condition is
  never cut". The measuring scripts behind the CHANGELOG table are described
  there. Re-measure before tuning any value in `SCORE_WEIGHTS` or
  `clinical-thresholds.js`.
- **Gates to run before calling anything done:** `npm test`; the 9 suites in
  `tools/stress/`; the 8 journeys in `tools/e2e/` (they find Chromium via
  `tools/lib/browser.js`); `node tools/sync-docs.js --check`; and, for SQL
  changes, `tools/db/verify-migrations.js` against a scratch PostgreSQL 16
  (see tools/README).
- **Waiting on the founder:** run migration 006 on Supabase; change the
  default admin password; the clinical decisions at the top of
  `NEEDS_REVIEW.md` (steroid-cataract requirement, amiodarone token,
  pachymetry, OSDI N/A, About-summary fingerprint). From the engine audit,
  also: thin definitions (Traumatic Iritis requiring only "pain", etc.),
  three inseparable pairs, age as a contradiction (GCA cut-off, chronic CSC),
  and confirming the two items done as his recommended option (c).
- **Rule learned the hard way:** check CI after every push. It ran no tests
  from 24 Sept to 27 Oct and nobody noticed.

## Previous state (2026-07-18)
- **384 conditions** in the KB — every one has an ICD-10 code AND a hand-written
  "About" note. All wired to the deterministic engine. **227/227 tests pass.**
- **Reasoning-views layer** (Vision Moves 1+4): SOAP note generated from the
  engine's reasoning state; de-identified **teaching casebook** (grouped by
  condition, filterable by sign/token/area/reviewed) on the homepage.
- **Roles & modes (Phase 1, refined)**: Student / Clinician / Faculty
  workspaces with per-role tabs on one switchable account; role chosen at
  signup; free tier limits SAVING only (15 real patients / 40 cases) — learning
  and student practice exams are uncapped. Student quiz (Easy/Standard/Hard,
  KB+casebook vignettes, streaks); Faculty annotate + reviewed sign-off.
- **Super admin**: id `entopic-admin` (password hash-stored, changeable in the
  Admin panel) — everything unlocked at full limits + Admin tab (accounts,
  stats, password change, KB editor, export/import). Client-side convenience
  lock only; real auth is Phase 2.
- **Rapid Clinical Review Queue** (Admin tab, `js/kb-review.js`): ~246
  provisional entries listed with findings/urgency/ICD/summary; one-click
  Verify flips them to VERIFIED_BY_CLINICIAN (persists via the kb-remote
  local-edits overlay; provisional chips clear across the UI).
- Branch: `claude/entopic-architecture-review-g79amg` (all work pushed).

## What was in flight (pick up here)
1. **Founder reviews** the provisional queue in-app (Admin tab). Sign-offs live
   in `entopic_kb_local_edits`. **"Export sign-offs" is now built** → downloads
   `knowledge/verified.js`; commit it to bake attestations permanently.
2. **"+20 per area" drive — DONE/moot.** Verified the four areas are already
   saturated (Cornea 59, Neuro 51, Anterior/Uveitis 29, Glaucoma 22). Did NOT
   fabricate more. **Targeted gap-fill proposed** for genuinely-missing common
   conditions: Computer Vision Syndrome / Digital Eye Strain, Strabismic
   Amblyopia, Photokeratitis (UV/welder's flash), benign Vitreous Floaters.
   Pattern per batch: `docs/KB_AUTHORING_CHECKLIST.md`.
3. **Backend Phase 2 — prep DONE, apply is founder-gated.** See
   `docs/BACKEND_PHASE2.md`. The live `entopic` Supabase project is healthy
   (advisors clean). Staged migration `db/migrations/002_profiles_and_invites.sql`
   (per-user `profiles` role+tier; `clinics.join_code` + `join_clinic_by_code`
   RPC). Next: apply it (Supabase MCP `apply_migration`), wire the client
   (sign-in→profile sync, "Join clinic" input), and push the full KB with
   `node tools/seed-cloud-kb.js --version 1.0.0`. Then hospital/multi-clinician/
   researcher/demonstrator modes + licensing become buildable.
4. Optional next: common/rare quiz already shipped; Present mode for
   conferences; the `common-conditions.js` list needs founder verification.
5. Known small backlog: a few lid-carcinoma ICD codes carry a placeholder
   laterality to set per patient; a "Retinal Break/Tear" KB entry could take
   `retinal_break` as a required token.

## Guardrails (unchanged, non-negotiable) — see CLAUDE.md
Advisory-only; red flags un-suppressible; LLM never diagnoses; never fabricate
clinical facts/codes/stats (validate ICD via the tool, mark
NEEDS_CLINICAL_REVIEW); offline-first; keep the existing UI; pause before
spend/architecture-committing moves. Learning is never gated behind a tier.
