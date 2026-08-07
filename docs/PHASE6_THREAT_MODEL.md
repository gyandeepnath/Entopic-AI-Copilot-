# Phase 6 — Threat Model

**Role:** CISO · **Date:** 2026-08-07 · **Scope:** every subsystem.

Claims marked **measured** were produced by running the software. Claims about
the *server* are **unverified against a live database** — this session had no
Supabase project — and say what must be checked before anyone relies on them.

---

## 1. Assets, ranked by what their loss costs

| # | asset | where it lives | loss = |
|---|---|---|---|
| 1 | **Patient identity + clinical record** | device (encrypted), cloud (ciphertext), backups | Irreversible harm to a named person. Everything else is downstream. |
| 2 | **The vault master password / DEK** | user's head; wrapped on device | One secret that opens *every* record on a device. Since 2026-08-07 an enrolled admin master password is a second such secret. |
| 3 | **Supabase refresh token** | device, vault-wrapped | Pulls the whole clinic **from the server**, no device needed. The single highest-leverage credential. |
| 4 | **Audit log** | device (encrypted), server (append-only) | The only record of who did what. Its loss is undetectable after the fact. |
| 5 | **Clinical knowledge base** | bundled + cloud | Silent modification changes what clinicians are told. An integrity asset, not a confidentiality one. |
| 6 | **Consent register** | device | The lawful basis for every research record. Without it the clinic is processing data it cannot show permission for. |
| 7 | **Anthropic API key** | device, vault-wrapped | Money, and a channel that could be abused. |
| 8 | **Student / faculty records** | device, cloud | Educational records; personal data with its own governance. |

---

## 2. Threat actors, with what they actually get

| actor | capability | motivation | realistic outcome today |
|---|---|---|---|
| **Opportunistic thief** | takes the laptop | resale | **Nothing**, if the vault is on and the device is locked: disk unreadable, session token wrapped. Everything, if the vault is off. |
| **Curious insider** (staff, student) | valid login, physical access | nosiness, gossip | **Can read every record their role reaches, and roles are not enforced server-side for local data.** Reads are audited. This is the most likely real incident. |
| **Malicious insider** (admin) | admin rights + master password | grievance, exfiltration | Everything, including silent decryption of any enrolled device. Audited but not prevented. |
| **Remote attacker, no credentials** | internet | data theft | **Blocked.** RLS denies `anon`; there is no unauthenticated read path. |
| **Remote attacker with a stolen token** | a refresh token | data theft | **The whole clinic's ciphertext**, and the PHI key if they also have the device. No server-side revocation exists. |
| **Compromised dependency** | code execution in the page | anything | **Very low surface: zero runtime npm dependencies.** No CDN, no bundler, no supply chain in the browser. |
| **Compromised Supabase operator** | database access | data theft | **Ciphertext only.** Cannot read patient data. Can delete it, and can read metadata: clinic ids, record ids, timestamps, sizes. |
| **Compromised LLM provider** | sees API payloads | data | **Age and sex only** — pinned by `tests/llm-privacy.test.js`. |
| **Regulator / litigant** | legal process | evidence | Gets the audit trail. Whether it says enough is §9 of the security architecture. |
| **The clinician themselves** | full access | error | Mis-deletion, mis-amendment. Guarded by typed-name confirmation, pre-delete snapshot, amendment trail. |

---

## 3. Trust boundaries

```
┌── B1: the human ──────────────────────────────────────────────────┐
│  passphrase · master password · recovery code · account password  │
│  Crossed by: shoulder-surfing, phishing, reuse, a sticky note.    │
│  Control: throttled unlock, PBKDF2-210k, 16-char master minimum.  │
└───────────────────────────────────────────────────────────────────┘
┌── B2: the device ─────────────────────────────────────────────────┐
│  localStorage · IndexedDB · in-memory DEK while unlocked          │
│  Crossed by: theft, a copied profile, malware, another OS user.   │
│  Control: AES-GCM-256 at rest, idle auto-lock, wrapped secrets.   │
│  NOT protected: an unlocked, unattended machine. By definition.   │
└───────────────────────────────────────────────────────────────────┘
┌── B3: the browser origin ─────────────────────────────────────────┐
│  the page itself · CSP · same-origin policy                       │
│  Crossed by: XSS.  Control: escaping discipline + CSP connect-src │
│  restricted to self, the clinic's Supabase, and Anthropic — so    │
│  even a successful injection has nowhere to send what it steals.  │
└───────────────────────────────────────────────────────────────────┘
┌── B4: the network ────────────────────────────────────────────────┐
│  TLS to Supabase and Anthropic.  Payloads already ciphertext.     │
└───────────────────────────────────────────────────────────────────┘
┌── B5: the tenant ─────────────────────────────────────────────────┐
│  RLS via private.is_clinic_member().  THE boundary that keeps one │
│  clinic out of another. Server-enforced, never client-trusted.    │
└───────────────────────────────────────────────────────────────────┘
┌── B6: the role ───────────────────────────────────────────────────┐
│  ⚠ WEAKEST. Roles gate the UI, not the data. Locally a signed-in  │
│  user can reach any record through the console. See SEC-2.        │
└───────────────────────────────────────────────────────────────────┘
```

---

## 4. Attack surface map

| entry point | reachable by | worst case | control |
|---|---|---|---|
| Login form | anyone with the device | account takeover | PBKDF2 hashed, throttled |
| Vault unlock | anyone with the device | all records | 210k PBKDF2, exponential throttle |
| **Admin reset (new)** | anyone with the device **and** the master password | all records on it | 16-char minimum, shared throttle, every attempt audited, does not unlock |
| Recovery code entry | anyone with the device + the code | all records | 125-bit code |
| Every exam field | any signed-in user | stored XSS | escaping via one module, enforced by a test that forbids private copies |
| Free-text medication / notes | any signed-in user | parser abuse | word-boundary matching, no `eval`, no dynamic `Function` |
| File / image attachment | any signed-in user | malicious file stored | **SEC-5: no type or size validation.** Stored locally, never executed. |
| Backup import | any signed-in user | record replacement | shape + version validated, pre-restore snapshot, merge-aware |
| Cloud REST | a valid token | that clinic's ciphertext | RLS |
| Realtime socket | a valid token | that clinic's ciphertext | RLS on the publication |
| LLM call | any signed-in user with a key | prompt content | de-identified to age + sex, test-pinned |
| Knowledge-base import | a KB editor | altered clinical logic | `is_kb_editor()` allow-list |

---

## 5. Data flows that cross a boundary

| # | flow | crosses | protection | residual |
|---|---|---|---|---|
| 1 | Exam → localStorage | B2 | AES-GCM-256 when the vault is on | **Off by default.** SEC-1. |
| 2 | Save → IndexedDB mirror | B2 | same envelope | same |
| 3 | Save → cloud | B2→B4→B5 | `phiEncrypt` per record; the PHI gate is the single chokepoint | server sees metadata |
| 4 | Cloud → device | B5→B2 | decrypt or drop; never stored as ciphertext | — |
| 5 | Export → file | B2→outside | **plaintext by default**; encrypted export exists | SEC-3 |
| 6 | Visit → LLM | B2→B4→third party | age + sex only, test-pinned | user-typed free text if they paste it |
| 7 | Visit → research corpus | B2 | salted pseudonym, per-patient consent | salt is local |
| 8 | Audit → server | B2→B5 | opaque ids only, append-only | **best-effort, not queued.** SEC-8 |
| 9 | Vault DEK → admin wrap | B1→B2 | PBKDF2-210k, opt-in, audited | **key escrow by design.** SEC-10 |

---

## 6. Sensitive operations, and what stands behind each

| operation | gate today | adequate? |
|---|---|---|
| Read a patient record | signed in + vault unlocked | ⚠ role not enforced (SEC-2) |
| Amend a completed visit | none beyond being signed in | now **audited as an amendment** (SEC-9, fixed) |
| Delete a patient | typed name + forced snapshot | ✅ good |
| Turn the vault off | passphrase + confirmation | ✅ |
| **Enrol an admin (escrow)** | **the user's own passphrase** + confirmation | ✅ — cannot be imposed |
| **Reset a passphrase** | master password, throttled, audited | ✅ for the model chosen |
| Export a backup | signed in | ⚠ plaintext default (SEC-3) |
| Restore a backup | validated + snapshot | ✅ |
| Publish knowledge | server allow-list | ✅ |
| Sign off a competency | faculty role, client-checked | ⚠ SEC-2 |

---

## 7. The findings

Ranked by expected harm.

| id | finding | severity | status |
|---|---|---|---|
| **SEC-1** | **Encryption at rest is OFF by default.** A clinic that never opens the admin panel stores every record in plaintext localStorage. The best control in the product is opt-in. | **High** | open |
| **SEC-2** | **Roles are a UI concern, not a security boundary.** `isAdmin()` is `CU.admin === true` in the page. Locally, any signed-in user can reach any record. Server-side RLS is clinic-level, not role-level. | **High** | open |
| **SEC-3** | **Default backup export is plaintext.** The copy most likely to travel (USB, Downloads, email) is the one with no encryption. | **High** | ✅ **fixed 2026-08-07** — `exportBackup()` asks for a passphrase and encrypts; plaintext needs a second explicit confirmation and is audited |
| **SEC-4** | **No session revocation.** A stolen refresh token stays valid until it expires. There is no in-app "sign out everywhere". | **High** | open |
| **SEC-5** | **Attachments were not type-validated.** A size cap and a zero-byte guard existed — my original wording overstated this — but `accept=` is a UI hint that drag-and-drop ignores, and `fsIngest` never checked the type at all. | Medium | ✅ **fixed 2026-08-07** — allow-list plus magic-byte checking, both before the bytes are stored |
| **SEC-6** | **No MFA anywhere.** Neither account nor vault. | Medium | open |
| **SEC-7** | **`script-src 'unsafe-inline'`.** The UI is built on inline handlers, so the CSP cannot forbid inline script. Escaping discipline is the actual control; `connect-src` limits the blast radius. | Medium | accepted, documented |
| **SEC-8** | **Audit push is best-effort.** A failed push is not queued or retried; the local log is capped at 2,000. For evidence, that is the wrong service level. | Medium | open |
| **SEC-9** | **Record *changes* were not audited** — only reads. | Medium | ✅ **fixed 2026-08-07** |
| **SEC-10** | **Admin escrow is a real confidentiality reduction.** Enrolled, the master-password holder can decrypt every record on the device. | By design | ✅ mitigated: opt-in, consent-gated, audited, revocable |
| **SEC-11** | No breach detection. Nothing notices bulk export, mass reads, or repeated failed unlocks across devices. | Medium | open |
| **SEC-12** | No retention or disposal policy. Records are kept forever by default. | Medium | ◐ **partly closed** — a retention floor and archival now exist (BE-10), but archiving is a MOVE, not disposal; nothing is ever destroyed and no disposal record exists |
| **SEC-13** | Server-side input validation is absent — a valid token can write any JSON into `data`. Contained by encryption and RLS. | Low | open |
| **SEC-14** | Client-generated record ids are `Date.now()`-based, so they are guessable. They are not capability tokens (RLS is the control), so this is enumeration comfort, not access. | Low | accepted |

**SEC-1, SEC-2, SEC-3 and SEC-4 are the four that would fail a hospital
procurement review**, and none of them is hard.

---

## 8. What is genuinely strong

Stated because a threat model that only lists problems is not an assessment.

- **Zero runtime dependencies.** No npm at runtime, no CDN, no bundler. The
  supply-chain attack that has hit most healthcare front ends this decade has
  no path in.
- **Real end-to-end encryption to the cloud.** The server operator cannot read
  patient data. Most "encrypted" health SaaS means TLS plus disk encryption,
  which the operator can read straight through.
- **RLS as the tenant boundary**, with `SECURITY DEFINER` helpers and pinned
  `search_path`, verified against a real database when migration 004 was
  written.
- **The LLM firewall is measured, not asserted.** A test fails if anything
  beyond age and sex can reach the API.
- **One escaping module**, with a test that forbids a private copy anywhere
  else — the specific failure that produces XSS years later.
- **`connect-src` is the load-bearing CSP directive**: even a successful
  injection could only send data to the app, the clinic's own Supabase, or
  Anthropic.
- **Append-only audit by absence of permission**, not by a trigger someone can
  drop.
