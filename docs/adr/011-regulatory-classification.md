# ADR-011 — Regulatory classification of the product

**Status:** **NOT MADE** — this is the point of writing it down

## Context
Entopic produces a ranked differential diagnosis and urgent-referral alerts
from patient data. In several jurisdictions that description falls within the
definition of a medical device, regardless of the "advisory only" framing
carried throughout the UI.

Relevant, and unresolved:
- **India (CDSCO):** software as a medical device is regulated; classification
  depends on intended use.
- **EU (MDR):** clinical decision support driving diagnosis is typically
  Class IIa or higher.
- **UK, US:** separate regimes, separate answers.

## Decision
**None has been taken.** The product has been built as though the advisory
framing is sufficient. That may be correct. Nobody qualified has said so.

## Consequences
Unquantified regulatory exposure. Any answer other than "not a device" implies
a quality management system (ISO 13485), a software lifecycle process
(IEC 62304), a clinical evaluation, and post-market surveillance — all of which
constrain how the software may be *built*, not merely how it is sold.
Retrofitting a lifecycle process is far more expensive than adopting one.

## Revisit when
**Before the first sale outside the founder's own practice.** This needs a
regulatory consultant in the target jurisdiction, not an engineering opinion —
and specifically not mine.
