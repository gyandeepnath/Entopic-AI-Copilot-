# Phase 6 — Top 200 Security Improvements, Ranked

Ranked by **patient harm avoided × likelihood × inverse effort**. Items 1–12
are what stands between today and a defensible commercial launch.

`⚠` founder decision · `✅` done · `§` needs legal input

---

## Tier 1 · Launch blockers (1–12)

| # | improvement | effort |
|---|---|---|
| 1 | **Encryption at rest ON by default** — opt-in security is a feature nobody used (SEC-1) | 16 h |
| 2 | ✅ **Encrypted backup as the default export** (SEC-3) | done |
| 3 | **Privacy notice in-product** — no lawful deployment without one | 8 h § |
| 4 | **Session revocation / sign out everywhere** (SEC-4) | 24 h |
| 5 | ✅ **ADR-011 regulatory classification** — decided 2026-08-07: device-grade discipline, no classification claimed, R1–R8 enforced by tests | done |
| 6 | **Retention policy + disposal**, per clinic (SEC-12) | 60 h § |
| 7 | **Failed-unlock and failed-reset counters visible to an admin** — cheapest detection available | 16 h |
| 8 | **Durable audit push** (queue + retry, like the tombstone queue) (SEC-8) | 24 h |
| 9 | **Bulk-export alerting** — `data_exported` is the tripwire between a read and a breach | 16 h |
| 10 | **MFA (TOTP)** on the account (SEC-6) | 40 h |
| 11 | ✅ **Attachment type validation + content sniffing** (SEC-5) | done |
| 12 | **DPIA** | 40 h § |
| ✅ | Audit who CHANGES a record, not only who reads one (SEC-9) | done |
| ✅ | Administrator vault reset, opt-in and consent-gated | done |

## Tier 2 · Authorisation (13–35)

| # | improvement | effort |
|---|---|---|
| 13 | Role-level RLS policies keyed on `clinic_members.role` (SEC-2) | 80 h |
| 14 | Server-authoritative role, not client-declared | 24 h |
| 15 | Per-record ownership checks for student accounts | 40 h |
| 16 | Faculty sign-off enforced server-side | 32 h |
| 17 | Break-glass emergency access with mandatory audit | 32 h |
| 18 | Prevent removal of the last clinic admin | 8 h |
| 19 | Role change requires a second admin | 24 h |
| 20 | Time-boxed elevated access | 24 h |
| 21 | Deny-by-default capability checks | 32 h |
| 22 | Per-clinic feature entitlements enforced server-side | 32 h |
| 23 | Organisation tier above clinic | 80 h |
| 24 | Cross-clinic roles for chains | 40 h |
| 25 | Service accounts for integrations | 32 h |
| 26 | Scoped API tokens | 40 h |
| 27 | Audit every membership change server-side | 8 h |
| 28 | Single-use, expiring clinic join codes | 16 h |
| 29 | Admin approval for joins, not just a code | 24 h |
| 30 | Student cohort isolation | 40 h |
| 31 | Read-only roles | 16 h |
| 32 | Per-patient access restriction (VIP / staff records) | 40 h |
| 33 | Consent-scoped access for researchers | 32 h |
| 34 | Delegated access with expiry | 32 h |
| 35 | Access review report per clinic | 24 h |

## Tier 3 · Detection and response (36–65)

| # | improvement | effort |
|---|---|---|
| 36 | Hash-chained local audit log | 40 h |
| 37 | Server-side verification of the hash chain | 24 h |
| 38 | Read-volume anomaly detection | 60 h |
| 39 | Off-hours access flagging | 24 h |
| 40 | Impossible-travel detection across devices | 32 h |
| 41 | Alert on vault disabled | 8 h |
| 42 | Alert on admin enrolment | 8 h |
| 43 | Alert on repeated failed master-password attempts | 8 h |
| 44 | In-product incident log | 16 h |
| 45 | Security event export for a SIEM | 24 h |
| 46 | Per-session read counter, surfaced | 16 h |
| 47 | Notify a user when their vault is reset by an admin | 16 h |
| 48 | Notify on a new device signing in | 24 h |
| 49 | Device inventory per clinic | 32 h |
| 50 | Remote wipe / deauthorise a device | 60 h |
| 51 | Automated quarterly drill reminder | 8 h |
| 52 | Breach-notification template generator | 16 h § |
| 53 | Forensic bundle export (audit + provenance + snapshots) | 24 h |
| 54 | Retain audit beyond the 2,000 local cap | 24 h |
| 55 | Server-side audit retention policy | 16 h |
| 56 | Tamper-evident backup signing | 24 h |
| 57 | Detect a restore from a foreign clinic | 8 h |
| 58 | Rate-limit sign-in server-side | 16 h |
| 59 | Account lockout after repeated failures | 16 h |
| 60 | Alert on mass deletion | 16 h |
| 61 | Alert on research export | 8 h |
| 62 | Canary record to detect exfiltration | 24 h |
| 63 | Log CSP violations | 16 h |
| 64 | Integrity check of loaded scripts (SRI-equivalent) | 24 h |
| 65 | Health/status endpoint with security posture | 24 h |

## Tier 4 · Cryptography and secrets (66–95)

| # | improvement | effort |
|---|---|---|
| 66 | Argon2id instead of PBKDF2 where available | 32 h |
| 67 | Per-user vault keys wrapped by a clinic key | 60 h |
| 68 | Key rotation without re-encrypting records | 60 h |
| 69 | WebAuthn / hardware key unlock | 60 h |
| 70 | Passphrase strength meter with real entropy | 16 h |
| 71 | Breach-list check for passwords | 24 h |
| 72 | Force master-password rotation on a schedule | 16 h |
| 73 | Multi-admin escrow (M-of-N) | 60 h |
| 74 | Escrow usage receipt shown to the user on next unlock | 16 h |
| 75 | Separate keys per store class | 40 h |
| 76 | Encrypt the remaining local stores | 24 h |
| 77 | Encrypt IndexedDB snapshots independently | 16 h |
| 78 | Secure delete (overwrite) on removal | 24 h |
| 79 | Memory hygiene — clear the DEK on tab hide | 16 h |
| 80 | Shorter idle auto-lock, configurable | 8 h |
| 81 | Lock on OS screen-lock where detectable | 16 h |
| 82 | Cryptographic proof of a backup's completeness | 24 h |
| 83 | Signed knowledge-base bundles | 40 h |
| 84 | Verify KB signature before applying | 24 h |
| 85 | Pin the Supabase project id to prevent redirection | 8 h |
| 86 | Detect a changed anon key | 8 h |
| 87 | Secret scanning in CI | 16 h |
| 88 | Dependency scanning in CI (dev-time only) | 16 h |
| 89 | SBOM generation | 16 h |
| 90 | Reproducible build verification | 24 h |
| 91 | Subresource integrity for fonts | 8 h |
| 92 | Self-host fonts, remove the external origin | 8 h |
| 93 | Remove `unsafe-inline` by migrating event handlers | 120 h |
| 94 | Trusted Types | 40 h |
| 95 | Strict CSP with nonces | 40 h |

## Tier 5 · Privacy (96–130)

| # | improvement | effort |
|---|---|---|
| 96 | Per-patient data export (subject access) | 32 h |
| 97 | Per-patient erasure with an audited exception list | 40 h |
| 98 | Erasure propagation to backups and snapshots | 40 h |
| 99 | Records of processing activities | 24 h § |
| 100 | Data-minimisation review of every field | 24 h |
| 101 | Consent for care, recorded explicitly | 24 h § |
| 102 | Versioned consent wording with re-consent | 24 h |
| 103 | Parental consent flow for paediatric records | 32 h § |
| 104 | Re-identification risk assessment of the corpus | 24 h |
| 105 | k-anonymity check before research export | 40 h |
| 106 | Differential privacy on aggregate analytics | 60 h |
| 107 | Purpose tags on every store | 16 h |
| 108 | Retention per data class, from the classification table | 40 h |
| 109 | Automatic disposal with a disposal record | 40 h |
| 110 | Legal hold flag blocking disposal | 16 h |
| 111 | Cross-border transfer controls | 40 h § |
| 112 | Data residency selection | 60 h |
| 113 | Subprocessor register in-product | 8 h |
| 114 | DPA / BAA templates | § |
| 115 | Privacy notice versioning and acknowledgement | 16 h |
| 116 | Grievance contact in-product | 8 h |
| 117 | Cookie/storage disclosure | 8 h |
| 118 | Redact PHI from console output | 16 h |
| 119 | Redact PHI from error reports | 16 h |
| 120 | Screenshot/print watermarking with the viewer's name | 24 h |
| 121 | Clipboard-copy audit for whole records | 16 h |
| 122 | Warn before pasting free text into an LLM prompt | 16 h |
| 123 | Local-only LLM option | 80 h |
| 124 | Per-clinic LLM opt-out | 8 h |
| 125 | Prove the LLM de-identification continuously, not only in tests | 24 h |
| 126 | Anonymised telemetry, opt-in | 32 h |
| 127 | Patient-facing access log ("who saw my record") | 40 h |
| 128 | Consent receipts | 24 h |
| 129 | Research withdrawal propagation to exports already made | 32 h |
| 130 | Pseudonym rotation | 24 h |

## Tier 6 · Application hardening (131–170)

| # | improvement | effort |
|---|---|---|
| 131 | File-type allow-list on attachments | 8 h |
| 132 | Size cap per attachment and per patient | 8 h |
| 133 | Content sniffing, not extension trust | 16 h |
| 134 | Strip EXIF from uploaded images | 16 h |
| 135 | Render attachments in a sandboxed frame | 24 h |
| 136 | Never render an attachment as HTML | 8 h |
| 137 | Server-side JSON schema validation of `data` | 32 h |
| 138 | Reject an envelope that is not an envelope | 8 h |
| 139 | Size limit on `data` server-side | 4 h |
| 140 | Reject record ids not matching the client format | 8 h |
| 141 | Validate `clinic_id` on every merged row | 8 h |
| 142 | Fuzz `loadStore` against malformed input | 16 h |
| 143 | Fuzz the backup importer | 16 h |
| 144 | Property-test the merge under random interleavings | 32 h |
| 145 | Static analysis in CI | 16 h |
| 146 | Lint rule banning `innerHTML` without escaping | 8 h |
| 147 | Lint rule banning `eval` / `Function` | 4 h |
| 148 | Automated XSS test corpus against every field | 32 h |
| 149 | Test that every rendered field is escaped | 24 h |
| 150 | CSRF review of every state-changing call | 16 h |
| 151 | Clickjacking headers where hosted | 4 h |
| 152 | `Referrer-Policy` | 4 h |
| 153 | `Permissions-Policy` | 4 h |
| 154 | HSTS at the host | 4 h |
| 155 | Disable autocomplete on secret fields | 4 h |
| 156 | Clear secret inputs after use | 4 h |
| 157 | Prevent password managers storing the master password by accident | 8 h |
| 158 | Warn on browser extensions that can read the page | 16 h |
| 159 | Detect a debugger-open state for high-risk actions | 8 h |
| 160 | Obfuscate nothing — document why | 2 h |
| 161 | Timing-safe comparison everywhere secrets are compared | 8 h |
| 162 | Constant-time recovery-code check | 8 h |
| 163 | Random delay on failed unlock | 8 h |
| 164 | Cap concurrent unlock attempts across tabs | 16 h |
| 165 | Lock all tabs when one locks | 16 h |
| 166 | Warn when two tabs edit one record | 8 h |
| 167 | Prevent the vault opening in an iframe | 4 h |
| 168 | Detect a copied browser profile | 24 h |
| 169 | Bind the vault to a device fingerprint (opt-in) | 32 h |
| 170 | Panic wipe | 24 h |

## Tier 7 · Assurance and governance (171–200)

| # | improvement | effort |
|---|---|---|
| 171 | External penetration test | § 40 h |
| 172 | Remediation cycle after the test | 60 h |
| 173 | Threat model review each release | 8 h/rel |
| 174 | Security review gate in the PR checklist | 8 h |
| 175 | Vulnerability disclosure policy | 8 h |
| 176 | `security.txt` | 2 h |
| 177 | CVE monitoring for dev dependencies | 8 h |
| 178 | Signed releases | 16 h |
| 179 | Release integrity verification by the client | 24 h |
| 180 | Security training material for clinics | 16 h |
| 181 | Onboarding checklist that turns the vault on | 8 h |
| 182 | Per-clinic security posture score | 24 h |
| 183 | Nag until encryption is on | 8 h |
| 184 | Quarterly access review prompt | 8 h |
| 185 | Offboarding checklist | 8 h |
| 186 | Shared-account detection | 16 h |
| 187 | Written information security policy | 16 h § |
| 188 | Business continuity plan | 16 h § |
| 189 | Subprocessor risk assessment | 8 h § |
| 190 | Insurance review | § |
| 191 | ISO 27001 gap analysis | § 40 h |
| 192 | SOC 2 readiness | § 120 h |
| 193 | Clinical risk management file (IEC 62304-style) | 80 h § |
| 194 | Software validation package | 80 h § |
| 195 | Post-market surveillance plan | 40 h § |
| 196 | Adverse-event reporting channel | 24 h |
| 197 | Change-control record for clinical logic | 24 h |
| 198 | Independent code review of the crypto | § 24 h |
| 199 | Formal verification of the tenant-isolation policies | 40 h |
| 200 | Annual re-audit of everything above | 40 h/yr |

---

## Effort to enterprise-grade healthcare security

| tranche | contents | hours |
|---|---|---|
| **A · Launch blockers** | items 1–12 | **~290** |
| **B · Authorisation** | server-enforced roles, org tier | ~420 |
| **C · Detection & response** | audit durability, anomaly detection, revocation, forensics | ~400 |
| **D · Privacy & compliance** | rights workflows, retention, DPIA, notices, agreements | ~520 |
| **E · Assurance** | pen test, remediation, validation package, certification prep | ~600 |

**Total ≈ 2,230 hours (~13–14 months at one full-time engineer)** to a posture
a hospital's information-security office would accept.

**Tranche A alone — about 290 hours, roughly seven weeks — is what stands
between today and a defensible commercial launch to private practices.** Five
of its twelve items are under 20 hours each, and two are decisions rather than
code.

**Updated 2026-08-07: items 2, 5 and 11 are done, and SEC-9 and the vault
recovery before them. Tranche A is now roughly 240 hours.** What remains in it,
in order: encryption at rest ON by default (1), a privacy notice (3), session
revocation (4), retention and disposal (6), the failed-unlock counters (7),
durable audit push (8), bulk-export alerting (9), MFA (10), and the DPIA (12).
