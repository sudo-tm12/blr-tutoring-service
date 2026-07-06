# BLR Tutoring — Product Requirements Document

**Version:** 1.0
**Owner:** Takalani Mugeri (Founder / Lead Tutor)
**Last updated:** 2026-06-30
**Status:** Draft — pre-launch refresh

---

## 1. Executive Summary

BLR Tutoring is a South African group-tutoring practice for Grade 10–12 learners in **Mathematics** and **Physical Sciences**, sold at a deliberately accessible **R250 / month per subject**. This document defines what the BLR website must *do* — not just look like — for it to become a real lead-generation and trust-building channel that converts website visitors into paying enrolled learners.

The site is not a brochure. It is the **front door to a paid product** that competes against private tutors charging R300–R500 per hour. Every section must earn its place by either building trust, reducing friction, or driving a clear next action.

---

## 2. Vision & Positioning

> **Vision:** A South African learner should never fail matric maths or physics because their family couldn't afford a tutor.

**Positioning statement:**
For Grade 10–12 learners and the parents who pay for them, BLR Tutoring is the **only group-tutoring service** that delivers the *consistency of a real teacher* and the *flexibility of an online course* at a price families can plan around — because we believe R250 a month shouldn't be the difference between passing matric and not.

**Differentiators (in order of conversion power):**
1. **Price transparency** — R250/month, no contracts, no upsells. Plainly stated, never hidden.
2. **One tutor, every week** — not a rotating cast of contractors. Takalani is the product.
3. **Group classes (not 1-on-1)** — explicit choice; it's why the price works.
4. **WhatsApp-native** — enrollment, support, and homework help all live in WhatsApp. This is where the SA market actually lives.
5. **Hybrid** — live online weekly, in-person Saturday clinics in Sun Valley.

---

## 3. The Problem We're Solving

### For the parent (the buyer)
- Private tutors are R300–R500/hour. A struggling matric learner needs 4–8 hours/month. That's R1,200–R4,000/month per subject, per learner.
- Online tutoring apps (e.g., GotIt, etc.) feel impersonal — kids stop logging in after week 3.
- Group tutoring at the local "extra lessons" room is unreliable: tutors change, schedules slip, no accountability.

### For the learner (the user)
- The CAPS curriculum is dense. Falling behind in Term 1 is fatal by Term 3.
- WhatsApp is the only platform they actually check.
- They want to ask "stupid questions" without being judged — which is hard in school, even harder in a 1-on-1 with a stranger, and easiest in a group of peers.

### For BLR (the business)
- A 30-student practice at R250/month = R7,500/month per subject = ~R15,000/month gross at full capacity. **The website is the only growth lever.** Word-of-mouth caps at ~10–15 students.

---

## 4. Target Users

### Persona 1 — Thandi, the matric mom (PRIMARY BUYER)
- **Age:** 38–52
- **Location:** Sun Valley, broader Pretoria/Gauteng, plus other SA provinces
- **Device:** Android phone, 4G data, often capped
- **Income:** R8k–R25k/month household
- **Job to be done:** "Find a maths/physics tutor my child will actually attend, that doesn't break my budget, and that I can trust without meeting in person first."
- **Trust signals she needs:** Real photos of the tutor. Real reviews from real names. A physical address. A South African phone number she can call. Banking details so she can pay.
- **Anti-signals:** Stock photos. American/UK testimonials. Hidden pricing. Long sign-up forms. Anything that feels foreign or expensive.
- **Where she finds us:** WhatsApp share from a friend, a TikTok of Takalani teaching, a Google search for "matric maths tutor near me."

### Persona 2 — Lerato, the Grade 11 learner (USER)
- **Age:** 16–18
- **Device:** Same Android phone as mom (often shared)
- **Job to be done:** "Pass term 3 maths so my mom doesn't take my phone."
- **What converts her:** Other learners who look like her saying it worked. Seeing a real classroom. The TikTok proof. A timetable she can imagine herself in.
- **What loses her:** Anything that feels like a school website. PDF brochures. Anything that asks for a parent's signature *before* she sees the value.

### Persona 3 — Sipho, the matric repeat (SECONDARY)
- 19–21 year old who failed matric maths the first time
- Working part-time, paying for himself
- Cares most about price and exam-strategy specifically (he's done the theory)
- Will convert on the Matric Final Sprint product

---

## 5. Goals & Success Metrics

### North-star metric
**Monthly new enrolments via the website** (target: 8/month within 90 days of launch, growing to 20/month within 12 months).

### Funnel metrics
| Stage              | Definition                                              | Target  |
| ------------------ | ------------------------------------------------------- | ------- |
| Reach              | Unique monthly visitors                                  | 1,500   |
| Engagement         | Avg. time on page >60s                                   | 40%     |
| Intent             | WhatsApp button click OR enrol button click              | 12%     |
| Lead               | WhatsApp message received with course interest           | 8%      |
| Enrolment          | Paid R250 first month                                    | 60% of leads |

### Secondary
- Bounce rate < 55% on mobile
- Mobile LCP < 2.5s on 3G fast
- Testimonial submissions: 2–4/month from real students

### Non-goals
- We are not optimizing for SEO traffic in year 1. WhatsApp shares and TikTok are the channels.
- We are not building a "platform." There is no learner portal in v1 (the existing one lives elsewhere).

---

## 6. Conversion Funnel & Page Flow

```
TikTok / WhatsApp share / Google → Hero
                                     │
              ┌──────────────────────┼───────────────────────┐
              │                      │                       │
          Scroll                Click "Enroll"          Click "Browse"
              │                      │                       │
              ▼                      ▼                       ▼
       Stats + Why us           WhatsApp deeplink          Courses panel
              │                  (PRIMARY CONVERSION)            │
              ▼                                                  │
        Courses (grade tabs) ────────────────────────────────────┘
              │
              ▼
        How it works (1-2-3)
              │
              ▼
        Meet the tutor (trust)
              │
              ▼
        Schedule (real week, not brochure)
              │
              ▼
        Pricing (R250, transparent)
              │
              ▼
        Testimonials (social proof + submit form)
              │
              ▼
        FAQ (objection handling)
              │
              ▼
        CTA banner ─────► WhatsApp deeplink (PRIMARY CONVERSION)
              │
              ▼
        Footer (banking details, address, phone numbers)
```

**The funnel is intentionally linear on mobile.** A parent scrolling on Android will hit every objection-handler in the order she'd raise them.

### Primary conversion action
**WhatsApp deeplink to +27 79 942 4883** with a pre-filled message specific to the section. This works because:
- It's the platform the buyer already has open.
- It captures the lead in the tutor's actual inbox, not a CRM no one checks.
- It's mobile-native and friction-free in SA context.

### Secondary actions
- Email link (`blrtutoringservices@gmail.com`) — for buyers who prefer text
- Phone call (`tel:` links) — for older parents
- Testimonial submission (engagement, not conversion)

---

## 7. Information Architecture

**Sections, in render order, with the *one job* each must do:**

| # | Section          | One job                                              | Primary CTA |
|---|------------------|------------------------------------------------------|-------------|
| 1 | Nav              | Get to enrol in 1 click from any scroll position    | "Enroll now" pill |
| 2 | Hero             | In 4 seconds, answer "what is this and who's it for" | "Browse courses" |
| 3 | Why us           | Defuse "is this legit?" — stats + 3 features        | None (trust) |
| 4 | Courses          | Show exactly what you'll learn at your grade        | "Enroll" → WhatsApp |
| 5 | How it works     | Defuse "is this a hassle to sign up?"               | None |
| 6 | The tutor        | Defuse "who is this person?"                        | "Book intro call" |
| 7 | Schedule         | Defuse "does this fit my week?"                     | None |
| 8 | Pricing          | Defuse "what's the catch?"                          | "Pick a course" |
| 9 | Testimonials     | Defuse "but does it actually work?" + UGC engagement | "Leave a review" |
| 10| FAQ              | Defuse remaining objections (mid-term joins, location, etc.) | None |
| 11| CTA banner       | Final ask                                            | "WhatsApp us" |
| 12| Footer           | Banking details, address, contact (the buyer needs these to pay) | None |

**Every section that doesn't do its one job gets deleted or merged.**

---

## 8. Functional Requirements

### 8.1 Global
- **Sticky nav** that stays accessible. CTA visible at all scroll positions.
- **Smooth-scroll** on anchor clicks with offset for sticky nav.
- **Scroll reveal** for sections (subtle, not gimmicky).
- **All external links** open in new tab with `rel="noopener"`.
- **Phone numbers** are `tel:` links. **Email** is `mailto:`. **WhatsApp** is `https://wa.me/27...`.

### 8.2 Hero
- Background must convey "real teaching happening here" — the whiteboard photo is non-negotiable.
- Big wordmark serves as visual anchor (currently "STUDY", suffix "BLR").
- Two CTAs only: primary (Browse) + secondary (How it works). No third option.
- "Live group classes · Grades 10–12" pill with pulse dot signals activity.

### 8.3 Courses (Subject Hubs)
- **Two hubs**: Mathematics and Physical Sciences.
- Each hub has **grade-tab switcher** (10/11/12) that swaps the topic list with no page reload.
- Each hub shows: hub icon, subject name, description, active grade topics (4 bullets), price, "Enroll" + "Full curriculum" buttons.
- Below the hubs: **three secondary programs** (Matric Final Sprint, Term Exam Clinic, Engineering Maths) as cards with their own pricing and "Enquire" CTAs.
- Enroll buttons MUST be WhatsApp deeplinks with the subject pre-filled in the message.
- Full curriculum opens a modal with grade-by-grade topic lists pulled from CAPS.

### 8.4 How it works (1-2-3)
- Three steps, equal weight, dashed connectors.
- Each step: numbered icon circle, title, one-line plain-language explanation.

### 8.5 The tutor
- One real photo of Takalani teaching (not stock).
- One quote in his actual voice.
- Credentials as short bullets, not a paragraph.
- "Book intro call" button → WhatsApp with pre-filled "Hi Takalani, I'd like to book an intro call."

### 8.6 Schedule
- Real week, real time slots. Updated each term.
- Subject colour-coded (sky = maths, rust = phys sci).
- Must be visibly current — stale schedules kill trust.

### 8.7 Pricing
- **One number**: R250/month.
- Inclusion checklist of exactly what comes with it.
- "No registration fee, no exam upcharge, no contracts" repeated in copy.
- This section is where Thandi decides. Treat it like a checkout page.

### 8.8 Testimonials
- 6 seeded reviews to render on first load. *These must be replaced with real signed reviews from real students within 30 days of launch.*
- Submission form with: name, grade, subject, star rating, message (20–400 chars).
- Submissions persist in `localStorage` for v1 (no backend yet).
- New submissions appear at the top with "New" badge.
- **NOTE:** localStorage testimonials are *per-device*. For real testimonials to display to all visitors, we need to either (a) backend this in v1.5, or (b) require email + manual approval and edit the SEED array. v1 ships as-is with that limitation documented.

### 8.9 FAQ
- 6 questions max. Each answers a real objection that came up in WhatsApp inbound conversations.
- First question expanded by default to demonstrate the pattern.

### 8.10 CTA banner + Footer
- CTA banner: large dark card with title and 2 buttons (WhatsApp + Email).
- Footer must contain **all 4** of: phone, email, physical address, Capitec banking details. These are not decoration — they are required by parents to pay.
- Social: WhatsApp (live), TikTok (live link to @teekay01_28), Facebook & Instagram (placeholder `#` until accounts created — flag for ops).

---

## 9. Non-Functional Requirements

### 9.1 Performance
- **First Contentful Paint** < 1.5s on 4G
- **Largest Contentful Paint** < 2.5s on 4G; < 4s on "Fast 3G"
- **Total Blocking Time** < 200ms
- **Page weight** < 800KB on first load (excluding fonts)
- **Hero photo** must be served as an optimized image (target < 200KB, eventually WebP)

### 9.2 Accessibility (WCAG 2.1 AA target)
- All interactive elements reachable by keyboard (Tab order makes sense).
- Star rating picker has `role="radiogroup"` and Enter/Space activates.
- All images have meaningful `alt` text.
- Colour contrast: body text ≥ 4.5:1; UI elements ≥ 3:1.
- Focus rings visible on all interactive elements.
- Modal traps focus and Escape closes.
- No content conveyed by colour alone.

### 9.3 Responsive
- Mobile-first. The site is 70%+ mobile traffic by hypothesis.
- Breakpoints: ≤ 640px (phone), 641–1024px (tablet), > 1024px (desktop).
- Touch targets ≥ 44×44px.
- No horizontal scroll at any width ≥ 320px.

### 9.4 SEO (lightweight in v1)
- `<title>` and `<meta description>` set.
- Semantic headings (one `<h1>`, sequential heading hierarchy).
- Open Graph tags for WhatsApp/Facebook share previews (TODO v1.1).
- Schema.org `LocalBusiness` + `EducationalOrganization` markup (TODO v1.1).
- Sitemap.xml + robots.txt (TODO v1.1).

### 9.5 Trust & legal
- Privacy notice (POPIA-compliant — South African law). TODO v1.1.
- Real physical address visible.
- Real phone numbers, both reachable.
- Banking details verifiable (Capitec account holder name matches business).

### 9.6 Browser support
- Last 2 major versions of Chrome, Safari, Firefox, Edge.
- Samsung Internet (significant SA market share — must test on Galaxy).
- iOS Safari 15+ (older iPads in some households).
- IE / legacy Edge: not supported.

---

## 10. Content Strategy

### Voice
- **Direct, warm, slightly Joburg.** ("Show up, screen on, pen in hand.")
- **No corporate filler.** No "synergize." No "empower learners to unlock their potential."
- **South African specifics:** Rand, CAPS, matric, SAST, Capitec, EFT — these aren't jargon, they're the buyer's mental model.

### Forbidden language
- "World-class," "premier," "industry-leading," "best-in-class," "trusted by thousands of," "transform your child's future"
- Anything that sounds like a stock photo caption
- Anything that sounds AI-generated

### What real BLR copy sounds like
> "I started BLR because R250 a month shouldn't be the difference between a kid passing matric and not."
> "Group classes mean every learner gets a real teacher — not an app."
> "Small group, screen on, pen in hand. Recordings sent after if you missed it."

Keep that voice everywhere. If a line doesn't sound like Takalani would say it in a WhatsApp message, rewrite it.

---

## 11. Out of Scope (v1)

- Learner login / dashboard (exists at `blrtutoring.co.za/courses` — separate product)
- Online payments (we use EFT — Capitec details in footer is sufficient)
- Backend testimonial moderation (v1 uses localStorage + seeded reviews)
- Multi-language (English only — SA secondary school market is primarily English-medium)
- Calendar/booking system (WhatsApp intro is the booking flow)
- Blog / content marketing (TikTok is the content engine, not the website)
- Course video previews
- Mobile app

---

## 12. Risks & Mitigations

| Risk                                                                 | Mitigation                                                       |
|----------------------------------------------------------------------|-------------------------------------------------------------------|
| Testimonials are seeded — savvy users may detect fakes               | Replace with 6+ real reviews within 30 days; mark seeded ones as such or remove |
| WhatsApp deeplink fails on desktop without WhatsApp Web              | Detect desktop, fall back to phone + email options              |
| Mobile data costs make hero photo expensive to load                  | Compress aggressively; serve WebP; lazy-load below-fold images   |
| Schedule goes stale and erodes trust                                 | Process: schedule refresh at start of each term, owned by Takalani |
| Parent searches "matric tutor pretoria" and we don't rank            | v1.1 SEO + local business schema; v2 actual SEO work             |
| Form submission has no backend — UGC is per-device                   | v1.5: add Formspree/Airtable backend; flag this in launch comms  |

---

## 13. Roadmap

### v1.0 — Launch (current target)
- All sections built per this PRD
- WhatsApp conversion working with pre-filled messages per section
- Seeded testimonials + localStorage submission
- Real tutor photo, real banking details, real phone numbers

### v1.1 — Trust + SEO pass (Week 2 post-launch)
- Real testimonials from current learners (replace seeds)
- Open Graph image and meta tags
- Schema.org LocalBusiness + EducationalOrganization
- Privacy notice page (POPIA)
- Favicon + apple-touch-icon
- Real photos for hero (a few shots of an actual class in progress)

### v1.5 — Testimonial backend (Month 2)
- Formspree or Airtable endpoint for review submissions
- Email notification to Takalani on each submission
- Manual approval flow before publishing (basic admin via Airtable view)

### v2.0 — Conversion optimization (Month 3+)
- A/B test hero copy variants
- Add a 7-day free trial CTA experiment
- Analytics: Plausible or Umami (privacy-friendly, lightweight)
- Heatmaps via Microsoft Clarity (free)
- Pixel for retargeting (if running paid social)

### v3.0 — Real platform (if/when scale demands)
- Course catalog with detail pages
- Integrated booking + payment
- Learner portal merge with existing blrtutoring.co.za
- Multi-tutor support

---

## 14. Decision Log

| Date       | Decision                                                                | Rationale                                                                                              |
|------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| 2026-06-30 | WhatsApp is the primary conversion, not a form                          | Buyer already lives there. Forms add 4–6 friction points and route to a CRM no one will check.        |
| 2026-06-30 | Group classes only at R250 — no 1-on-1 tier on website                  | Diluting the price story is worse than missing the 1-on-1 sale. Sell 1-on-1 in WhatsApp after.        |
| 2026-06-30 | Seeded testimonials in v1, real ones in v1.1                            | Empty testimonial section is worse than seeded one. Replace within 30 days is a hard ops commitment.  |
| 2026-06-30 | Two-subject hub design over 6+ small course cards                       | Cards looked thin without real per-grade photography. Hub gives every grade substance.                |
| 2026-06-30 | No login/auth on this site                                              | Already exists at `blrtutoring.co.za/courses`. Don't duplicate it; link to it from nav when ready.    |

---

## 15. Glossary

- **CAPS** — Curriculum Assessment Policy Statements (South African national curriculum)
- **Matric** — Grade 12 / National Senior Certificate exit exam
- **Gr 10/11/12** — Grades 10–12 (Further Education and Training phase in SA)
- **POPIA** — Protection of Personal Information Act (SA equivalent of GDPR)
- **SAST** — South African Standard Time (UTC+2)
- **EFT** — Electronic Funds Transfer (standard SA bank-to-bank payment)
- **Capitec** — South African digital bank, particularly common in our customer segment
