# Entopic — package for exploring, 30 July 2026

## Just want to look at it?

Open **`index.html`** in Chrome or Edge. That is the whole app — no install,
no server, no internet. Everything runs on your machine.

First run: click **Create new account**, pick "Using Entopic as" (Clinician,
Student, Faculty, Researcher, Investigation unit) — the workspace changes to
match. Founder/admin sign-in is `entopic-admin`; the password is the one you
set, or the built-in default if you have not changed it.

## New in this package

**Patient records on this device are now encrypted.** Admin → Record encryption
turns it on. Patients, visits, the audit trail and accounts become unreadable
without the clinic passphrase — a lost or stolen laptop is no longer a records
breach. You are given a **recovery code**: write it down and keep it somewhere
safe and separate. It is the only way back in if the passphrase is forgotten,
and it means a forgotten passphrase can never destroy your records.

**A deployment readiness panel** (Admin) tells you plainly what is and is not
ready on that device, in red/amber/green, before you see a patient.


**The Clinical Validation workspace** — the answer to "I could never find how to
actually verify these things."

> Admin panel → **Clinical validation** → **Open validation workspace**

One page listing all 394 conditions. Click any one and the right-hand panel
shows **the engine logic wired behind it, in plain language**: every finding the
engine looks for, grouped by what it does (Required / Supportive /
Contradicting / Temporal / Tests), each with its meaning in plain words and
**"Comes from:"** — the exact exam input that produces it. If a *required*
finding has nothing in the exam that can produce it, it is flagged in red,
because that condition can never surface until it is wired.

From the same panel you can **Verify ✓** (records your clinical sign-off, which
feeds the export-and-publish pipeline) or **Edit logic / tokens…** to add,
change or remove findings. This is the front door for the coming knowledge-base
expansion and for pushing verified updates out to users.

See `screenshots/40-clinical-validation-workspace.png`.

## What to try

| To see | Do this |
|---|---|
| **The validation workspace** | Admin panel → Clinical validation → Open validation workspace. Click a condition; read its wiring. |
| The exam + live engine | New patient → work down the left sidebar. The right panel reasons as you type. |
| The sidebar grouping | Click any stage header (Registration, History, Examination…) to fold it. Each stage has its own hairline colour and a done/total count. It remembers what you folded. |
| The simulator | Sign in as a Student → Study → Clinical simulation. Try **Challenge** — the copilot goes dark. |
| The engine being wrong on purpose | Challenge tier, a few cases. When it happens the debrief names what misled it and what should have held you. |
| Real values, not conclusions | Examine IOP in a simulation — you get "IOP 28 / 25 mmHg", not "high IOP". You decide. |
| OSCE | Study → OSCE circuit. Timed, engine hidden, marks withheld to the end. |
| Assignments | Sign in as Faculty → Teaching → Assignments. |
| Age brackets to classify | Admin panel → "Age brackets — clinical review". **83 conditions need your call.** |
| Credential status | Admin panel → "Stored credentials". |

## Checking it yourself

```
npm test              # 417 tests
node tools/audit.js   # whole-build audit; non-zero exit if anything fails
```

Current state of both: **417 passing, 0 failing**; audit **0 FAIL, 1 WARN**
(the warning is that 24 UI files are covered only by browser checks, not unit
tests — noted honestly rather than hidden).

## Where things live

```
index.html                        the app — open this
js/                               application code (engine, UI, teaching layer, auth)
js/ui-validation.js               the new Clinical Validation workspace
knowledge/                        the knowledge base — 394 conditions across 9 domains
tests/                            417 automated tests
tools/audit.js                    the build audit
docs/AUDIT_2026-07-26.md          what the build audit found and what was fixed
docs/DUE_DILIGENCE_2026-07-26.md  the independent engineering review + every fix
ARCHITECTURE.md                   how the system is put together
CHANGELOG.md                      what changed and why, newest first
screenshots/                      the app, captured from a real browser
```

## Three things that need you

1. **257 conditions are still flagged provisional.** The new validation
   workspace is where you sign them off, and it exports your sign-offs into the
   build. This is the single highest-value thing you can spend time on — the
   engine's trustworthiness rests on it.
2. **83 conditions need an age bracket** (Admin → Age brackets). Keratoconus,
   Optic Neuritis and the rest are epidemiological calls, so they are yours,
   not mine. Nothing has changed for them in the meantime — they behave exactly
   as they did before.
3. **One decision waiting on you:** true "any *one* of these findings"
   requirements (OR-groups). Today a condition's required findings are all-or-
   nothing (AND). Making "any one of" satisfy a requirement changes how the
   engine reasons, so I did not slip it in — say the word and I will scope it
   properly with its own tests.

## What this is and is not

**With record encryption ON** (Admin → Record encryption), patient records on
this device are genuinely unreadable without the clinic passphrase or the
recovery code — a copied folder or a stolen laptop gives up nothing. Passwords
are hashed (PBKDF2-SHA-256), and patient identifiers are encrypted again before
they ever leave the device.

**With it OFF** — which is the default until you turn it on — the sign-in screen
is a convenience lock, not access control: anyone with this folder can read the
records. The Admin readiness panel tells you which of the two you are actually
in, and marks the unencrypted state as a blocker.

Even with encryption on, it cannot protect a machine left switched on, unlocked
and unattended; that is what clinic mode's idle auto-lock is for. Keep full-disk
encryption on as a second layer.

And every clinical output is advisory: it requires your correlation, always.
