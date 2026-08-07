# Phase 6 — Compliance Gap Report

**Not legal advice.** This is an engineering assessment of which technical and
organisational measures exist and which do not. Whether they are *sufficient*
in a given jurisdiction is a question for a lawyer, and the founder should get
one before selling into a hospital.

Legend: ✅ present · ◐ partial · ❌ absent · ⚠ founder decision

---

## 1. DPDP Act 2023 (India) — the primary jurisdiction

| requirement | status | note |
|---|---|---|
| Lawful basis / consent for processing | ◐ | Per-patient consent exists for **research**. Consent for *care* is assumed by the treatment relationship, which is normal, but it is not written down anywhere. |
| Notice at collection | ❌ | No privacy notice exists in the product at all. |
| Purpose limitation | ✅ | Research corpus is separated from PII and separately consented. |
| Data minimisation | ◐ | Clinically justified fields; never formally reviewed. |
| Accuracy / correction | ✅ | Records are editable, amendments are trailed, and changes are now audited. |
| **Storage limitation** | ❌ | No retention period, no disposal. Records are kept forever. |
| Security safeguards | ◐ | Strong when the vault is on; **off by default**. |
| **Breach notification** | ❌ | No detection, so no notification is possible. |
| Right of access | ◐ | Export exists; it is whole-clinic, not per-patient. |
| Right to correction | ✅ | |
| Right to erasure | ◐ | Delete exists with a forced snapshot; no propagation guarantee to backups. |
| Grievance redress | ❌ | No contact point in the product. |
| Consent manager readiness | ❌ | Not applicable yet. |
| Children's data | ❌ | Paediatric patients are handled clinically; no verifiable parental consent flow. |

**Highest DPDP exposure: notice, retention and breach notification.** All three
are *documents and a small amount of code*, not architecture.

---

## 2. HIPAA-style safeguards (for US-facing or comparison purposes)

| safeguard | status |
|---|---|
| Access control — unique user id | ✅ |
| Access control — emergency access | ❌ no break-glass |
| Access control — automatic logoff | ✅ idle auto-lock |
| Access control — encryption/decryption | ◐ opt-in |
| **Audit controls** | ✅ 66 event kinds, append-only server table, change auditing |
| Integrity — alteration/destruction protection | ✅ corrupt-store refusal, amendment trail, conflict preservation |
| **Person/entity authentication** | ◐ password only, no MFA |
| Transmission security | ✅ TLS + application-layer E2E |
| Risk analysis | ✅ this document set |
| Sanction policy | ❌ organisational |
| Information system activity review | ❌ nobody reviews the logs |
| Contingency — backup | ✅ **now automatic on-device**, plus manual export |
| Contingency — disaster recovery | ✅ documented |
| Contingency — emergency mode | ✅ **offline-first is the emergency mode** |
| BAA with subprocessors | ❌ none with Supabase or Anthropic |
| Device and media controls | ◐ vault, no remote wipe |

---

## 3. GDPR principles (for EU-facing deployment)

| principle | status |
|---|---|
| Lawfulness, fairness, transparency | ❌ no notice |
| Purpose limitation | ✅ |
| Data minimisation | ◐ |
| Accuracy | ✅ |
| **Storage limitation** | ❌ |
| Integrity and confidentiality | ◐ |
| **Accountability** | ◐ audit yes; **no records of processing, no DPIA** |
| Art. 25 privacy by design | ◐ E2E and LLM de-identification are genuine privacy-by-design; opt-in encryption is not |
| Art. 32 security of processing | ◐ |
| Art. 33/34 breach notification | ❌ |
| Art. 35 DPIA | ❌ **required** — this is health data at scale |
| Art. 28 processor agreements | ❌ |
| Art. 15–22 data-subject rights | ◐ possible manually, not as a workflow |
| Art. 37 DPO | ⚠ likely required for systematic health-data processing |

---

## 4. Medical record retention

| requirement | status |
|---|---|
| Minimum retention period | ❌ not implemented or documented |
| Retention beyond a patient's death | ❌ |
| Paediatric records to majority + N | ❌ |
| Immutability of the signed record | ◐ amendments trailed and now audited; original not cryptographically sealed |
| Legible reproduction years later | ✅ **replay does exactly this** and labels drift honestly |
| Disposal record | ❌ |
| Legal hold | ❌ |

**Replay is a genuine and unusual strength here.** Most EMRs cannot tell you
what the system actually said on the day; Entopic can, and says plainly when
the knowledge base has changed since.

---

## 5. Research governance

| requirement | status |
|---|---|
| Per-participant consent | ✅ per patient, versioned wording |
| Withdrawal | ✅ audited |
| De-identification | ✅ salted pseudonym |
| Re-identification risk assessment | ❌ |
| Ethics approval workflow | ❌ organisational |
| Data-sharing agreements | ❌ |
| Provenance of exported data | ◐ |

**The consent model is better than most.** It refuses to capture on a
practice-wide opt-in, because a practice cannot consent on a patient's behalf —
that decision alone puts this ahead of a lot of commercial research pipelines.

---

## 6. Clinical audit and safety

| requirement | status |
|---|---|
| Who accessed a record | ✅ |
| **Who changed a record** | ✅ **new this phase** |
| Amendment vs original | ✅ |
| Decision-support provenance | ✅ KB version stamped on every visit |
| **Reproducibility of a past decision** | ✅ deterministic replay |
| Clinical risk management file | ◐ Phase 2 registers exist; not in a recognised format |
| Safety incident reporting | ◐ feedback exists; not a formal channel |
| **Regulatory classification** | ❌ **ADR-011 still NOT MADE** |

---

## 7. University governance

| requirement | status |
|---|---|
| Student record separation | ◐ same store, different type |
| Educational records retention | ❌ |
| Assessment integrity | ◐ competency log exists; **faculty sign-off is client-enforced (SEC-2)** |
| Supervisor accountability | ✅ sign-offs are attributed |
| Student access to patient data | ⚠ policy question, not enforced technically |
| Institutional SSO | ❌ |

---

## 8. The gaps that actually block a sale

Ranked by how early in a procurement conversation they surface.

| # | gap | blocks | effort |
|---|---|---|---|
| 1 | **No privacy notice** | any lawful deployment | 8 h + legal |
| 2 | **No retention policy or disposal** | DPDP, GDPR, medical records | 60 h + policy |
| 3 | **Encryption off by default** | every security review | 16 h |
| 4 | **No breach detection** | DPDP, GDPR notification duties | 80 h |
| 5 | **No DPIA** | GDPR, and any hospital | 40 h + legal |
| 6 | **ADR-011 unmade** | knowing which rules even apply | ⚠ founder |
| 7 | **No MFA** | hospital procurement | 40 h |
| 8 | **No SSO** | university procurement | 80 h |
| 9 | **No BAA/DPA with subprocessors** | any regulated customer | legal |
| 10 | **No role-level server authorisation** | multi-user clinics | 80 h |

**Items 1, 3 and 6 together are about a day of engineering and one decision.**
They are the cheapest compliance movement available and they are the ones a
reviewer notices first.

---

## 9. Honest overall position

**Entopic has better technical safeguards than most small healthcare software
and almost none of the governance.**

That asymmetry is normal for an engineering-led product and it is the right way
round — a governance layer over sound technology is paperwork; sound technology
under a governance layer is a rebuild. But it means compliance readiness is
gated on **documents and decisions**, not on code, and documents and decisions
are the things that have been deferred for eight phases.

**Compliance readiness: 4 / 10.** It would be 7 with a privacy notice, a
retention schedule, a DPIA, encryption on by default, and ADR-011 answered —
perhaps three weeks of work, most of it not engineering.
