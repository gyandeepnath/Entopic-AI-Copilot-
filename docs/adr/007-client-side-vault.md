# ADR-007 — Records are encrypted client-side with a clinic passphrase

**Status:** Accepted

## Context
Patient records sit in `localStorage` on a clinic machine that may be shared,
stolen, or resold. There is no server to hold a key.

## Decision
An optional record vault encrypts `patients`, `visits`, `users` and `audit` at
rest using AES-GCM-256, with the key derived from a clinic passphrase via
PBKDF2-SHA-256 (210,000 iterations). A recovery code provides a second wrapping
of the same data key. Web Crypto only, so it works on `file://`.

## Consequences
**Good.** A stolen laptop yields ciphertext. The key never leaves the device
and no server can be compelled to produce it.

**Bad, and it must be understood:**
- **A forgotten passphrase and a lost recovery code mean the records are gone.**
  There is no reset. This is a property of the design, not a bug.
- Unlocked, plaintext lives in memory, because the UI needs synchronous reads.
- The wrapped key (`vault_meta`) has to be mirrored, or a `localStorage` clear
  would leave recoverable ciphertext with an unrecoverable key.

## Revisit when
Hospital deployment requires SSO or centrally managed key escrow.
