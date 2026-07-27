# Entopic — package for exploring, 26 July 2026

## Just want to look at it?

Open **`index.html`** in Chrome or Edge. That is the whole app — no install,
no server, no internet. Everything runs on your machine.

First run: click **Create new account**, pick "Using Entopic as" (Clinician,
Student, Faculty, Researcher, Investigation unit) — the workspace changes to
match. Founder/admin sign-in is `entopic-admin`; the password is the one you
set, or the built-in default if you have not changed it.

## What to try

| To see | Do this |
|---|---|
| The exam + live engine | New patient → work down the left sidebar. The right panel reasons as you type. |
| **The new sidebar grouping** | Click any stage header (Registration, History, Examination…) to fold it. Each stage has its own hairline colour and a done/total count. It remembers what you folded. |
| The simulator | Sign in as a Student → Study → Clinical simulation. Try **Challenge** — the copilot goes dark. |
| **The engine being wrong on purpose** | Challenge tier, a few cases. When it happens the debrief names what misled it and what should have held you. |
| Real values, not conclusions | Examine IOP in a simulation — you get "IOP 28 / 25 mmHg", not "high IOP". You decide. |
| OSCE | Study → OSCE circuit. Timed, engine hidden, marks withheld to the end. |
| Assignments | Sign in as Faculty → Teaching → Assignments. |
| **Age brackets to classify** | Admin panel → "Age brackets — clinical review". **83 conditions need your call.** |
| Credential status | Admin panel → "Stored credentials". |

## Checking it yourself

```
npm test              # 343 tests
node tools/audit.js   # whole-build audit; non-zero exit if anything fails
```

## Where things live

```
index.html                  the app — open this
js/                         application code (engine, UI, teaching layer, auth)
knowledge/                  the knowledge base — 394 conditions across 9 domains
tests/                      343 automated tests
tools/audit.js              the build audit
docs/AUDIT_2026-07-26.md    what the audit found and what was fixed
ARCHITECTURE.md             how the system is put together
CHANGELOG.md                what changed and why, newest first
screenshots/                the app, captured from a real browser
```

## Two things that need you

1. **83 conditions need an age bracket** (Admin → Age brackets). Keratoconus,
   Optic Neuritis and the rest are epidemiological calls, so they are yours,
   not mine. Nothing has changed for them in the meantime — they behave exactly
   as they did before.
2. **257 conditions are still flagged provisional.** The Review Queue is where
   you sign them off, and it exports your sign-offs into the build.

## What this is not

The sign-in screen is a convenience lock, not access control — anyone with this
folder can read the data. Passwords are now properly hashed so a copied backup
does not reveal them, but real authentication needs the cloud backend. And every
clinical output is advisory: it requires your correlation, always.
