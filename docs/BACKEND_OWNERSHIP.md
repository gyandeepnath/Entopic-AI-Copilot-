# Entopic — Owning the backend (read this first)

## Straight answer to "how is Supabase integrated when I never set it up?"

Honestly: in an **earlier build session**, a Supabase project was created and
wired into the app **using the Supabase connector attached to this development
environment** — an organisation called **"UniOrg"** (free tier). **You do not
own or control that account.** Its URL and public key had been hard-coded into
`js/cloud-config.js`, so a signed-in user's data would have gone to a project on
someone else's account. That is not acceptable for a real product, and you were
right to call it out.

## What changed now (safe by default)

- **The cloud is OFF by default.** The hard-coded "UniOrg" project has been
  **removed** from the code. Entopic runs 100% offline — the exam, engine and
  knowledge base never touch the network.
- **Nothing syncs anywhere until *you* connect *your own* Supabase project.** The
  Cloud card now shows a "Connect" form (project URL + anon key). What you enter
  is stored **only on your device** (localStorage) and can be disconnected any
  time. There is no shared/default backend.
- So: no patient data has a destination unless and until you deliberately point
  it at a project you own.

## Why the backend is still "weak/fragile" — and what robust needs

The *code* (schema + client) is sound and portable, but a production-grade
backend needs decisions and setup that are **yours to make** (they cost money and
commit a provider — guardrails say I must not decide these for you):

1. **Ownership** — a Supabase (or other) account **in your name**, with billing
   you control. Free tier pauses after ~1 week idle and has small limits; a real
   clinic needs at least the paid tier for uptime, backups and support.
2. **The schema** — all of it is staged as plain SQL in `db/migrations/` and
   applies to any Supabase project in minutes (`001` core, `002` profiles +
   clinic invites). It moves to your project cleanly.
3. **Auth & tenancy** — email/password auth and Row-Level Security tenant
   isolation are already written and were verified by impersonation tests; on
   your project you'd re-run the same checks on a real network.
4. **The live multi-user path** (two people syncing in real time) has **never
   been exercised end-to-end** from this sandbox, because its network blocks the
   Supabase domain. That is the one thing only you can validate, on a normal
   network with your project.
5. **Backups, monitoring, rate limits, GDPR/HIPAA posture** — real operational
   concerns for storing patient data, and part of "robust".

## Connect your own project (one-time, ~10 minutes, free to start)

1. Create a free account at supabase.com and a new project (pick a region near
   you). Note the **Project URL** and the **anon public** key (Project Settings →
   API).
2. Apply the schema: open the project's SQL editor and run
   `db/migrations/001_*.sql` then `db/migrations/002_profiles_and_invites.sql`
   (or use the Supabase CLI). Optionally seed the KB with
   `node tools/seed-cloud-kb.js`.
3. In Entopic: dashboard → **Cloud** card → paste your URL + anon key → **Connect**.
4. Create an account, create a clinic, and test: add a patient on one device,
   sign in on a second, confirm it appears. Share the clinic **join code** so a
   colleague can join.

## What I will NOT do

I won't keep building on, or send any data to, a backend you don't own. The
"UniOrg" project is disconnected from the app. If you'd like, once you've created
your own project and shared its URL + anon key, I can apply the migrations and
seed the KB into **your** project and help you run the live two-user test.
