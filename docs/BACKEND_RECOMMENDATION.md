# Entopic — Backend: the plan, the best option, and exactly what you need to do

*Written for you (non-technical) in plain language. Companion to
`BACKEND_OWNERSHIP.md` (the honest story of how a backend got wired without your
account) and `BACKEND_PHASE2.md` (the technical detail). This one is the
**decision doc**: what to use, what it costs, what you'll need as you grow, and
the short list of things only **you** can do.*

---

## The one-paragraph answer

**Use Supabase, on an account in your own name.** It gives you everything you
asked for — patient data storage, logins, multiple users, and the ability to
push knowledge-base updates to everyone — in one product, with the least setup
for a solo founder who isn't an engineer. Entopic's code is **already written
for Supabase**; the entire database is staged as two SQL files ready to load
into a project you control. Start on the **free tier** to try it, and move to
the **paid "Pro" plan (~US$25/month)** the day you start storing **real patient
data**, because that's when you need backups, uptime and (for real health data)
a signed privacy agreement. **The choice of plan and when to spend is yours** —
I won't commit your money.

Everything below explains *why* this is the right call, and the **step-by-step
you do from your side** is in the last section.

---

## What a "backend" actually does for Entopic

Right now Entopic runs **entirely on the device** — the exam, the diagnostic
engine, the knowledge base. That never changes; offline-first is sacred. A
backend adds four things *on top*, none of which the diagnosis depends on:

1. **Storage & backup** — patient records live safely in the cloud, not just in
   one browser that could be cleared or lost.
2. **Logins (identity)** — each person has a real account, so their role
   (student / clinician / faculty) and their data follow them to any device.
3. **Multi-user** — several people in the same clinic see the same patients,
   updating live; a colleague joins your clinic with a short code.
4. **Cloud updates** — when you improve the knowledge base, you **publish once**
   and every user pulls the update — no reinstalling anything.

Think of it as the filing cabinet, the reception desk (who's allowed in), and
the noticeboard — while the actual clinical thinking stays in the room, on the
device, working with or without internet.

---

## Why Supabase is the best fit (honest comparison)

I looked at the realistic options for **your** situation — a solo, non-technical
founder building a clinical SaaS who needs to move steadily without a dev team.

| Option | What it is | Fit for you |
|---|---|---|
| **Supabase** ✅ *recommended* | A managed PostgreSQL database with logins, live sync, file storage and auto-generated APIs built in. Open-source; you can leave and self-host later. | **Best.** One product covers storage + auth + multi-user + realtime + the KB-push mechanism. A real SQL database keeps your clinical data structured and portable. Generous free tier; clear paid tier. The code is already built for it. |
| **Firebase** (Google) | Similar all-in-one, but the database is "NoSQL" (document store). | Good product, but its data model fits structured medical records less naturally, its access-control rules are fiddlier to reason about for tenant isolation, and it's harder to leave (lock-in). Not worth switching for. |
| **A custom server** (you rent a machine + hire a developer to build auth, sync, backups) | Total control. | **Wrong stage.** It's months of engineering, ongoing maintenance, and a security surface *you'd* be liable for. Over-engineering for a solo founder — avoid until scale forces it. |
| **AWS / Azure / GCP raw** | The big cloud toolkits. | Powerful but low-level; you'd assemble ten services yourself. Supabase *runs on* AWS and hands you the assembled result. Skip the raw version. |

**Verdict:** Supabase. It's the shortest path to a robust backend you own, and
because it's standard PostgreSQL underneath, nothing traps you — if you ever
outgrow it, the same database moves elsewhere.

> This is a **recommendation, not a lock-in decision made for you.** If you'd
> prefer Firebase or something else, tell me and I'll re-plan — but I'd advise
> against it for the reasons above.

---

## What it costs (so *you* decide the spend)

| Plan | Price | What you get | When you're on it |
|---|---|---|---|
| **Free** | US$0 | 1 project, 500 MB database, 50k monthly active users, social + email logins. **Pauses after ~1 week of no activity.** | Fine for **trying it, demos, and development**. Not for real patients (the pause + no daily backups make it unsafe for live records). |
| **Pro** | ~US$25/month | No auto-pause, daily backups (7-day retention), 8 GB database, email support, more storage. | **The day you store real patient data.** This is the practical "we're live" tier. |
| **Team / Enterprise + HIPAA add-on** | Higher (quote-based) | A signed **BAA** (the legal agreement required to hold US patient health data), point-in-time recovery, SSO, priority support. | When you take on **US clinics / real PHI at scale**, or a partner demands compliance guarantees. |

Rough scaling picture: **$0 to learn → ~$25/month to go live → higher only when
real regulated patient data or serious volume arrives.** No surprise bills at the
start. **Deciding to spend, and when, is your call** — I'll never upgrade a paid
plan on your behalf.

---

## The one thing to take seriously before real patient data goes in

Patient data is sensitive health information. Two honest flags — both are
**your decisions** (clinical / legal / spend), and I've built the app to respect
them:

1. **Compliance (HIPAA / GDPR / local law).** If you store identifiable patient
   data in the cloud, most jurisdictions require a formal data-processing
   agreement with the provider. Supabase offers this (**BAA**) on its higher
   paid tiers — **not** on free/Pro. Until you have it, keep real PHI on-device
   or de-identified. *You decide when/whether to buy in; I won't assume it.*
2. **PII stays separated.** Entopic already keeps identifying details apart from
   the de-identified clinical/analytics data (`patients` vs `encounters`
   tables), and **never** sends patient data to any AI/LLM service. That
   separation is built in and I'll keep it that way.

You don't need to solve compliance to *start* (use the free tier with test /
de-identified data). You need it **before real patients' records go to the
cloud** — flagging it now so it's a planned step, not a surprise.

---

## What you'll need as you grow (the scaling roadmap)

Roughly in the order you'll hit them:

- **Now (free):** create your project, load the schema, test it. No cost.
- **Going live (Pro ~$25/mo):** turn on when real records arrive — you get
  backups + no auto-pause. Set yourself as the "KB editor" so only you can push
  knowledge-base updates.
- **First real clinic / multi-user:** already supported — a colleague joins your
  clinic by a **6-character code**; roles (admin / optometrist / etc.) are
  enforced by the database, not just the app.
- **Multiple clinics / a few hundred users:** Supabase handles this on Pro; add
  a nearer **region** if users are far from your database, and watch the usage
  dashboard.
- **Real regulated health data at scale:** move to a tier with a **BAA**, turn
  on point-in-time recovery, and consider SSO for institutions.
- **Later, optional:** email/SMS provider for password resets, monitoring/alerts,
  and a staging project so KB changes are tested before they reach users.

None of this is needed on day one. It's the map, so nothing catches you out.

---

## Exactly what YOU do (one-time, ~15 minutes, free to start)

You need to do these because they involve **your account and your money** —
guardrails say I must not create accounts or commit spend for you.

1. **Create the account & project.** Go to **supabase.com**, sign up, and click
   **New project**. Pick a region near your users, set a strong database
   password (save it), and wait ~2 minutes for it to provision.
2. **Copy two values.** In the project: **Settings → API**. Copy the
   **Project URL** and the **anon public** key. (The anon key is safe to put in
   the app — it's the *public* key. Never share the *service_role* key.)
3. **Load the database.** In the project's **SQL Editor**, open a new query and
   run, in order:
   - `db/migrations/001_core_schema.sql`  (paste its contents, Run)
   - `db/migrations/002_profiles_and_invites.sql`  (paste, Run)
   These create all the tables, security rules and the join-by-code function.
   *(I've tested that both apply cleanly to a brand-new project.)*
4. **Connect Entopic to it.** Open Entopic → **dashboard → Cloud card →
   Connect** → paste your **Project URL** and **anon key** → Connect. This is
   stored only on your device; nothing syncs until you do this.
5. **Prove it works.** Create an account in Entopic, create a clinic, add a test
   patient. Sign in on a **second device/browser**, join the clinic with the
   **join code**, and confirm the patient appears. That's live multi-user.
6. **Make yourself the KB publisher** (so only you can push knowledge updates):
   tell me once you're set up and I'll give you the one line to run, or I can do
   it against *your* project if you share the URL + anon key.

**What I can do once you've done steps 1–2 and shared the URL + anon key:**
apply the migrations for you, seed the current knowledge base into your project,
set you as the KB editor, and help run the two-device test. I'll only ever touch
a project **you** own and point me at.

---

## What I will not do

- I won't create a Supabase account, pick a paid plan, or spend your money.
- I won't send any patient data to a backend you don't own (the old "UniOrg"
  project is disconnected; the app ships cloud-**off**).
- I won't put real patient PHI in the cloud until you've decided the compliance
  question above.

When you're ready, do steps 1–2 and send me the Project URL + anon key, and
I'll take it from there.
