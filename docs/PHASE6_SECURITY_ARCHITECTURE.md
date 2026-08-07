# Phase 6 — Security Architecture

---

## 1. The security model in one paragraph

The **device** is the trust anchor, not the server. Patient data is encrypted
on the device with a key the server never sees, and reaches the cloud only as
ciphertext. Tenant isolation is enforced by PostgreSQL row-level security and
never trusted to the client. The diagnostic engine has no network path in any
configuration, so no availability or confidentiality failure upstream can
affect a consultation. What the architecture does **not** yet do is enforce
*roles* — that boundary is presentational, and it is the largest gap.

```
       SECRET                       PROTECTS                    IF LOST
  ─────────────────────────────────────────────────────────────────────────
  account password        →  the sign-in screen        →  local records still
                                                          encrypted
  vault passphrase        ─┐
  recovery code (printed) ─┼─► the SAME data key (DEK) →  records unreadable
  master password (opt-in)─┘                               only if ALL are lost
  Supabase refresh token  →  the clinic's cloud copy   →  server-side breach
  PHI key                 →  cloud ciphertext          →  cloud copy readable
```

Four independent doors to the data key, three of which are ordinary defaults.
That is deliberate: encrypting clinical records badly is worse than not
encrypting them, because a locked-out clinic loses everything.

---

## 2. Authentication

### Local accounts

| property | today |
|---|---|
| Storage | PBKDF2-SHA-256, per-user salt, hashed at rest |
| Legacy migration | Plaintext accounts upgraded on next successful sign-in |
| Throttling | Yes, with an audited `login_throttled` event |
| Registration | Self-service; first account becomes the clinic |
| Admin | A separate ephemeral session user, never written to the account store |
| MFA | **None** (SEC-6) |
| Recovery | Admin can change a password; no self-service reset |

**Honest framing, and it is written into the UI:** this is a *convenience lock
on a local application*. Someone with the device and the source can bypass the
sign-in screen. What they cannot bypass is the vault — which is why the vault,
not the login, is the real control.

### Cloud identity

Supabase auth. Access token + long-lived refresh token, **vault-wrapped at
rest**, so a locked device holds no usable token — without that, a stolen
laptop that could not read its own disk could still drain the clinic's cloud.
401 triggers exactly one refresh-and-retry.

**Gaps: no MFA, no session revocation (SEC-4), no device binding, no session
inventory.** Revocation today means going to the Supabase dashboard.

### Authentication maturity: **4 / 10**

Correct primitives (PBKDF2 at current parameters, throttling, wrapped tokens,
no plaintext anywhere), missing the enterprise layer entirely: MFA, SSO/SAML,
revocation, session listing, device binding, lockout policy.

---

## 3. Authorisation

Two orthogonal axes: **role** decides what is *shown*; **tier** decides what is
*unlocked*; `can(cap)` requires both.

**This is a product-capability model, not an access-control model, and the
distinction matters.** `isAdmin()` reads `CU.admin === true` from a page
variable. A signed-in student with a browser console is an administrator.

| boundary | enforced where | verdict |
|---|---|---|
| Clinic ↔ clinic (cloud) | **server, RLS** | ✅ real |
| KB write | **server, allow-list** | ✅ real |
| Audit read | **server, admin only** | ✅ real |
| Role ↔ role (local records) | client | ❌ **presentational (SEC-2)** |
| Student ↔ patient data | client | ❌ presentational |
| Faculty sign-off | client | ❌ presentational |

**Is privilege escalation possible? Locally, yes and trivially** — one console
assignment. **Across clinics, no**: RLS is evaluated server-side with the
querying role's privileges and does not consult the client.

That is the right thing to have got right first. A local escalation exposes one
device's records to someone who already has that device; a tenant escalation
would expose every clinic to anyone with an account.

**The fix is not to obfuscate the client.** It is to make the server the
authority for role-scoped reads once records are cloud-resident — RLS policies
keyed on `clinic_members.role`. Roughly 80 hours, and it only becomes
*meaningful* in a multi-user clinic, which is exactly the deployment being sold
next.

---

## 4. Key management

```
  passphrase ──PBKDF2-SHA-256, 210 000, 16-byte salt──► KEK_pass ─┐
  recovery   ──PBKDF2, own salt───────────────────────► KEK_rec  ─┼─► unwrap
  master     ──PBKDF2, own salt (opt-in)──────────────► KEK_admin─┘    the
                                                                       DEK
  DEK (AES-GCM-256, random, generated once, never leaves the device)
    └── encrypts: patients · visits · audit · users
```

**Properties, and why each was chosen:**

- **The DEK never changes.** Changing or resetting a passphrase re-wraps it, so
  the operation is instant and cannot half-finish. Re-encrypting every record
  would be a long, interruptible operation on precisely the data being rescued.
- **A wrong-but-well-formed key is rejected before adoption** by decrypting a
  check blob — otherwise a bad key would surface later as unreadable records
  instead of a clean "wrong passphrase".
- **The wrapped key is mirrored to IndexedDB.** Without it, recovered
  ciphertext would be permanently unreadable, making the safety mirror worse
  than useless in the disaster it exists for.
- **Enabling verifies every store by reading it back and decrypting it** before
  moving on. A migration that wrote ciphertext it could not itself read would
  destroy a clinic.
- **Cloud PHI uses a separate key** from the device vault, and backup files use
  a passphrase carried with the file — a backup must restore onto a replacement
  machine that has no vault at all.

**Administrator escrow (2026-08-07).** The founder's decision, implemented as a
third wrapping. Its properties are in `js/vault-admin-recovery.js` and tested in
`tests/vault-admin-reset.test.js`; the security-relevant ones:

- opt-in, never a default;
- **enrolment requires the user's own passphrase**, so an administrator cannot
  add themselves to a vault they could not already open;
- master password ≥ 16 characters and must differ from the passphrase;
- **the reset does not unlock the vault** — restoring access and taking access
  are different acts, and whoever opens it afterwards is audited as themselves;
- the user is forced to replace the administrator's temporary passphrase;
- enrolment, reset and **failed reset attempts** are all audited;
- reset shares the passphrase throttle, so the master password cannot be
  brute-forced faster than what it overrides;
- revocable with the passphrase alone.

**It is still key escrow, and the UI says so in those words before enrolment.**
An escrow the user did not understand they agreed to is a privacy incident
waiting to be discovered.

---

## 5. Encryption inventory

| data | at rest | in transit | key |
|---|---|---|---|
| patients, visits, audit, users | AES-GCM-256 **when the vault is on** | — | device DEK |
| everything else local | **plaintext** | — | — |
| cloud patients/visits | AES-GCM ciphertext in `jsonb` | TLS | PHI key |
| cloud metadata (ids, timestamps, clinic) | **plaintext** | TLS | — |
| backup file | **plaintext by default**; AES-GCM if chosen | — | file passphrase |
| IndexedDB mirror | same envelope as the primary | — | device DEK |
| **automatic snapshots (new)** | same envelope | — | device DEK |
| Supabase session token | vault-wrapped | TLS | device DEK |
| Anthropic API key | vault-wrapped | TLS | device DEK |

**Two rows are the findings.** "Everything else local is plaintext" is only
acceptable because the classification table says what those stores are, and
none is PHI. "Backup file plaintext by default" is SEC-3 and should change.

---

## 6. Input handling

| surface | control |
|---|---|
| All rendered strings | one escaping module; a test **fails if any module carries a private copy** — the drift that produces XSS years later |
| Numerics | plausibility validation, advisory, never blocking |
| Cross-field | contradiction detection (F-2) |
| Medications | word-boundary matching after a real bug where `chloroquine` matched inside `hydroxychloroquine` |
| Free text → tokens | keyword matching with negation cues; no `eval`, no dynamic `Function` anywhere |
| Backup import | shape + version validated; pre-restore snapshot; merge-aware |
| Cloud rows | decrypt-or-drop; a row that will not decrypt is never stored |
| **Attachments** | **none (SEC-5)** |

**No `eval`, no `new Function`, no `innerHTML` without escaping, no
`document.write`.** Verified by test.

---

## 7. Output security

| channel | risk | control |
|---|---|---|
| HTML render | XSS | escaping + CSP |
| Report / PDF | PHI in a shared file | user-initiated |
| Export | PHI in a travelling file | ⚠ plaintext default |
| Clipboard | PHI leaving the app | none — accepted; a clinician copying is legitimate |
| LLM | PHI to a third party | **age + sex only, test-pinned** |
| Research corpus | re-identification | salted pseudonym + per-patient consent |
| Audit log | a second copy of the record | **field names only, never values** (SEC-9 fix) |
| Console | PHI in logs | ⚠ some error paths may include record ids |

---

## 8. Cloud security

| item | today |
|---|---|
| API keys | Supabase anon key is public by design; RLS is the control |
| Secrets in the repo | **none** — verified by grep for key-shaped strings |
| Environment config | `js/cloud-config.js`, per-deployment |
| TLS | enforced; CSP restricts `connect-src` to self, `*.supabase.co`, `api.anthropic.com` |
| Certificate pinning | none (impractical in a browser) |
| Multi-region | not supported |
| Infrastructure | Supabase-managed |
| Server-side validation | **none beyond column types and RLS (SEC-13)** |

---

## 9. Audit strategy

**Now recorded (66 event kinds):** sign-in and throttling, chart opened, past
visit viewed, visit started/continued/completed, **record changed**, **record
amended after completion**, patient created/deleted, conflicts, storage
corruption, write failure, save failure, completion refusal, migrations,
consent given/withdrawn, research export/withdrawal, vault enable/unlock/
disable/passphrase change/recovery use, **admin enrolment, admin reset, failed
admin reset, admin withdrawal**, KB overlay submitted/reviewed/deleted, backup
exported, restore, competency sign-off, certificates, investigations.

**Still missing:**

| gap | why it matters |
|---|---|
| Knowledge-base edits by a KB editor | a change to clinical logic should be as traceable as a change to a record |
| Faculty assessment changes | an educational record with consequences |
| Bulk read patterns | the signature of exfiltration; nothing counts reads per session |
| Server-side coverage | the client can simply not send an entry (SEC-8) |
| Tamper evidence | no hash chain; an insider with the device can edit the local log |

**The strategy that follows:** the *local* log is operational and can be
truncated; the *server* log is evidential and must be complete. Today the local
one is complete and the server one is best-effort, which is exactly backwards.
Fixing SEC-8 — queue and retry audit pushes with the same durability the
tombstone queue now has — is the highest-value auditability work.

---

## 10. Security scorecard

Scored against **what a healthcare platform holding a million records needs**.

| dimension | score | why |
|---|---|---|
| **Authentication** | **4** | Correct primitives, no enterprise layer. No MFA, SSO, or revocation. |
| **Authorisation** | **4** | Tenant isolation is genuinely strong and server-enforced. Role isolation is presentational. Two very different scores averaged. |
| **Privacy** | **7** | LLM firewall measured not asserted; per-patient research consent; PII separated from analytics; audit entries carry field names not values. Loses points for no retention policy and no minimisation review. |
| **Encryption** | **7** | Real E2E to the cloud, sound key management, three recovery doors. Loses points because it is **off by default** and backups default to plaintext. |
| **Storage** | **8** | Corrupt-store refusal, mirror, snapshots, declared classification enforced by tests. |
| **Auditability** | **6** | 66 event kinds, append-only server table, and now change-auditing. Loses points for best-effort push and no tamper evidence. |
| **Threat resistance** | **6** | Zero runtime dependencies is a major structural advantage. Local role escalation is trivial. |
| **Cloud security** | **7** | RLS verified against a real database; helpers locked down; no secrets in the repo. No server-side validation. |
| **Offline security** | **8** | The strongest area. Engine provably network-free; wrapped secrets; idle lock; a locked device holds no usable token. |
| **Compliance** | **4** | Many technical safeguards are in place; almost no documentation, no DPIA, no retention schedule, and **ADR-011 still unmade**. |
| **Incident response** | **3** | A playbook now exists (this phase). No detection, no monitoring, no drill. |
| **Enterprise readiness** | **3** | No SSO, MFA, org hierarchy, revocation, or residency controls. |
| **Healthcare security** | **6** | E2E encryption, append-only audit, consent gating and PHI separation are real and well built. Missing: retention, breach detection, formal validation. |

**Overall: 5.6 / 10 — technically sound foundations with real, specific gaps,
and almost no governance layer.**

The pattern is consistent: **what has been built is built well; what is missing
is missing entirely.** That is the normal shape of a solo-founder product and
it is a much better position than half-built controls, because there is nothing
here to unpick.

---

## 11. The final questions

**Would you trust Entopic with one million patient records?**
**No — not yet, and not because of anything already built.** At a million
records you need MFA, session revocation, breach detection, retention
enforcement and role-level server authorisation, and Entopic has none of the
five. Encryption at rest being opt-in would also be indefensible at that scale.
Those are SEC-1, 2, 4, 6 and 11 — roughly 400 hours, not a redesign.

**Would you trust it in a university hospital?**
**For teaching, yes** — with the student cohort on data that is not the
hospital's clinical record. **For their patient records, no**: they will
require SSO, MFA, an audited retention policy and a regulatory classification
in the first procurement meeting, and no amount of good cryptography substitutes
for them.

**Would you trust it for nationwide deployment?**
**No, and it should not attempt it.** Nationwide needs data residency,
monitoring, a breach-notification capability with legal review, formal
validation and an on-call team. That is a company, not a sprint.

**Would you approve a commercial launch?**
**Yes — for solo and small group private practice, with four conditions**, all
of which are weeks rather than months:

1. **Encryption at rest ON by default** (SEC-1). Opt-in security is not
   security; it is a feature nobody used.
2. **Encrypted backup as the default export** (SEC-3). The file most likely to
   leave the building must not be the one with no protection.
3. **Session revocation** (SEC-4), even if it is only "sign out all devices".
4. **A written privacy notice and retention statement.** A clinic cannot
   lawfully use this without being able to tell patients what happens to their
   data.

Everything else on the list can follow customers. Those four cannot, because
each one is a promise a clinic makes to its patients on Entopic's behalf.
