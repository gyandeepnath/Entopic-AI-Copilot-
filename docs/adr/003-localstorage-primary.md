# ADR-003 — `localStorage` is the primary record store

**Status:** Accepted, **under strain**

## Context
An offline-first app needs synchronous local persistence. `localStorage` is
universally available, synchronous, and needs no schema.

## Decision
Patient records, visits, users, the audit trail and everything else live in
`localStorage` under an `entopic_` prefix, serialised as JSON. IndexedDB is
used only as a redundancy mirror, never as the primary.

## Consequences
**Good.** Reads are synchronous, so the whole UI can stay synchronous. No
migration machinery. Works on `file://`.

**Bad, and this is the strain:**
- **A hard ceiling.** Measured at ~9 MB — roughly 3,000 patients or 9,000
  visits. Past that the clinic stops saving.
- **Every write is read-modify-write of an entire array.** Two tabs writing the
  same visit will lose one, which is why conflict detection exists.
- **It is cleared by "clear browsing data".** The whole clinic, gone, with no
  warning. This is what the IndexedDB mirror exists to survive.
- Synchronous reads are the reason the codebase cannot easily become async
  later — the assumption is load-bearing throughout.

## Revisit when
Any clinic approaches 2,000 patients, or multi-device editing becomes real.
Top-100 item 6 (async record store, IndexedDB primary) is the planned successor
at ~200 hours.
