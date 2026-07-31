# Entopic — Enterprise Healthcare Security Review
**Date:** 30 July 2026
**Assumption:** patient data is highly sensitive; assume a determined attacker and a stolen device.
**Method:** adversarial testing against the running application and a real PostgreSQL 16 instance. Every finding below was reproduced, not inferred.

---

## Executive summary

One **critical** vulnerability was found and fixed this session, and it mattered because it **falsified a security claim I had previously made to you**.

Last session I said the record vault meant a stolen laptop "gives up nothing." That was **wrong**. Patient records were encrypted — but the credentials that open the *cloud copy of the same records* were sitting beside them in plaintext.

| | Found | Status |
|---|---|---|
| **Critical** | 1 (S-1) | ✅ Fixed + tested |
| **High** | 1 (S-2, load-order guard failure) | ✅ Fixed + tested |
| **Medium** | 3 | 1 fixed · 2 scoped |
| **Low / accepted** | 5 | documented with rationale |
| **Verified sound** | 8 controls | listed below — do not "improve" these away |

443 tests passing · build audit 0 FAIL · all surfaces clean with encryption on and off.

---

# 1. Critical vulnerabilities

## S-1 — Cloud session token and API key in plaintext, defeating the vault ✅ FIXED

**Severity: Critical.** Confidentiality of the entire patient record set.

### Reproduction (verified in a browser)
With the record vault **ON** — the state described to the clinic as protected — I dumped `localStorage` from a "stolen" device:

| Asset | Exposed? |
|---|---|
| Patient name | ❌ protected |
| MRN | ❌ protected |
| **Supabase access token** | ✅ **PLAINTEXT** |
| **Supabase refresh token** | ✅ **PLAINTEXT** |
| **Claude API key** | ✅ **PLAINTEXT** |

### Impact
The attacker cannot read the local disk — and does not need to. With the **refresh token** (long-lived, mints fresh access tokens indefinitely) they authenticate as that clinician and pull **every patient record for the clinic from the server**, over the legitimate API, from any machine. RLS does not help: they *are* the clinician as far as the server is concerned. The Claude key is a separate, billable loss.

This meant the vault's protection was **partial in exactly the scenario it was sold for**, which is worse than an honest gap because the clinic would not compensate for a risk it believed was closed.

### Fix implemented
Generic secret-wrapping in `js/local-vault.js` (`vaultSecretSet` / `vaultSecretGet`), applied to `entopic_cloud_session` and `entopic_apikey`:

- Wrapped with the vault key (AES-GCM-256) whenever the vault is open.
- **Withheld while locked** — a locked device cannot reach the cloud on a thief's behalf.
- Dropped from memory on lock, alongside the record cache.
- Restored automatically on unlock (wired inside `vaultUnlock`, not the UI, so *every* unlock path restores them).
- Secrets stored *before* encryption was enabled are re-wrapped the first time the vault opens.
- With the vault off, behaviour is byte-identical to before — no forced migration.

### Verified after the fix
| Scenario | Result |
|---|---|
| Vault on, disk dump | no token, no refresh token, no API key |
| Reload (locked device) | nothing on disk; `cloudSignedIn()` false; API key `""` |
| Unlock | session, refresh token, API key and records all restored |

Pinned by 4 tests in `tests/local-vault.test.js`.

### Backward compatibility / risk
Total compatibility; risk low and verified. **Residual:** an *unlocked, unattended* device still exposes everything in memory — by design. That is what the idle auto-lock is for, and it now closes the vault too.

---

# 2. High

## S-2 — A load-order guard silently failed, parsing ciphertext as a live token ✅ FIXED

Found while fixing S-1, and it is **the same root cause as the XSS fixed earlier today (R-1)**:

```js
if (typeof vaultIsWrappedSecret === "function" && vaultIsWrappedSecret(raw)) { … }
```

`cloudLoadState()` runs at **module load**, and `cloud-sync.js` loaded *before* `local-vault.js`. The check was always false, so the encryption envelope was `JSON.parse`d straight into `CLOUD.session` — leaving the client believing it held a session whose "access token" was ciphertext.

**The pattern is the vulnerability:** *a guard that depends on load order is not a guard.* Twice now it degraded silently to a weaker path.

**Fixed three ways:**
1. `local-vault.js` moved ahead of its consumers in `index.html`.
2. The check is now **self-contained** (inspects the object's shape), so it cannot depend on load order again.
3. `tests/dom-escape.test.js` asserts both orderings, so a reshuffle fails CI instead of failing in a clinic.

---

# 3. Medium

| # | Finding | Status |
|---|---|---|
| **S-3** | **Vault unlock has no attempt throttling.** Login is throttled; the vault passphrase is not. Mitigated by PBKDF2 at 210,000 iterations (each guess is expensive) and by the fact that an attacker with the device can attack the ciphertext offline regardless — UI throttling is theatre against that threat. **Scoped:** add a UI delay anyway to slow an opportunistic bystander. |
| **S-4** | **No Content-Security-Policy headers when served over HTTP.** CSP exists as a `<meta>` tag and covers the main risks, but `HSTS`, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options` require a web server. Irrelevant for `file://`; **required** before any network deployment. |
| **S-5** | **`script-src 'unsafe-inline'`** remains, because the UI is built on inline handlers. This is the main structural weakness in the CSP. Removing it is an event-delegation refactor — real, not urgent, tracked in the architecture review as T-2. |

---

# 4. Low / accepted with rationale

- **Client-side `isAdmin()` is bypassable via devtools.** True and *acceptable*: it gates local UI only. Server-side authority is RLS, which does not consult it. Anyone with devtools already has the device.
- **Anon key is public.** By design in Supabase — access is enforced by RLS, not by hiding the key. The panel explicitly warns against pasting the `service_role` key.
- **No CSRF tokens.** Structurally not applicable: authentication is a `Bearer` header, not cookies, so a cross-site request cannot carry credentials.
- **Replay protection is TLS + JWT `exp`.** No application-level nonce. Appropriate for this architecture.
- **Audit trail can be truncated locally** (bounded storage), but truncation is now self-declaring and the server log is append-only.

---

# 5. Controls verified sound — protect these

Stating what is *right* matters as much as what is broken:

1. **Tenant isolation genuinely works.** On a database built from `001→004`, clinician B sees only clinic B's patients, cannot insert into clinic A, cannot update A's records, and `anon` is denied outright.
2. **Privilege escalation is structurally blocked server-side.** `clinic_members` has SELECT, INSERT and DELETE policies but **no UPDATE policy** — with RLS enabled, a member simply cannot change their own role to admin through the API. Self-re-insertion as admin is also blocked (`cm_insert` only permits self-insert into an *empty* clinic).
3. **No SQL/path injection surface on the client.** The only value concatenated into a REST path (`kind`) is an internal literal (`"patients"`/`"visits"`); all user data travels in the JSON body, which PostgREST parameterises.
4. **The audit log is immutable server-side** — INSERT and SELECT policies only.
5. **Passwords use PBKDF2-SHA-256, salted per user.**
6. **PHI is encrypted before egress**, gated on explicit consent.
7. **No PHI in logs** — all 25 `console.*` calls checked.
8. **Login brute-force is throttled** with capped exponential backoff, per username, case-insensitive.

---

# 6. Threat model

| # | Adversary | Capability | Primary target | Control | Residual |
|---|---|---|---|---|---|
| T1 | **Opportunistic thief** | Steals the laptop | Records on disk | Vault (AES-GCM-256) + OS disk encryption | None if locked; **all** if taken while unlocked |
| T2 | **Thief with cloud access** | Steals device, uses stored tokens | Records on the **server** | **S-1 fix** — tokens wrapped, withheld while locked | None while locked |
| T3 | **Walk-up insider** | Physical access, no credentials | Records via the UI | Clinic mode (signup closed, idle auto-lock), login throttling | An unlocked unattended terminal |
| T4 | **Malicious staff member** | Valid clinic credentials | Other clinics' records; privilege escalation | RLS tenant isolation; no UPDATE policy on roles | Can read **their own clinic's** records — inherent to the role; audit trail is the control |
| T5 | **Malicious KB publisher** | Controls a published KB bundle | Script injection into every installation | **R-1 fix** (canonical escaping) + CSP `connect-src` | `unsafe-inline` weakens defence-in-depth (S-5) |
| T6 | **Network attacker** | Intercepts traffic | Tokens, PHI in transit | TLS; PHI encrypted client-side before egress | Requires TLS to be intact |
| T7 | **Cloud provider / DB dump** | Reads the database | PHI at rest in cloud | Client-side encryption — server stores ciphertext, never the key | Metadata (ids, timestamps) is clear |
| T8 | **Backup thief** | Finds an exported file | Everything | Encrypted backup export (PBKDF2 + AES-GCM) | Unencrypted export still offered behind a warning |

**Out of scope / accepted:** malware on an unlocked clinical device (defeats any client-side control); a hostile administrator (they hold the keys by definition — the audit trail is the deterrent).

---

# 7. Attack surface

```
                        ┌──────────────────────────────────────┐
   T3 walk-up ────────► │  BROWSER (the whole application)     │
   T1 device theft ───► │                                      │
                        │  ┌────────────────────────────────┐  │
                        │  │ Diagnostic engine + KB         │  │
                        │  │ OFFLINE · no network · no LLM  │  │ ◄── T5 KB bundle
                        │  └────────────────────────────────┘  │      (escaping + CSP)
                        │  ┌────────────────────────────────┐  │
                        │  │ localStorage                   │  │
                        │  │  records ....... ENCRYPTED     │  │
                        │  │  audit ......... ENCRYPTED     │  │
                        │  │  accounts ...... ENCRYPTED     │  │
                        │  │  cloud session . ENCRYPTED ★   │  │  ★ = fixed this
                        │  │  API key ....... ENCRYPTED ★   │  │      session (S-1)
                        │  │  clinic id ..... clear (opaque)│  │
                        │  │  vault meta .... wrapped keys  │  │
                        │  └────────────────────────────────┘  │
                        └───────────────┬──────────────────────┘
                                        │ HTTPS, Bearer token
                            ┌───────────┴────────────┐
                            │                        │
              ┌─────────────▼──────────┐   ┌─────────▼────────────┐
   T6/T7 ───► │ Supabase (clinic-owned)│   │ Anthropic API        │ ◄── de-identified
              │  RLS tenant isolation  │   │  age + sex only      │     text only
              │  append-only audit log │   │  (no PII, tripwired) │
              │  PHI stored ciphertext │   └──────────────────────┘
              └────────────────────────┘
                            ▲
                            │ T4 valid credentials → own clinic only
                            │ T2 stolen token → BLOCKED while device locked ★

   Egress is confined by CSP connect-src to: self · *.supabase.co · api.anthropic.com
```

**Trust boundaries:** (1) device ↔ network — everything crossing is TLS + client-encrypted PHI; (2) client ↔ database — the client is never trusted; RLS decides; (3) app ↔ LLM — de-identified text only, and the diagnostic path never crosses it.

---

# 8. Security roadmap

### Done this session
1. ✅ **S-1** cloud session + API key wrapped in the vault (critical).
2. ✅ **S-2** load-order guard failure fixed three ways, incl. CI assertions.
3. ✅ **R-1** stored XSS from duplicated escaping (earlier today).

### Before any networked deployment (blocking)
4. **S-4 — security headers.** HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type-Options at the web server. Cheap; only relevant once served over HTTP.
5. **Rehearse the vault recovery code** on a spare device, and **test a restore** — an untested recovery path is not a control.

### Next quarter
6. **S-3** vault-unlock throttling (small).
7. **Server-side error/monitoring feed** — de-identified failures into the append-only audit log, so silent failure stops being invisible.
8. **Per-user vault unlock** — today one clinic passphrase unlocks the device, so unlock is not attributable to an individual.

### Larger, when justified
9. **S-5** event delegation → drop `script-src 'unsafe-inline'`.
10. **Session revocation** — no way to invalidate a stolen refresh token remotely today; sign-out is local. (Supabase-side token revocation is the mechanism.)

---

# 9. Compliance readiness — honest assessment

**This is not a compliance certification, and I am not qualified to give one.**

| Control family | State |
|---|---|
| Access control | Reasonable: per-user accounts, hashed passwords, server-enforced tenant isolation, idle lock |
| Encryption at rest | Implemented client-side (opt-in) — **must be turned on**; readiness panel reports the truth per device |
| Encryption in transit | TLS + client-side PHI encryption before egress |
| Audit trail | Local trail with self-declaring truncation; **immutable append-only server log when connected** |
| Data minimisation | De-identified analytics separated from PII; LLM receives age + sex only |
| Breach detection | **Weak** — no monitoring or alerting (roadmap 7) |
| Session management | Idle lock, throttling; **no remote revocation** (roadmap 10) |
| Data subject rights | Export and delete exist; no formal retention policy |

**What a clinic must do that this software cannot:** appoint a data controller, write a retention and breach-notification policy, train staff, keep full-disk encryption on, and — for India — take advice on the **DPDP Act**, plus any NABH or state requirement. Those are organisational obligations. **Do not treat this document as a compliance sign-off.**

---

## Method notes and limits

- Findings were reproduced in a real browser and against real PostgreSQL 16; nothing here is speculative.
- I did **not** test against your live Supabase project, only a faithful local rebuild from the migrations.
- No penetration test by an independent party has been performed. For a healthcare deployment at scale, one should be — my review shares an author with the code, which is a genuine limitation of its independence.
