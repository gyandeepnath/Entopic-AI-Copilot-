# ADR-002 — Global scripts instead of ES modules

**Status:** Accepted · consequence of ADR-001

## Context
With no build step (ADR-001), ES modules on `file://` are blocked by CORS in
every major browser. Modules would have forced a server, which would have
forced a build and a deployment story.

## Decision
Every file declares plain `var` functions in global scope. Cross-module calls
are bare global references, usually guarded with
`typeof someFn === "function"`.

## Consequences
**Good.** Works everywhere including `file://`. Trivial to read.

**Bad.** ~1,200 exported globals in one namespace, so any file can call any
function and nothing marks a module's public surface. Name collisions are
possible and silent. The `typeof` guards (450+ of them) mean a missing module
degrades quietly rather than failing loudly — which is right for optional
features and wrong for load-bearing ones. `tests/generated-patterns.test.js`
pins the guards so they cannot mask a genuinely missing dependency.

## Revisit when
ADR-001 is revisited. These stand or fall together.
