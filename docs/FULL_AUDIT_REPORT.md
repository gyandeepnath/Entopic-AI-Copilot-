# Entopic — Full Audit Report (24–25 September 2026)

**The request:** "Audit every little detail, logic, code etc, analyse, find
multiple solutions, filter the best fit and fix the problems accordingly."

**How it was done:** I ran the real app, and the real engine, on ordinary and
hostile inputs rather than only reading code. Each problem got a test that
reproduces it. Each test was then run against the **previous** version to
prove it catches the problem. Where there were several possible fixes, I chose
the one that changes least while closing the whole class of problem, and the
reasoning is in `CHANGELOG.md` ("Full audit, parts 1–13").

Everything stays **advisory-only**, red flags stay **un-suppressible**, and no
clinical content was invented. Where a fix needed a clinical judgement, I did
not decide it; it is listed in `NEEDS_REVIEW.md`.

---

## 1. Numbers

| | Before the audit | After |
|---|---|---|
| Unit tests | 1,313 | **1,387**, 0 failing |
| Stress harnesses (Node + browser) | 9 | 9: attack 46, privacy 43, crypto 24, clinical 47, pollution 16, sync 18, xss **48**, output 26, redflag-screen 44. All held |
| Real-browser end-to-end journeys | 3 | **8**: patient 29, competency 35, student 13, accessibility (0 unlabelled / 0 unreachable), **dropdowns 8, legacy-records 10, clinician-decision 11, handlers 2 (2,082 click handlers)**. All held |
| Knowledge-base audit (`tools/audit.js`) | — | 0 FAIL |

New gates added by this audit: `tools/e2e/dropdowns.js`,
`tools/e2e/legacy-records.js`, `tools/e2e/clinician-decision.js`,
`tools/e2e/handlers.js`; and in the unit tests,
`tests/engine-input-integrity.test.js`, `tests/complaint-parser.test.js`,
`tests/investigations.test.js`, `tests/certificates.test.js` and
`tests/practice-clear.test.js`.

---

## 2. What was wrong, by how much it mattered

### Could mislead a clinical decision
1. **The engine misread recorded values.** A zero (Van Herick 0, TBUT 0,
   Schirmer 0) was read as "not measured", and a blank eye as zero. Negations
   were ignored: "no thinning" was read as thinning, "no edema" as disc edema.
   Word fragments matched: "keyboard" was read as distance blur, "welder's
   flash" as flashes. **Result:** 21 false symptoms in 38 ordinary
   complaints; now 0 of 38, and 0 of 30 phrases held back from tuning.
2. **One wrongly typed field could empty the red-flag box.** 130 of 3,668
   fuzzed runs crashed before the safety stage. Now every field is read
   through a safe view and each stage is isolated. If the red-flag stage
   itself fails, an **urgent** banner appears instead of an empty box.
3. **A family history of diabetes was read as the patient's diabetes.**
4. **Typing an age doubled the engine's confidence** in a one-finding guess.
5. **The paperwork showed the engine's guess as the diagnosis.** There was
   no place to record the clinician's own diagnosis, the printed prescription
   ignored the final prescription, and the referral letter sent the engine's
   top 3 as the "Provisional Assessment". Now there is a Clinician's diagnosis
   field, the final prescription prints, and the engine's list is labelled
   advisory.
6. **The contact-lens certificate printed spectacle powers as the lens power.**
   The prescription certificate also left out prism.
7. **A certificate draft followed you to the next patient.** Patient B's
   certificate step could print patient A's certificate.
8. **Seven dropdowns showed the wrong value after you chose.** For example,
   nystagmus reverted to "None", so a later reader would believe it.

### Could lose or corrupt records
9. **Visits saved by an older version could not be examined.** Every step
   crashed behind the safety net.
10. **Backup restore reported success after failing**, and could leave the
    backup's patients sitting beside the device's own old visits.
11. **Investigation orders did not stay put.** A cancel was undone by the next
    autosave. Results and sign-offs were rolled back by an open exam. **No
    order change ever synced**, so the technician's results never reached the
    ordering clinician's device. An upload erased results typed while it ran.
12. **"Clear practice exams" did not reach other devices**, so the records
    came back on the next sync.
13. **A save for a patient deleted elsewhere said "saved".**

### Security and privacy
14. **Code could run from record text** in the report, drawings, ids, the
    simulation answer list, and attachment links and thumbnails. The sources
    were restored backups, synced records and shared conditions.
15. **CSV exports could carry live spreadsheet formulas** that leak
    neighbouring rows.
16. **The voice feature sent the patient's own words**, including names and
    phone numbers, to the AI service. It also replaced the patient's words
    with the AI's "medical" rewording, which the engine then read as evidence.
17. **The patient-delete snapshot was unencrypted** even with the vault on.

### Things that simply did not work
18. **249 age-bracket buttons** on the admin screen, the sidebar group toggle,
    the Course selector's "Variable" and "Stable", recording keratic
    precipitates, and the low-vision certificate's blank lines.
19. **Teaching:** OSCE assignments ignored their topic, free practice was
    credited to old assignments, and work showed as overdue on its due day.

---

## 3. What I deliberately did NOT change (your decision)

All are in `NEEDS_REVIEW.md`:

- **How history boxes map to engine evidence.** Examples: generic family
  history, recurrent episodes, amblyopia treated as suppression.
- **Exclusion rules match condition names by fragment.** Allergic
  conjunctivitis at ≥0.5 removes all 10 non-urgent keratitis entries and all
  14 uveitis entries.
- **A "Keratitis" safety gate names a condition that does not exist.**
- **Blue-light filter wording.** The eye-strain claim was removed, citing the
  Cochrane review (Singh et al. 2023).
- **There is no button to delete a patient** (an erasure-request question).
- **Investigation orders changed on two devices at once** are kept as a
  conflict, not merged. The architecture fix is described.
- **Practice records sync to the cloud.** Should they?

---

## 4. Design changes (see `ARCHITECTURE.md` §4.1, §6.1, §6.2)

- `js/engine-inputs.js` is the single input boundary for the engine: safe,
  template-shaped views of the visit and patient, plus measurement readers
  that never treat 0 as "not measured".
- Engine stages are isolated. Failures are reported as system red flags
  (`engine_differential_failed`, `engine_redflags_failed`), never shown as an
  empty result.
- `V.final_dx` holds the clinician's diagnosis, and every document leads with
  it.
- `visitUpgradeShape()` brings old visits up to the current shape additively
  and never discards data.
- Patient `orders` and `attachments` are written to the stored record
  directly, stamped so sync sends them. `doSave()` no longer overwrites them.
- Every write reports whether it worked. Bulk operations are all-or-nothing,
  and delete notices go to other devices only after the local delete succeeds.
- Values read back from records are untrusted: null-prototype maps,
  `escAttrJs` for handlers, `optionsHtml` for dropdowns, and validated file
  URLs.

---

## 5. Honest limits

- The **394 conditions are still unverified clinical content.** This audit
  checked the wiring and did not change the medicine.
- The browser checks run in Chromium. Safari and Firefox were not tested in
  this pass.
- **14 source files have no direct unit test** (audit warning). They are
  covered by the browser journeys but not unit-tested one by one.
- The **admin sign-in is still the published default** until you change it:
  `entopic-admin` / `Entopic-Admin-2026`. Please change it (sign in as admin → **Admin** tab → "Change admin password")
  before any real use.
