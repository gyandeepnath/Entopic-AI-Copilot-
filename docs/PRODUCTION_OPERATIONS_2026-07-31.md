# Production Operations — Entopic at national scale

**Date:** 2026-07-31
**Scope:** deployment, CI/CD, observability, logging, metrics, tracing, backups,
rollback, incident response, monitoring, health checks, recovery objectives,
scaling, infrastructure as code.
**Audience:** the founder (§0 and §9), and whoever is on call (§5–§8).

---

## 0. The thing that makes this different — read this first

Most SRE advice assumes your software runs on your servers, so *up* and *down*
are yours to control. **Entopic is not that.** The diagnostic engine, the exam
record, and the entire clinical workflow run **inside the clinician's browser,
offline, on their machine**. There is no application server. The backend exists
only to sync, back up, authenticate, and audit — and by hard guardrail it must
never become a runtime dependency for seeing a patient.

Four consequences drive every decision below:

1. **You cannot take Entopic down, and you cannot fix it quickly either.**
   If the CDN dies, clinics with the app already loaded keep working. But a bad
   file that *did* reach them keeps running until they reload — which for an
   offline clinic may be **days**. There is no "restart the service."

2. **Availability is the wrong headline metric.** "Is the site up?" is nearly
   meaningless. The metrics that matter are *can a clinic still document an
   exam* (almost always yes, by design) and *can they authenticate, sync and
   restore* (the actual failure surface).

3. **Observability is constrained by law and by design.** You cannot ship
   telemetry containing patient data, and half your fleet is offline when the
   interesting thing happens. Client telemetry must be **de-identified,
   consented, store-and-forward, and off by default.**

4. **The unit of failure is a clinic, not a request.** One clinic's laptop
   dying is a total outage for them and invisible to you. Fleet-wide dashboards
   will not show it. This is why §6 is heavier on *runbooks a clinic can
   execute* than on centralised alerting.

**The single biggest operational gap found while writing this** was that the app
had **no version identifier at all** — `KB_VERSION` was referenced in two places
and defined in none. For a client-side app that runs offline, "which build are
you on?" is the first question of every incident, and it was unanswerable. Fixed
this session (`js/build-info.js`, shown in the admin panel with a one-click
"Copy for support", and CI now fails a PR that changes shipped code without
bumping the version).

---

## 1. Production deployment architecture

```
                       ┌──────────────────────────────────┐
                       │  GitHub (source of truth)        │
                       │  main → tagged release           │
                       └───────────────┬──────────────────┘
                                       │ CI gate (§2)
                                       ▼
             ┌──────────────────────────────────────────────┐
             │  STATIC ORIGIN + CDN                         │
             │  index.html, js/, css/, knowledge/           │
             │  immutable per release: /r/<version>/…       │
             │  /latest → pointer, flipped to publish       │
             │  security headers per server/security-       │
             │  headers.md (HSTS, CSP, nosniff, frame-deny) │
             └───────────────┬──────────────────────────────┘
                             │ HTTPS, cacheable, no PHI ever transits
        ┌────────────────────┴─────────────────────────────────┐
        ▼                                                      ▼
┌───────────────────────────┐                    ┌───────────────────────────┐
│  CLINIC DEVICE  (×N)      │                    │  CLINIC DEVICE            │
│  ─────────────────────    │                    │  …                        │
│  Engine (deterministic)   │  ← runs offline    │                           │
│  localStorage  (records)  │                    │                           │
│  IndexedDB     (mirror +  │                    │                           │
│                 file blobs)│                   │                           │
│  Local vault  (AES-GCM)   │                    │                           │
└─────────────┬─────────────┘                    └─────────────┬─────────────┘
              │  sync / auth / audit — OPTIONAL, never required │
              ▼                                                 ▼
        ┌───────────────────────────────────────────────────────────┐
        │  SUPABASE (per-tenant project or shared, see §1.2)        │
        │  Postgres + RLS (clinic_id isolation, db/migrations/)     │
        │  Auth  ·  append-only audit  ·  Storage (attachments)     │
        │  PITR + nightly logical dump                              │
        └───────────────────────────────────────────────────────────┘
```

### 1.1 Immutable releases, pointer publish

Never overwrite files in place. Publish to `/r/1.2.0/…`, verify, then flip
`/latest` to point at it. This gives:

- **Rollback in seconds** (flip the pointer back) rather than a redeploy.
- **A clinic pinned to a known-good version** if a specific site hits a
  regression — you can hand them `/r/1.1.4/` while you fix `/latest`.
- **Cache sanity**: hash-immutable paths get `Cache-Control: immutable,
  max-age=31536000`; `index.html` and `/latest` get `no-cache`, so a reload
  always sees the current pointer without waiting out a TTL.

### 1.2 Tenancy — the decision the founder must make

| Model | Isolation | Ops cost | When |
|---|---|---|---|
| **A. Clinic-owned project** (today) | Perfect — separate database, separate credentials, clinic owns the data | Zero for you; every clinic self-manages | Now, and for regulated/large customers who insist |
| **B. Shared multi-tenant project** | RLS on `clinic_id` (already built and tested) | You run one database and are legally a data processor for everyone | When self-setup becomes the main barrier to adoption |
| **C. Pooled projects (shards)** | Per-shard blast radius; RLS within | Middle | Only if B hits a real Postgres ceiling |

**Recommendation: stay on A, and add B as an option only when a real customer is
blocked by setup.** Model A is why Entopic can be deployed nationally today by a
solo founder: you carry no PHI, no breach liability for clinic data, and no
database on-call. Moving to B is an architecture-committing, cost-committing,
liability-committing decision — exactly the kind CLAUDE.md says to pause on.
It should be driven by a customer who will pay for it, not by tidiness.

---

## 2. CI/CD

**CI is the only gate between a commit and every clinic.** With no build step, a
static file goes live exactly as written, so the pipeline is a gate, not a
report. Hardened this session:

| Stage | Blocks merge? | Notes |
|---|---|---|
| `node --check` on every JS file | ✅ | Syntax error = white screen for every clinic |
| Token registry in sync | ✅ | Drift silently breaks the engine's wiring |
| **Full test suite (593)** | ✅ | Golden clinical vignettes, red-flag alerts, KB structure |
| **Repository audit — 0 FAIL** | ✅ | **New.** Was not in CI at all; only the KB audit ran, and only as a report |
| **Version gate** | ✅ | **New.** Changing `js/`, `css/`, `index.html` or `knowledge/` without bumping `js/build-info.js` fails the PR |
| **Migration safety** | ✅ | **New.** No unguarded `DROP`/`TRUNCATE`/`DELETE FROM` in a migration |
| KB audit | report | Advisory — KB growth shouldn't block a code fix |

### Still missing (ranked, and honest about it)

1. **No browser stage.** Every browser verification in this project has been run
   by hand. Playwright is already used ad hoc; wiring three checks into CI
   (boots clean at 1440/900/600 px, all three red flags fire, no console errors)
   would catch the class of defect unit tests structurally cannot.
2. **No release job.** Publishing is manual. Should be: tag → publish to
   `/r/<version>/` → smoke test → flip `/latest`.
3. **No supply-chain check.** There are zero runtime dependencies (a genuine
   strength — say so in sales conversations). Worth a CI assertion that
   `package.json` still has no `dependencies`, so that stays true.

---

## 3. Observability, logging, metrics, tracing

### 3.1 What you can and cannot collect

| Signal | Where it lives now | Can it leave the device? |
|---|---|---|
| Clinical records | Device (+ clinic's own Supabase) | **Never** to you |
| Audit trail | Device (+ append-only server copy) | Only to the clinic's own project |
| App errors | `ERR_LOG`, memory-only, 25 entries | Only de-identified, consented, opt-in |
| Build identity | `js/build-info.js` | Yes — contains no PHI by test |
| Engine timings | Not collected | Yes if de-identified |

The error boundary now **scrubs** messages before they reach the audit trail
(structured payloads, quoted values, MRN-shaped identifiers, dates) — an earlier
version wrote raw exception text, which routinely quotes the record that caused
it, into a log that is exported with every backup.

### 3.2 The three tiers to build, in order

**Tier 1 — Self-service diagnostics (built).** The clinic can answer its own
questions: deployment readiness panel, build identity with copy-for-support,
storage-corruption banner, write-failure banner, sync conflict notice, audit
trail. For a fleet you cannot see into, *making each site diagnosable by its own
admin* is worth more than a central dashboard.

**Tier 2 — Opt-in de-identified health beacon (recommended next).** One small
POST per device per day, off by default, consented in the admin panel:

```json
{ "app_version": "1.2.0", "kb_version": "1.2.0", "commit": "a1b2c3d",
  "browser_family": "chrome-140", "os_family": "windows",
  "storage_pct": 62, "records_local": 1840,
  "errors_24h": 3, "top_error_where": "renderMain",
  "sync_state": "healthy", "vault": "on", "clinic_mode": "on" }
```

No clinic name, no user, no patient anything, no free text. That payload answers
almost every fleet question — version spread, upgrade adoption, who is
approaching the storage ceiling, which browsers break, whether a release
increased errors — with no PHI and no consent problem.

**Tier 3 — Distributed tracing: do not build.** Tracing answers "where did this
request spend its time across services." Entopic has no services. The engine
runs in **1.5 ms across 394 conditions**, measured. Building tracing here is
infrastructure for a problem the architecture does not have.

### 3.3 Metrics worth alerting on (SLIs)

| SLI | Target (SLO) | Why |
|---|---|---|
| Static asset availability | 99.9% monthly | Only blocks *new* loads; running clinics unaffected |
| Auth success rate | ≥ 99.5% | This one genuinely blocks work |
| Sync success rate (24h) | ≥ 99% of devices sync at least once | Detects silent sync death |
| Devices failing to persist | **0** | Any single device is a page — records are being lost |
| Devices with corrupt store | **0** | Same |
| Nightly backup completion | 100% | Silent backup failure is the classic disaster |
| Median engine run | < 10 ms | Regression guard, from the 1.5 ms baseline |

**Two of these page at a count of one.** That is deliberate: at national scale a
0.1% failure rate sounds fine and means dozens of clinics losing records.

---

## 4. Backups, recovery objectives, rollback

### 4.1 RPO / RTO — stated per tier, because one number would be a lie

| Data | Lives | RPO | RTO | Owner |
|---|---|---|---|---|
| Records, **no cloud connected** | Device only | **= backup interval.** Weekly export = up to 7 days lost | Hours (restore file) → **∞ if no backup exists** | Clinic |
| Records, cloud connected | Device + Supabase | ≈ sync interval (minutes) | < 1 h (fresh device, sign in, pull) | Shared |
| Attachments | IndexedDB (+ Storage) | Same as above | Same | Shared |
| **Clinical sign-offs** | Device + backup + mirror | Minutes | Minutes (Load a copy) | Founder |
| Supabase database | Managed | PITR window (typically 7 days) | < 2 h | You |
| The app itself | CDN + git | 0 (in git) | **< 5 min** (pointer flip) | You |

**The honest headline: a clinic on model A with no cloud and no backup routine
has an unbounded RTO.** No amount of engineering on your side changes that. The
readiness panel already flags it as a warning; onboarding must make it a
blocker, not a suggestion.

### 4.2 Rollback

| Failure | Action | Time |
|---|---|---|
| Bad app release | Flip `/latest` to previous `/r/<v>/` | **< 5 min** |
| Bad release, clinic already loaded it | They reload (online) — or you talk them through Ctrl-Shift-R | Minutes, but **may be days for an offline site** |
| Bad KB release | Same pointer flip; sign-offs auto-return to re-review because the content fingerprint changed | < 5 min |
| Bad migration | Forward-fix migration; PITR restore only as last resort | 15 min – 2 h |
| Clinic data corrupted | Writes already blocked automatically; restore from backup | Minutes |

**There is no rollback for a migration that dropped data** — which is why CI now
refuses unguarded destructive statements. Migrations must be additive and
idempotent, always.

---

## 5. Health checks

| Check | What it proves | Frequency |
|---|---|---|
| `GET /latest/index.html` → 200 + expected `APP_VERSION` | The pointer is valid and serving the intended build | 1 min |
| Content hash of `js/engine.js` matches the release manifest | Nothing was mutated in place or corrupted in transit | 5 min |
| Supabase `/auth/v1/health` → 200 | Sign-in works | 1 min |
| Authenticated round-trip: write + read a canary row in a test clinic | RLS, grants and connectivity together — the B-1 blocker (missing function grants) would have been caught by exactly this | 5 min |
| Nightly `pg_dump` completed and is non-trivial in size | The backup exists *and is not empty* | Daily |
| Restore drill: last dump into a scratch project, row counts sane | The backup is **restorable**, which is the only property that matters | Monthly |

The authenticated round-trip is the important one. Liveness checks that only
prove "the port answers" pass happily while every clinic gets a permission error.

---

## 6. Operational runbooks

Each is written so it can be executed by whoever is available, including the
founder, without reading code.

### R-1 — Publish a release
1. CI green on `main` (tests, audit 0 FAIL, version gate).
2. Confirm `js/build-info.js` shows the intended `APP_VERSION` / `KB_VERSION`;
   set `BUILD_COMMIT` to the short SHA (not `dev`).
3. Tag `v<version>`. Publish to `/r/<version>/`.
4. Smoke test **against `/r/<version>/`, not `/latest`**: app loads, sign in,
   open a patient, enter flashes + floaters → red-flag alert fires, save, reopen.
5. Flip `/latest`.
6. Watch error rate and auth success for 30 min.
7. Post the version and the one-line change summary where clinics can see it.

### R-2 — Roll back a release
1. Flip `/latest` back to the last-good `/r/<version>/`. **This is the whole
   rollback.** Do it first, diagnose after.
2. Verify `/latest/index.html` reports the expected `APP_VERSION`.
3. Clinics already running the bad build need a reload — an offline clinic will
   not get it until they reconnect. If the fault is clinically dangerous, phone
   them; the fleet is small enough to matter and too important not to.
4. Only then, root-cause.

### R-3 — A clinic reports "it's broken"
1. **Get the build.** Admin → Deployment → *Copy for support*. Without this
   nothing else is reliable.
2. Are they on `/latest`? Is `released` true, or are they on a `dev` build?
3. Deployment readiness panel: any red? (write failure, corrupt store, vault
   unavailable, clinic mode off).
4. Any red banner on screen? Each names its own runbook: storage full (R-4),
   store damaged (R-5), another window saved (informational).
5. Reproduce on the same browser family before assuming it is their machine.

### R-4 — "This device has stopped saving records"
1. **Stop seeing patients on that device.** The banner says so; mean it.
2. Admin → Backup → download a backup **now**, before anything else.
3. Cause is nearly always the storage ceiling (~3,000 patients / 9,000 visits
   measured). Confirm in the readiness panel.
4. Fix: connect cloud sync, or archive/export older records, or move to a
   device with headroom.
5. Verify the banner clears — it clears itself when writes succeed.

### R-5 — "This device cannot read its patient list"
1. **Stop. Do not create or edit anything.** Writes are already blocked
   automatically so the damaged data cannot be overwritten.
2. Do **not** clear site data. The damaged bytes are the only remaining copy and
   a quarantined copy was kept alongside them.
3. Restore from the most recent backup (Admin → Restore) — it takes a safety
   snapshot first.
4. No backup? Check the IndexedDB mirror and the quarantined key before
   concluding anything is lost. Escalate to engineering: partial recovery from
   truncated JSON is often possible by hand.
5. Only after recovery, or after an explicit decision to accept the loss, use
   *accept loss* to re-enable writes.

### R-6 — Restore a clinic onto a new device
1. Install/open Entopic at `/latest`. Create the admin account.
2. Admin → Restore → the clinic's most recent backup.
3. If the vault was on, they need the clinic passphrase **or** the recovery
   code. Without either, encrypted records are unrecoverable — by design.
4. Load the sign-off file (Validation → *Load a copy*) if kept separately.
5. Reconnect the Supabase project; confirm sync pulls.
6. Verify: patient count, most recent visit date, a spot-check on one record.

### R-7 — Monthly backup restore drill
1. Restore last night's dump into a scratch Supabase project.
2. Compare row counts per table against production.
3. Point a test device at it; sign in; open a patient.
4. Record the result and the elapsed time. **An untested backup is not a backup**
   — this drill is the only thing that makes the RTO in §4.1 a real number.

---

## 7. Incident playbooks

**Severity, defined by clinical impact rather than by system state:**

| Sev | Meaning | Response |
|---|---|---|
| **SEV-1** | Wrong clinical output, a red flag failing to fire, or records lost/unreadable | Immediate. Wake people. Consider phoning affected clinics. |
| **SEV-2** | Clinics cannot authenticate or sync; a release broke a workflow | Same day |
| **SEV-3** | Degraded but working; cosmetic; single-site issue with a workaround | Next business day |

### P-1 — SEV-1: a red-flag alert did not fire
This is the highest-severity event this product can have.
1. **Preserve evidence.** Get the exact visit (de-identified), the build, and
   the KB version — `V.engine_provenance` on the record already stamps the KB
   version, condition count and the top differentials at the time.
2. Reproduce in the golden vignette harness. Red-flag alerts are deterministic;
   if it cannot be reproduced from the same inputs, the inputs are not the same.
3. If confirmed: roll back (R-2) and **notify affected clinics directly**. Do not
   wait for the fix.
4. Add the case as a permanent golden vignette **before** fixing, so the fix is
   proven against it.
5. Write it up. Red-flag logic is un-suppressible by guardrail; any change to it
   needs the founder's clinical sign-off.

### P-2 — SEV-1: a clinic reports lost records
1. R-4/R-5 first — stop the bleeding before diagnosing.
2. Establish which of the known modes it is: storage ceiling (banner), corrupt
   store (banner), concurrent overwrite (check `visit.conflicts` — the displaced
   version is preserved there), or sync conflict (check `cloudConflicts()`).
3. Recover from mirror, quarantine, backup, or cloud, in that order of freshness.
4. If none of the four modes fits, **assume a new defect** and treat the device
   as evidence: export everything before further use.

### P-3 — SEV-2: bad release
Roll back first (R-2), diagnose second. Then: what should have caught it? If the
answer is "a browser test", that is the CI gap in §2 and it should be built
before the next release rather than promised.

### P-4 — SEV-1: suspected data exposure
1. Scope: model A means each clinic's data is in **their** project — the breach
   is theirs to disclose, and you must tell them promptly and factually.
2. Preserve the Supabase audit log (append-only) before anything else.
3. Rotate the anon key and force re-auth for the affected project.
4. Legal/regulatory notification is the clinic's duty as controller; your duty
   is prompt, complete, honest disclosure to them. Say what you know and what
   you do not.

### P-5 — Supabase regional outage
1. **Confirm the blast radius is sync only.** Exams continue; the engine is
   local. This is the guardrail paying for itself.
2. Tell clinics plainly: *keep working, data is saving locally, sync will catch
   up.* The wrong message here causes more harm than the outage.
3. Watch for the storage ceiling if the outage runs long — devices that normally
   offload are now accumulating.
4. On recovery, confirm sync drains and check `cloudConflicts()` for records
   edited in more than one place meanwhile.

---

## 8. Deployment checklist

**Per release**
- [ ] CI green: tests, registry, **audit 0 FAIL**, **version gate**, **migrations**
- [ ] `APP_VERSION` / `KB_VERSION` bumped; `BUILD_COMMIT` set to the real SHA
- [ ] `CHANGELOG.md` updated
- [ ] Any KB change: sign-off impact understood (changed content returns to re-review — intended?)
- [ ] Any migration: additive, idempotent, applied to a scratch project first
- [ ] Published to `/r/<version>/`; smoke tested **there**, not on `/latest`
- [ ] Red-flag vignette manually confirmed (flashes+floaters, IOP > 40, RAPD)
- [ ] `/latest` flipped; version verified live
- [ ] Rollback target confirmed reachable *before* announcing
- [ ] 30-minute watch on errors and auth

**Per clinic onboarding**
- [ ] Deployment readiness panel: **zero blockers**
- [ ] Clinic deployment mode ON (signup closed, idle lock)
- [ ] Admin password changed from default
- [ ] Record vault ON; **passphrase and recovery code stored somewhere that is not the device**
- [ ] Backup routine agreed and *demonstrated once*, not just explained
- [ ] Restore rehearsed once, onto a spare machine
- [ ] They can find: the build label, the backup button, and this document's R-4/R-5
- [ ] Full-disk encryption on (BitLocker / FileVault) — Entopic cannot substitute for it

**Quarterly**
- [ ] Backup restore drill (R-7) with the elapsed time recorded
- [ ] Version spread across the fleet reviewed — who is stale, and why
- [ ] Storage headroom reviewed for the largest sites
- [ ] Dependency count still zero
- [ ] Independent penetration test (still outstanding)

---

## 9. SRE roadmap

Ordered by *risk removed per unit of effort*, not by conventional maturity.

**Now — done this session**
- Build identity, visible and copyable *(was the single biggest gap)*
- CI as a gate: repository audit, version gate, migration safety
- Corrupt-store detection and write blocking
- Concurrent-writer preservation
- Error-boundary PHI scrubbing

**Next (weeks) — highest value remaining**
1. **Immutable release paths + pointer publish.** Turns rollback from a redeploy
   into a 5-minute flip. Prerequisite for everything else.
2. **Browser stage in CI.** Three assertions at three widths. Catches the defect
   class unit tests cannot reach.
3. **Authenticated synthetic health check.** Would have caught the B-1 grants
   blocker before any clinic did.
4. **Backup restore drill, scheduled.** Converts a hoped-for RTO into a measured
   one.

**Then (months)**
5. Opt-in de-identified health beacon (§3.2) — the first real fleet visibility.
6. Automated release job.
7. Status page, and a way to reach clinics that is not e-mail.
8. Independent penetration test.

**Deliberately not doing**
- Distributed tracing — no services to trace; engine is 1.5 ms.
- Kubernetes / containers — the artefact is static files.
- Autoscaling — nothing to scale; a CDN is the scaling story.
- Centralised log aggregation of client logs — the logs contain PHI and cannot
  legally be centralised; the beacon in §3.2 is the compliant substitute.
- Multi-tenant migration (§1.2) until a paying customer needs it.

---

## 10. Scaling — what actually breaks first

| Scale | What breaks | Mitigation | Status |
|---|---|---|---|
| 100 clinics | Nothing technical. **Support is the bottleneck** — one founder answering R-3 by hand | Runbooks above; self-service diagnostics | Built |
| 1,000 clinics | Version spread becomes unmanageable blind; large sites hit the ~3,000-patient localStorage ceiling | Health beacon; archival/pagination for large sites | Beacon not built |
| 10,000 clinics | Model A self-setup becomes the adoption ceiling; a bad release is a national event | Managed tenancy option (§1.2); staged rollout — flip `/latest` for 5% first | Staged rollout not built |

**Note the pattern: none of the first failures are compute.** The engine is
1.5 ms; the CDN scales indefinitely; Postgres is nowhere near stressed. Entopic's
scaling limits are **per-device storage** and **human support capacity** — so
that is where the effort belongs, not on servers.

---

## 11. What this document is not

It is a design, not a deployment. **Nothing in §1 exists yet** — there is no CDN,
no `/r/<version>/` layout, no pointer, no synthetic monitoring. What exists today
is: the app, a hardened CI pipeline, per-device self-service diagnostics, and
these runbooks.

That gap is deliberate. Standing up CDN infrastructure, a monitoring stack and a
status page costs money and commits architecture, and CLAUDE.md says to pause
before both. **The founder's decisions:** whether to move to immutable release
paths (recommended, cheap, unlocks fast rollback), whether to build the health
beacon (recommended, needs a consent decision), and whether to offer managed
tenancy (recommended *against* until a customer pays for it).
