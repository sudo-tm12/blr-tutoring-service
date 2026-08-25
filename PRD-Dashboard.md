# BLR Tutoring — Owner Dashboard: Product Requirements Document

**Version:** 1.0
**Owner:** Takalani Mugeri (Founder / Lead Tutor)
**Last updated:** 2026-08-24
**Status:** Approved — implementation in progress
**Sister docs:** [PRD.md](PRD.md) (marketing site) · [Design.md](Design.md) · [CLAUDE.md](CLAUDE.md)

---

## 1. Executive Summary

The marketing site's job is to turn visitors into WhatsApp conversations. This document defines the second product: the **owner dashboard** — the place where BLR the business actually runs.

Today, the entire operation lives in WhatsApp threads and Takalani's head: who's enrolled, who's paid, who needs a reminder, who showed up to class, which leads are waiting. That works at 10 students. It breaks at 30. The dashboard exists so that on the 1st of every month, Takalani can see exactly who owes what, send every payment reminder in one sitting, and know the business is healthy — without opening a bank-statement spreadsheet.

The dashboard is **not** a learner portal (that already exists) and **not** a payment gateway. It is the tutor's second brain: students, money, messages, attendance, leads, reviews, reports.

---

## 2. The Problems It Solves

1. **Payment reconciliation is manual.** Parents EFT to Capitec using the learner's email as reference. Matching bank statements to students each month is slow and error-prone. → The dashboard keeps a ledger: what each learner owes per month, what's paid, what's outstanding.
2. **Reminders are ad hoc.** Nothing tracks who was reminded and who replied. → Template-based WhatsApp reminders with a message log.
3. **No attendance memory.** Absences go unnoticed until the learner quietly drops. → Attendance register with churn flags.
4. **Leads get lost.** An enquiry that doesn't convert today may still convert next term — if someone remembers to follow up. → Leads pipeline with statuses and follow-up tracking.
5. **Reviews can't be moderated.** Site testimonials live in each visitor's browser (localStorage); Takalani never sees them. → Backend moderation: submit → approve → published to the live site.
6. **No numbers.** Revenue, collection rate, retention — all guesses. → Reports with CSV export.

---

## 3. User

**One user: Takalani.** Single admin account (email + password; MFA recommended). Used on a laptop most days, on the phone in between. Multi-user (assistant, future tutors) is explicitly out of scope for v1 — the auth model can grow into roles later.

---

## 4. Goals & Success Metrics

| Metric | Target |
|---|---|
| Month-end reconciliation time | < 30 minutes (down from hours) |
| Monthly fee collection within grace period | ≥ 90% |
| Payment-reminder coverage | every unpaid family reminded ≥ once, logged |
| Testimonial moderation turnaround | < 48 h from submission |
| Churn detection | absent learner flagged within 2 sessions |

---

## 5. Principles

1. **The tutor is the bottleneck — design around him.** Every flow is optimized for speed: add a student in seconds, tap attendance, one click opens a ready-written WhatsApp message.
2. **Same design language as the site.** Reuses every design token from Design.md. No new colours.
3. **WhatsApp is the channel.** The dashboard never tries to replace WhatsApp — it makes WhatsApp faster (pre-filled, personalized messages) and keeps a memory of it (message log).
4. **No build step, no framework.** Static SPA + Supabase. Same philosophy as the marketing site.
5. **POPIA by design.** Consent flags on every learner record, export and delete built in, data minimized to what the business needs.
6. **Money truth.** Charges snapshot the price at generation time; price changes never rewrite history. The ledger must always reconcile against the bank statement.

---

## 6. Modules

### 6.1 Overview
Home screen: stat tiles (active learners, expected this month, collected, outstanding), today's sessions, overdue count, pending testimonials, churn-risk learners, recent payments, new leads. Every tile links into its module.

### 6.2 Students (CRM)
- Fields: name, grade (10/11/12/uni), subjects (maths / physics — both = R500), parent name, parent WhatsApp number, learner email (the EFT reference), status (active / paused / left), enrolled-on, notes, POPIA consents (SMS, reviews, marketing)
- Search + filter by grade / subject / status
- Fast-add: 6 fields, "auto-charge current month" default ON
- Grade rollover at year start (Gr 11 → 12; Gr 12 → graduated/left)
- Quick actions per student: record payment, WhatsApp parent, attendance

### 6.3 Payments (the fee engine)
- Monthly **charges** per student × subject, generated from settings (idempotent — "Generate month" button + auto-check on first visit of a month)
- One-off charges: Sprint R450, Engineering Maths hours, clinic (R0 for members)
- **Month register**: students × month grid; cell = status chip (Paid / Partial / Unpaid) + amount; click to record payment
- Payments: amount, date, method (EFT/cash/card/other), free-text reference (matches the bank statement — no tyranny of "the reference must be the email")
- Overdue: unpaid after grace days (default 14); aging table with per-month breakdown
- Partial payments and unallocated credits supported

### 6.4 Communications
- Template library (WhatsApp + email) with placeholders: `{parent_name}`, `{student_name}`, `{amount}`, `{months}`, `{due_date}`, `{subject}`, `{balance}`
- **Reminder flow**: pick the overdue list or any group → one card per parent with the rendered message + one "Open WhatsApp" button (wa.me link, one click at a time — no popup-blocker games) → each open is logged
- Message log: who got what, when, via which channel
- Email: one-click mailto compose (works with zero setup) + Gmail-SMTP send function once the owner creates an app password
- Future (v1.5): WhatsApp Cloud API automated sending — the template and log schema are already shaped for it

### 6.5 Attendance
- Sessions auto-created from date + slot (15:30 / 16:45 / 18:00) + subject + grade
- Register: tap-to-cycle Present / Late / Absent / Excused
- Churn flag: absent 2+ consecutive sessions → surfaces in Overview + Students

### 6.6 Leads
- Name, phone, grade, subject, source (WhatsApp / TikTok / referral / website / walk-in / other)
- Status: new → contacted → trial → enrolled → lost / closed
- Convert-to-student pre-fills the add-student form
- Follow-up tracking (last-contact date)

### 6.7 Testimonials (site sync)
- Public site form submits → pending queue in the dashboard
- Approve → appears on the live marketing site immediately (site reads approved reviews from the database; seeds remain as offline fallback)
- Reject / unpublish any review, seeds included (honours PRD §8.8: replace seeds with real reviews)

### 6.8 Reports
- Monthly revenue (collected vs outstanding), fee-register rollup, attendance rate per student/subject, lead-funnel counts
- CSV export on every list (doubles as the owner's backup habit)

### 6.9 Settings
- Business info, both WhatsApp numbers, email, banking details (single source of truth)
- Fees: monthly 250, sprint 450, engineering-maths rate 350, clinic free, grace days
- SA school term dates (for term views)
- "Generate charges for current month" button

### 6.10 POPIA
- Consent overview per student (SMS / reviews / marketing)
- Export student data (JSON bundle — right of access)
- Delete student (right to erasure; cascade + anonymized audit entry)
- Link to privacy.html

---

## 7. The Fee Engine (Data Model in One Breath)

```
student.subjects → charges (one row per subject per month, price snapshotted at generation)
payments (allocated to a charge, or unallocated credit)
status = paid ≥ amount ? Paid : paid > 0 ? Partial : Unpaid
overdue = Unpaid/Partial AND due month + 1 month grace + grace_days < today (SAST)
```

Billing is calendar-month (R250/month means the calendar month). Term dates live in settings for reporting, not for billing.

---

## 8. Data, Security & POPIA

- **Stack:** Supabase (Postgres, free tier), region `eu-central-1` (Frankfurt) — no SA region exists. Disclosed in the privacy notice.
- **Row Level Security:** every table admin-only, except testimonials: anyone may submit (forced to `pending`) and anyone may read approved reviews. The anon key shipped in the site's JS is public by design — RLS is the gate. The `service_role` key never appears in any frontend code.
- **Backups:** Supabase daily backups + the CSV-export habit (documented in `dashboard/README.md`).
- **POPIA obligations built in:** consent flags at entry, export, delete, audit trail for deletions, privacy notice covering the dashboard.

---

## 9. Out of Scope (v1)

- WhatsApp Cloud API automated sending (needs Meta business verification + a dedicated number)
- Online payments (PayFast/Yoco) — EFT tracking only
- Learner portal (exists separately)
- Multi-user roles / assistants
- Automatic month generation via cron (manual button in v1)
- SMS

---

## 10. Roadmap

- **v1 (this build):** everything in §6, shipped together
- **v1.5:** WhatsApp Cloud API, pg_cron auto-charge generation, PayFast, "new testimonial" email alert
- **v2:** multi-tutor support, roles, deeper reports

---

## 11. Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-24 | Static SPA + Supabase free tier | No build step matches the repo philosophy; managed Postgres + auth = zero server babysitting |
| 2026-08-24 | Hosted at `blrtutoring.co.za/dashboard/` (GitHub Pages subfolder) | Same repo, same Pages site — no extra DNS/hosting; hash routing avoids server rewrites |
| 2026-08-24 | WhatsApp = wa.me click-to-send in v1 | Free, zero setup, fits 30–50 students; Cloud API needs Meta verification + a dedicated number |
| 2026-08-24 | EU (Frankfurt) data region | No SA Supabase region; disclosed in the privacy notice under POPIA |
| 2026-08-24 | Email = mailto fallback + Gmail-SMTP Edge Function | mailto works day one; SMTP send requires only an app password from the owner |
| 2026-08-24 | Learner email nullable, NOT unique on students | Sibling learners often share a parent email; payments keep a free-text reference for EFT reconciliation |
