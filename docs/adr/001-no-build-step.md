# ADR-001 — No build step; the browser loads source directly

**Status:** Accepted · retrospective, in force since the first commit

## Context
Entopic is built by a practising optometrist who is not a software engineer.
A toolchain that breaks is a toolchain he cannot repair, and a build that fails
on a clinic machine is an exam that does not happen.

## Decision
`index.html` loads 97 ordered `<script>` tags. No bundler, no transpiler, no
package step. Opening the file in a browser runs the application.

## Consequences
**Good.** The app runs from a USB stick, a network share, or `file://`. There
is no version of "it works on my machine but the build is broken". Debugging is
reading the actual file that is executing. Deployment is copying a folder.

**Bad.** `<script>` order *is* dependency resolution, and nothing but a test
enforces it. There is no tree-shaking, no minification, no type checking, and no
import graph a tool can read. A mistyped `src` 404s silently — the other 96
scripts still run, the app still boots, and one module is quietly dead.
`tests/architecture.test.js` now asserts every `src` resolves and that the
load-bearing orderings hold.

**Cost of reversal:** moderate and rising. Roughly 1,200 exported globals would
need import/export wiring.

## Revisit when
A second full-time engineer joins, or the codebase passes ~60k lines, or a
dependency arrives that is only distributed as an ES module.
