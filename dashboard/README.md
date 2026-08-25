# BLR Tutoring — Owner Dashboard

The dashboard is where Takalani runs the business: learners, fees, payments,
WhatsApp/email reminders, attendance, leads, testimonials and POPIA. It lives
at **blrtutoring.co.za/dashboard/** (same GitHub Pages site as the marketing
page) and saves everything to a private Supabase database.

This file is the setup runbook + user guide. The product spec is
[PRD-Dashboard.md](../PRD-Dashboard.md); the engineering rules are in
[CLAUDE.md](../CLAUDE.md).

---

## 1. One-time setup (~20 min, done by the developer once)

### 1.1 Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → Sign in → **New project**.
2. Name: `blr-tutoring` · Database password: generate and store it in a
   password manager (it's the backup key to the whole database).
3. Region: **Frankfurt (eu-central-1)**. South Africa isn't offered; the EU is
   POPIA-adequate and this is disclosed in privacy.html.
4. Wait ~2 minutes for the project to provision.

### 1.2 Create the database schema

1. In the project: **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. New query → paste [`supabase/seed.sql`](supabase/seed.sql) → **Run**.
   (This loads the 6 published testimonials and the default settings/bank
   details.)

> **schema.sql is the single source of truth.** Never change tables by hand
> in the Table Editor — edit schema.sql and run the changed statements again.

### 1.3 Create the admin login (Takalani)

1. **Authentication → Users → Add user → Create new user**.
2. Email: `blrtutoringservices@gmail.com` · Password: a strong one.
3. **Exactly one** auth user is expected — the security model gives the whole
   dashboard to anyone who can log in. Do not add more accounts.

### 1.4 Auth URLs

**Authentication → URL Configuration:**

| Field | Value |
|---|---|
| Site URL | `https://blrtutoring.co.za` |
| Redirect URLs | `https://blrtutoring.co.za/dashboard` · `http://localhost:5500/dashboard` · `http://localhost:8080/dashboard` |

(Add whatever local URL you use when testing — the forgot-password link
redirects there.)

### 1.5 Connect the code

1. **Project Settings → API**: copy **Project URL** and the **anon public** key.
2. Paste them into [`js/config.js`](js/config.js) — replace `PASTE_YOUR_SUPABASE_URL`
   and `PASTE_YOUR_SUPABASE_ANON_KEY`.
3. Paste the **same two values** into `index.html` at the top of the script
   block (`const SB = { url: …, anon: … }`) so the public site can read
   approved reviews.

> **The anon key is supposed to be public.** Row-level security (already set
> up by schema.sql) limits what it can do: the public site can only *read
> approved* reviews and *insert pending* ones. **The `service_role` key must
> never appear in any frontend file** — it bypasses all security.

### 1.6 Deploy + go live

Commit and push to the same repo/branch that serves the site. The dashboard is
live at `/dashboard/` immediately — no Pages config needed. All asset paths
inside `dashboard/` are relative, so it works from a subfolder.

**Test in an incognito window:** open `/dashboard/` → log in → add a student →
Settings → "Generate charges for <this month>" → Payments shows their row.

---

## 2. Email sending (optional, ~10 min — do it once)

Until this is done, the dashboard's **Send email** buttons open a prefilled
Gmail draft (mailto) instead — reminders still work, just one extra click.

To make email send directly:

1. On the Gmail account (`blrtutoringservices@gmail.com`):
   [turn on 2-Step Verification](https://myaccount.google.com/security),
   then [create an App Password](https://myaccount.google.com/apppasswords)
   (16 characters, no spaces).
2. On your computer, with the Supabase CLI installed:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>   # from Project Settings → General
   supabase secrets set GMAIL_USER=blrtutoringservices@gmail.com
   supabase secrets set GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
   supabase functions deploy send-email
   ```
3. Test from the dashboard: Communications → any learner with an email →
   **Send email**. Send the first one to your own address and check it lands.

The function (`functions/send-email/index.ts`) validates the login token
server-side and only sends to one recipient per call — the public website
cannot use it.

---

## 3. Daily use (the tutor's routine)

| When | What | Where |
|---|---|---|
| Before class | Take the register (tap chips: present → late → absent → excused) | Attendance |
| Between classes | Reply to leads, mark them contacted | Leads |
| When someone enquires | Add the lead, then Convert → learner when they sign up | Leads |
| When EFT lands | Record the payment against the right month | Payments |
| 1st of each month | Generate charges (the dashboard does it automatically on first open) | auto / Settings |
| After the grace period | Chase overdue parents with one WhatsApp click each | Payments → Overdue → Remind |
| New review submitted | Approve or reject | Testimonials |

**Payment reminders:** Communications → pick recipients (defaults to overdue) →
each parent gets a card with a personalised message → **Open WhatsApp** opens
the chat with the message filled in → you press send in WhatsApp. Every open is
logged automatically (Communications → Message log).

**The month register** (Payments) is the reconciliation surface: one row per
learner, one column per month. Green = paid, orange = partial, plain = unpaid.
Tap a cell to record a payment or allocate a credit.

---

## 4. Monthly rhythm

1. **1st:** open the dashboard → charges for the new month auto-generate.
2. **Around the 5th–7th:** Payments → Overdue → Remind (grace period is 14
   days by default; change it in Settings).
3. **End of month:** Reports → download the **Payments CSV** and **Students
   CSV** to your computer. That's the backup — do it every month.
4. Keep banking details, fees and term dates correct in **Settings** — fees
   there drive all new charges (old charges keep their snapshot, so history
   is never rewritten).

## 5. POPIA & data

- Consent flags (SMS/reviews/marketing) live on each learner and must be
  answered truthfully before using a channel.
- A parent asks what you hold? **POPIA → Export** produces the full JSON
  bundle for that learner.
- A parent asks to be forgotten? **POPIA → Delete** removes everything and
  keeps an anonymized audit row (name, grade, money totals — no phone or
  email) so the books still balance.
- The database is hosted in Frankfurt (EU), encrypted in transit and at rest,
  single-user access. privacy.html says all of this.

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| Dashboard shows a blank screen / nothing loads from `file://` | ES modules don't run from `file://`. Serve the folder (VS Code Live Server, `python -m http.server`, or the deployed site). |
| Deep link 404s (e.g. `/dashboard/students`) | The dashboard uses hash routes — always `/dashboard/#/students`. Links inside the app already do this. |
| "No such table" / missing data | schema.sql wasn't run (or was edited in the Table Editor). Re-run it. |
| Forgot password | Login screen → "Forgot password" → email link → set a new one. |
| Email button says "not set up" | Section 2 wasn't completed yet — mailto fallback is working as designed. |
| Public site doesn't show a newly approved review | The site caches reviews for 24h. Hard-refresh won't force it — it's the cache key. |
| Someone else shouldn't have logged in | There must only be one auth user. Change the password and enable MFA (Account → Security). |

## 7. Roadmap (what's deliberately not here yet)

WhatsApp Cloud API (automatic sending without opening WhatsApp) · online
payments (PayFast) · a learner-facing portal · multiple users. See
PRD-Dashboard.md §10 for the full out-of-scope list and why.
