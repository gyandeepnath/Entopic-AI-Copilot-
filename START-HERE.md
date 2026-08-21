# Entopic — package for exploring, 21 August 2026

## Just want to look at it?

Open **`index.html`** in Chrome or Edge. That is the whole app — no install,
no server, no internet. Everything runs on your machine.

First run: click **Create new account**, pick "Using Entopic as" (Clinician,
Student, Faculty, Researcher, Investigation unit) — the workspace changes to
match. Founder/admin sign-in is `entopic-admin`; the password is the one you
set, or the built-in default if you have not changed it.

> Screenshots of everything below are in **`screenshots/`**.

---

## New in this package — the hardest stress test yet

I attacked eight areas that had **no adversarial testing at all** and found
**24 real defects**. Four of them could have harmed a patient or published one.
Full detail in `docs/PHASE11_STRESS_REPORT.md`; the plain-language version is at
the top of `CHANGELOG.md`.

The ones worth knowing about as the owner:

- **A "de-identified" research export could carry free text out of the device.**
  The protection listed which *fields* to copy but never checked what was *in*
  them. Now checked against your own dropdown vocabularies.
- **A published risk score could be produced for a patient nobody assessed**,
  and the same trick could make any account an administrator or mark a healthy
  device as "corrupt" (which stops every save in the clinic).
- **A crafted condition name could run code inside the app** — including from
  the red-flag alert box. Proven in a real browser, now closed.
- **Garbage in the dry-eye questionnaire produced a confident "Severe Dry Eye"**,
  and a negative value produced "Normal" — the direction that sends someone home.
- **"Penicillin allergy" was read as the patient TAKING penicillin.**
- **You could be locked out of your own records by using a better browser.**
- **Saving a large clinic got 76× faster** once a benchmark that had been
  measuring itself was fixed.

**Two things I attacked hard and could not break:** red flags always reach the
screen (44 checks, under every adverse condition I could create), and what you
print is still safe — an unmeasured eye never prints as "plano".

**Fifteen times my first finding was wrong**, and every one is written into the
test that made the mistake. The worst: my first privacy run reported "all clear"
while the code was withholding *everything* — the tests passed because there was
nothing left to leak.

### Checking it yourself

```
npm test                              1,313 unit tests
node tools/stress/attack.js           the original 46 attacks
node tools/stress/privacy.js          what leaves the device
node tools/stress/crypto.js           who gets in
node tools/stress/clinical.js         scales, medications, OSDI, dispensing
node tools/stress/pollution.js        one whole class of security bug
node tools/stress/sync.js             records arriving from another device
node tools/e2e/accessibility.js       every screen, labels + keyboard
```

The browser ones (`xss`, `output`, `redflag-screen`, everything in `tools/e2e/`)
need Chromium; the rest need only Node.

## New in this package — the education layer works now

Entopic has had a complete competency and supervisor sign-off system since
Phase 2. It worked. It had sixteen passing tests. **Nothing in the app had ever
called it** — a student could not record evidence, and a supervisor could not
sign anything off. The Teaching tab showed a grey "Coming with shared accounts"
badge where the feature should have been.

That reason was only half right. Reviewing logbooks *across separate accounts*
needs the cloud backend. **Supervising a student doesn't** — that happens at the
chair, with you next to them, on one machine. That half is now built.

### Try it in five minutes

You need two things: a framework, and two accounts on the same device.

**1. Import a framework (as faculty).**
Sign in as a Faculty or Clinician account → **Teaching** tab → *Competency
framework* → **Download a blank template**. Open the file, fill in `items` with
your own competencies, save, then **Import a framework** and pick it.

> Entopic ships **no competency content at all** — no list, no pass mark, no
> weightings, no minimum case counts, no progression rule. Those differ by
> university and regulator, and a made-up one would be worse than none: a
> programme would map its teaching to a standard nobody accredited. The blank
> template is deliberately **un-importable until you fill it in**.

**2. Record evidence (as a student).**
Switch to a Student account → open a patient → open a completed visit → the
**Record competency evidence** card is at the bottom. Pick a competency, the
level you're claiming, how much supervision it needed, and write a reflection.
Submit.

**3. Sign it off (as faculty, at the chair).**
Switch back → **Teaching** tab → *Competency sign-off*. Rate seven dimensions,
agree a level (which may be **lower** than the student claimed — that's the
assessment, not a rejection), note one strength and one thing to work on.

**4. See what came back (as the student).**
**Study** tab → *My competencies* and *Feedback over time*. The second one is
the point: it shows the pattern across every encounter, not one comment at a
time — which axes keep coming up, which are improving, and every action you've
been asked to take. **Export my logbook (JSON)** produces the file an examining
body would ask for.

### Simulated work can never pass as real

Entopic generates simulated cases and practice patients. A logbook that couldn't
tell those from real patients would let a student hand an examiner simulated
work as clinical experience.

- Every entry records whether it was simulated **when it's created**.
- The exported logbook says so in words — `SIMULATED — not a real patient` —
  and states the real/simulated split at the top.
- The claim form warns the student **before** they fill it in.
- When it can't tell, it **assumes simulated**.
- By default, simulated work is recorded and shown but **doesn't count** towards
  a competency being met.

That last one is a **switch, not a rule** — whether simulation is acceptable
evidence is your programme's decision. Teaching tab → *Competency framework* →
"count them". The logbook records which rule produced its numbers.

---

## Five things I'd like you to decide

None of these blocks anything. Each has a sensible default and each is a
setting, so changing your mind later costs a click:

1. Should a **clinician** sign off competencies, or only faculty? I allowed
   both, because on placement the supervisor is a practising optometrist.
2. Should **simulated** work count towards competencies? Off by default.
3. Are the **seven feedback dimensions** right for your programme?
4. Is a **three-point** rating scale right, or does your assessment use five?
5. Should a concern be called *recurring* after **two** flags, or more?

Full reasoning: `docs/PHASE10_EDUCATION_REPORT.md` §9.

---

## What this package does NOT claim

- **No competency content is clinically verified, because none exists.** The
  emptiness is the feature.
- **Permission checks are UI-only.** They hide a control; they don't prevent an
  action. Until the backend enforces it, a signed competency is trustworthy
  because a supervisor was physically there. This is the biggest remaining gap
  in this area, and it's backend work.
- **No real student or supervisor has used this yet.** It's verified against its
  specification, not against a teaching clinic.
- **Cross-account and multi-site review doesn't work**, and the app says so
  rather than implying otherwise.
- The 394 knowledge-base conditions remain **clinically unverified** and marked
  as such. That is unchanged and still needs you.

---

## Still true from earlier packages

**Patient records on this device can be encrypted.** Admin → Record encryption.
Patients, visits, the audit trail and accounts become unreadable without the
clinic passphrase — a lost or stolen laptop is no longer a records breach. You
are given a **recovery code**: write it down and keep it somewhere safe and
separate. It is the only way back in if the passphrase is forgotten.

**No backup ever leaves this device by itself.** Automatic snapshots are kept
locally and survive a bad write or a mistaken deletion — they do **not** survive
the device being lost, stolen or broken. Account → Data → **Export all**, and
put the file somewhere else.

**The diagnostic engine never needs the network.** Turn off wifi and everything
still works: that is a hard guarantee, tested on every run.

---

## Where things are

| Path | What it is |
|---|---|
| `index.html` | the whole app — open this |
| `screenshots/` | what each screen looks like, plus a sample exported logbook |
| `CHANGELOG.md` | what changed and why, newest first, in plain language |
| `docs/PHASE10_EDUCATION_REPORT.md` | the full write-up of this round |
| `ARCHITECTURE.md` | how the code is laid out (§9e is the new competency layer) |
| `NEEDS_REVIEW.md` | everything waiting on your clinical judgement |
| `js/`, `knowledge/`, `css/` | the app itself |
| `tests/`, `tools/` | the test suite and the audit/stress harnesses |

## Running the checks yourself (optional — needs Node.js)

```
npm test                              # 1,219 unit tests
node tools/audit.js                   # knowledge-base + wiring audit
node tools/stress/attack.js           # 46 adversarial attacks
node tools/e2e/patient-journey.js     # 29 real-browser checks
node tools/e2e/competency-journey.js  # 35 real-browser checks (new)
```

The two `e2e` ones need Playwright and a Chromium build; the first three need
nothing but Node.
