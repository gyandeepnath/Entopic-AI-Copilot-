# Entopic — Second Full Audit (27 October 2026)

**The request:** "Audit everything. I mean everything. / What happened."

**How it was done:** same rules as the September audit. I ran the real app and
the real engine rather than only reading code. Every problem got a test that
reproduces it, and every new test was run against the **previous** code to
prove it catches the problem. Nothing clinical was invented: where a fix needed
a clinical judgement, I did not make it, and it is listed in `NEEDS_REVIEW.md`.

---

## 0. What happened at the start of this session

The new session's copy of the project started empty: the working folder had
no files, and the system reported CLAUDE.md missing. **Nothing was lost.**
GitHub still held everything; the last commit was my own from 25 September and
nobody had changed it since. I restored the working copy from GitHub and
carried on.

**One thing I got wrong in September:** the automatic test run on GitHub (CI)
used an older Node version that could not find the tests. From 24 September
**CI ran no tests for a month**, and I did not check. Every test did pass when
run here, but the independent check was blind. It is fixed. CI now fails
loudly if no tests run, and it has been green on every push today.

---

## 1. Numbers

| | Start of this audit | Now |
|---|---|---|
| Unit tests | 1,387 | **1,450**, 0 failing |
| Stress suites | 9 | 9, all held: attack 46, privacy 43, crypto 24, clinical 47, pollution 16, sync 18, xss 48, output 26, red-flag screen 44 |
| Browser journeys | 8 (all **unable to start**, see §5) | 8, all held: patient 29, competency 35, student 13, accessibility 0/0, dropdowns 8, legacy records 10, clinician decision 11, handlers 2 |
| Database checks on real PostgreSQL 16 | none | **25 held** (11 fail without migration 006) |
| CI on GitHub | not running tests since 24 Sept | green |

---

## 2. Clinical safety — the ones that matter most

1. **"✓ Normal" could erase a recorded RAPD, and its red flag.** On the pupil
   step, the quick-fill wrote "RAPD: None" over whatever was recorded. The
   slit-lamp and motility steps overwrote findings in the same way. On the real
   engine: record a left RAPD, press "✓ Normal", and the RAPD alert vanished.
   Every template now fills **blanks only**.
2. **"Not sure if it's flashes or floaters" switched the red flag off.** The
   chief-complaint reader treated doubt as denial. Now "not sure", "no idea",
   "not only" and "not just" keep the mention; "denies flashes" is still
   negated.
3. **A medication list alone produced a dry-eye diagnosis.** Sertraline,
   isotretinoin or anticholinergics added the *symptom* "dryness", which the
   dry-eye conditions require. That no longer happens. The risk still shows
   in the medication review.
4. **One bad entry in a condition's exclusion list could delete every
   non-urgent condition** from the differential. Such entries are now ignored.
5. **Recorded findings printed as "[object Object]"** in the SOAP note, the
   patient chart, the AI summary and teaching cases. Each tap also collapsed
   the finding's section. They now read "Hypopyon (OD)".
6. **The OSDI showed "Severe Dry Eye" after one answer.** A score now appears
   only for a finished questionnaire. Items 6–12 gain the published **N/A**
   option (please confirm).
7. **Trend charts spaced visits evenly**, so two weeks looked like two years.
   They are now spaced by date.

## 3. Your records — loss and recovery

- **Idle auto-lock could throw away an exam** when the device was not saving,
  and still say "Your work was saved". The exam is now kept in the tab and
  given back when the same clinician signs in.
- **Recovery after the browser's storage is wiped brought back 368 of 400
  visits.** Old backup snapshots filled the space first. All 400 come back now
  (measured in a real browser).
- **Archives could not be restored at all.** They can now, from a file or from
  the device's own copy.
- **One damaged visit blocked new exams.** It is now set aside and reported.
- **The old copy of every visit was never removed** (half the storage
  headroom, including deleted patients' visits). It is now removed safely.
- **Error banner:** it no longer promises "your data is saved" when the device
  is refusing saves, and Reload saves first.

## 4. Privacy and security

- **With encryption on, copies were still stored as plain text on the same
  device:** seven backup snapshots, archive copies and attached files. All are
  now encrypted.
- **Attachments went to the cloud unencrypted, under the original filename,
  before consent.** They now follow the same rules as records.
- **Database (real PostgreSQL run):**
  - Anyone holding the public key could list every clinic's orphaned visit ids.
  - Join codes were guessable without limit.
  - Audit entries could be written anonymously.
  - Anyone could give themselves the paid tier.

  All are fixed in `db/migrations/006_security_hardening.sql`, **which you need
  to run once.**
- **Stronger password hashing.** Passwords and encryption passphrases now use
  the current OWASP strength. Existing ones are upgraded automatically the
  next time you sign in.
- **Default admin password:** the app now warns on sign-in if it is still the
  published default, and refuses to set it again.
- **The AI proxy example was an open relay**, so anyone could spend your
  Anthropic credit. It now needs a token or a signed-in user.
- **Sign-offs baked into the app could vouch for changed content.** Each
  sign-off now carries the condition's fingerprint and is re-checked at start.
- **Two knowledge-base version numbers.** Every visit since July recorded
  "KB 1.1.0" as its knowledge base, and an older cloud update could have
  replaced the newer built-in one. There is now one number.

## 5. Behind the scenes

- **None of the browser checks could start.** They named an exact Chromium
  folder and parser location that a container update moved. They now find
  them. The accessibility check also tested a fixed folder rather than its
  own copy.
- **The app reported version 1.5.0 for three months of changes.** It is now
  1.6.0, KB 1.4.0. Your sign-offs are unaffected.
- ARCHITECTURE.md, the tools README and the CHANGELOG are up to date.

---

## 6. What needs you (details in `NEEDS_REVIEW.md`)

**To do once:**
- 🟥 **Run `db/migrations/006_security_hardening.sql`** on your Supabase
  project (SQL editor → paste → Run).
- **Change the admin password** if you still use the default
  (`entopic-admin` / `Entopic-Admin-2026`): Admin tab → "Change admin
  password".

**Clinical decisions (nothing was changed without you):**
- Prednisolone alone still produces "Drug-induced Cataract (Steroid)". Should
  that condition also require a lens finding or a symptom?
- Should amiodarone's listed optic neuropathy raise the toxic-optic token?
- Should the engine also read corneal thickness entered as Pachymetry on the
  Investigations page (it reads only the IOP-page CCT)?
- Please confirm the dry-eye change, and the OSDI **N/A** on items 6–12.
- Should editing a condition's About summary send its sign-off back for
  re-review? (Recommendation: only for future sign-offs.)
- Still open from before: the dry-eye → "acute_keratitis" exclusion, family
  history tokens, and the exclusion-by-name-fragment rule.

**Product / spend:** archive files are not encrypted yet; who may set the AI
key; cloud key strength; fonts still load from Google (offline falls back to
system fonts).
