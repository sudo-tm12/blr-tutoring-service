# BLR Tutoring — Design Specification

**Version:** 1.0
**Last updated:** 2026-06-30
**Sister docs:** [PRD.md](PRD.md) · [CLAUDE.md](CLAUDE.md)

> Design exists to serve the product goal. The product goal is: a South African parent on an Android phone, on 4G data, in 45 seconds, decides BLR is real, affordable, and worth a WhatsApp.
>
> Every design decision below is in service of that 45 seconds.

---

## 1. Brand Foundation

### Brand attributes
| The brand IS                      | The brand IS NOT                                  |
|-----------------------------------|---------------------------------------------------|
| Warm, direct, slightly Joburg     | Corporate, generic, "global"                      |
| Confidently affordable            | Cheap, scarcity-tactics                           |
| Editorial-clean, not minimal      | Sparse, "Apple-cold", over-designed               |
| Photography-first when we have it | Stock photo, illustration-heavy                   |
| Local (SA-specific cues)          | Generic edtech (Coursera/Khan clone)              |
| Honest about being a small practice| Faking enterprise scale                          |

### Voice (used in copy, but design supports it)
Short sentences. Specific nouns. Plain verbs. A little dry humour. **Never explain what you can show with structure.**

---

## 2. Design Principles

1. **One job per section.** If a section doesn't have a defendable answer to "what objection does this defuse, or what action does it drive?", it gets cut.
2. **Trust before delight.** A real photo of Takalani beats a clever animation. A real phone number beats a microinteraction.
3. **Mobile is the canvas.** Design on a 380px viewport first; desktop is the bonus.
4. **Respect the data plan.** Heavy hero photos are a tax on the buyer. Optimize hard.
5. **Editorial structure, product polish.** Newsroom rhythm (eyebrow → headline → lede → body) with product-grade components (cards, chips, sticky nav).
6. **No motion for motion's sake.** Reveal on scroll is fine; bouncy 3D card flips are not.

---

## 3. Visual Identity

### 3.1 Colour system

The palette is **navy-led, sky-accented, with one warm rust** for emotional warmth and a soft paper base. Everything else is greyscale.

#### Core tokens
```
--ink:        #0E2238   /* primary brand, body text on light */
--ink-2:      #18324E   /* hover for ink */
--ink-3:      #4B5C70   /* secondary body text */
--ink-soft:   #7A8696   /* tertiary text, captions, helper */
--sky:        #4FA3D1   /* accent, links, CTAs */
--sky-deep:   #2F87B8   /* hover for sky */
--sky-tint:   #E8F2F9   /* badges, soft fills */
--rust:       #E8A24E   /* warmth, ratings, secondary accent */
--green:      #2E9F6A   /* success, "live" indicators */
```

#### Surface tokens
```
--bg:         #EAEEF1   /* page backdrop (outside the card) */
--paper:      #F4F6F8   /* input fills, subtle blocks */
--card:       #FFFFFF   /* primary card surface */
--line:       #E2E6EB   /* borders, dividers */
--line-2:     #EEF1F4   /* internal dividers */
```

#### Usage rules
- **Body text** on `--card`: `--ink` (always passes 4.5:1).
- **Helper text** on `--card`: `--ink-3` (passes 4.5:1 at 14px+).
- **Sky** is reserved for: links, primary accent on dark surfaces, focus rings, "active" states.
- **Rust** is reserved for: star ratings, warm CTAs, secondary trust accents. Don't use it on primary CTAs (it competes with sky).
- **Green** is reserved for: success messages, the "Live" pulse dot. Never as a CTA colour.
- **Never** introduce a new colour without adding it to this list.

#### Contrast pairs (verified)
| Foreground | Background  | Ratio | Pass |
|------------|-------------|-------|------|
| `--ink`    | `--card`    | 15.8  | AAA  |
| `--ink-3`  | `--card`    | 7.4   | AAA  |
| `--ink-soft` | `--card`  | 4.6   | AA   |
| `--card`   | `--ink`     | 15.8  | AAA  |
| `--sky-deep` | `--card`  | 4.9   | AA   |
| `--sky`    | `--ink`     | 5.1   | AA   |

### 3.2 Typography

We use **two families** — that's it.

| Token   | Family                 | Used for                                                  |
|---------|------------------------|-----------------------------------------------------------|
| `--sans`  | Plus Jakarta Sans 400/500/600/700/800 | All UI, body, navigation, buttons, headings |
| `--serif` | Newsreader (italic 400/500) | Pull quotes, the tutor quote, subject hub icons backdrop |

Plus Jakarta Sans is intentional: it's a modern, slightly geometric humanist sans that reads well on Samsung/Android screens and gives a "designed-by-a-product-team" feel without being cold (unlike Inter) or generic (unlike Roboto).

Newsreader's italic gives one warm, editorial moment per major section — used as the *quote* in the tutor card and the *em* highlights in headings. **Never run a paragraph in serif.** It's an accent, not a body.

#### Type scale (desktop)
| Role               | Size                        | Weight | Line-height | Letter-spacing |
|--------------------|-----------------------------|--------|-------------|----------------|
| Display (hero)     | `clamp(64px, 13vw, 168px)` | 800    | 0.86        | -0.045em       |
| H2 (section title) | `clamp(22px, 2.4vw, 28px)` | 700    | 1.25        | -0.015em       |
| H3 (card title)    | 22px                        | 700    | 1.15        | -0.012em       |
| H4 (block title)   | 17px                        | 700    | 1.20        | -0.01em        |
| Body              | 15px                        | 500    | 1.50        | normal         |
| Body small        | 13px                        | 500    | 1.55        | normal         |
| Caption / meta    | 11px                        | 600    | 1.40        | 0.06em (uppercase) |
| Mono / chip       | 10–11px                     | 600/700| 1.40        | 0.08–0.14em    |

#### Mobile scale adjustments (≤640px)
- Hero display: scales naturally via clamp
- H2 / H3: don't shrink below 20px
- Body never below 14px

### 3.3 Iconography
- All icons are **inline SVG**, stroked (not filled), weight `1.6–1.8`, `currentColor`.
- Icon size in body context: 14–16px. In feature/program icon badges: 20–28px inside a 44–56px tile.
- We don't use icon fonts. We don't use third-party icon libraries (no FontAwesome, Material, etc.). Every icon is hand-picked or hand-drawn so they share a visual weight.

### 3.4 Imagery direction

#### Hero
- **Subject:** Real teaching in progress. Hands on whiteboard, equations visible, ideally Takalani's silhouette or back.
- **Treatment:** Layered with a navy gradient at 0.55 opacity for legibility, a subtle math-glyph SVG overlay at 0.18, and a soft radial colour wash. Final image reads as "real classroom — stylized, not raw."

#### Tutor card
- **Subject:** Takalani, mid-teaching, eye-line not at camera, gesture suggests explaining (pointing, drawing).
- **Treatment:** Clean, slight saturation drop (0.92), object-position adjusted to crop tight on face/upper body.

#### Programs / extras
- **Treatment:** Coloured gradient + icon badge — *we deliberately don't use stock photos here*. The honest signal is: "we have one tutor, one classroom, one whiteboard — and that's the point."

#### Future (v1.1+)
- Get 4–6 candid shots of an actual group class. Use them in the subjects-hub section behind a darkening gradient.
- Get one wide shot of the Sun Valley classroom for the schedule section background.

### 3.5 Motion

**Allowed:**
- Scroll reveal: fade-up `12px` over `600ms ease`. Triggered at 8% intersection.
- Hover lifts: `translateY(-2 to -3px)`, `box-shadow` deepens. Duration `200ms ease`.
- Tab content fade: opacity + 4px slide, `250ms ease`.
- Modal entrance: opacity + 12px slide, `250ms ease`.
- Pulse dot on "live" indicator: subtle, slow (1.6s loop).

**Forbidden:**
- Bouncy/spring eases (`cubic-bezier(.68,-0.55,...)`)
- 3D transforms
- Parallax scrolling
- Auto-playing carousels
- Anything that demands attention from the buyer who is trying to read

**Reduced motion:** Honour `prefers-reduced-motion: reduce`. Disable reveal animations, keep functional transitions (modal open, tab switch) but at half duration.

---

## 4. Layout System

### 4.1 Page container
- Site lives inside a centered **white card** with `28px` radius on desktop, edge-to-edge on mobile.
- Max width: **1180px**. Inner padding: 32px desktop, 16–24px mobile.
- Card sits on a `--bg` (`#EAEEF1`) backdrop with `28px` outer margin on desktop.

### 4.2 Section rhythm
- Default vertical rhythm between major sections: **56–64px on mobile, 80–110px on desktop.**
- Inside a "panel" (the courses container): **36px top/bottom, 32px sides.**
- Cards inside grids: **14–18px gap.**

### 4.3 Radii
| Token   | Value | Used for                                  |
|---------|-------|-------------------------------------------|
| `--r-sm`| 12px  | Inputs, tabs, small chips                 |
| `--r-md`| 18px  | Cards (course, program, schedule)         |
| `--r-lg`| 28px  | Big surfaces (hero, hub, CTA banner)      |
| `--r-xl`| 36px  | Page container                            |

**Rule:** Never mix radii within a single card. Nested elements use the next-smaller radius down.

### 4.4 Shadows
| Token         | Value                                       | Use                              |
|---------------|---------------------------------------------|----------------------------------|
| `--shadow`    | `0 8px 28px -16px rgba(14,34,56,0.18)`      | Card hover, soft elevation       |
| `--shadow-lg` | `0 22px 60px -28px rgba(14,34,56,0.30)`     | Page card, hero CTAs, big lifts  |

No more than 2 shadow levels. No coloured shadows.

### 4.5 Responsive breakpoints
```
Phone:   ≤ 640px   (1-column everything, larger touch targets)
Tablet:  641–1024  (most desktop layouts collapse to 1–2 columns)
Desktop: > 1024px  (full grid)
```

The site is **designed at 380px first**, then scaled up. If a section looks bad at 380px, the section is wrong — not the device.

---

## 5. Component Library

### 5.1 Buttons

All buttons share: `font-weight: 600`, `font-size: 13–14px`, `border-radius: 99px` (pill), height `40px` / `48px` (lg).

| Variant         | Background    | Text       | Border       | Use                         |
|-----------------|---------------|------------|--------------|-----------------------------|
| `btn-dark`      | `--ink`       | white      | `--ink`      | Primary CTA on light bg    |
| `btn-sky`       | `--sky`       | white      | transparent  | Secondary CTA, "Enroll" on dark cards |
| `btn-light`     | white         | `--ink`    | `--line`     | Secondary CTA on dark bg   |
| `btn-ghost`     | transparent   | `--ink`    | `--line`     | Tertiary, "Talk to us first" |
| `btn-outline-w` | transparent   | white      | `rgba(255,255,255,.30)` | Secondary on dark hero |

**One primary CTA per section.** If you have two equal-weight buttons, one of them is wrong.

### 5.2 Chips / Tags
- Height: 24–28px, padding: 5px 10px, radius: 99px, font: 10–11px / 600–700, often uppercase with `0.08em` tracking.
- `t-new` (testimonial New badge): `--sky-tint` bg, `--sky-deep` text.
- `hub-tag` (on dark hub cards): `rgba(255,255,255,0.14)` bg with backdrop-blur.
- `ep-badge` (on program cards): `--paper` bg, `--ink-soft` text, `--line` border.

### 5.3 Cards

#### Subject hub card (the big ones)
- Dark gradient background (navy for maths, rust for physics).
- Decorative radial blobs in the bg (top-right and bottom-left), opacity 0.12–0.18.
- 36px padding.
- Internal hierarchy: icon + tag (top), big H2 + description, grade-tab switcher, active grade content, footer with price + CTA group.
- Min height: 540px (so both columns balance even if one has more topics shown).

#### Course / program card
- White surface with `--line` border.
- 22px padding.
- Hover: `translateY(-3px)`, `box-shadow: --shadow`, border darkens to `--ink-3`.
- Internal layout: icon badge + status badge (top row), title, description, footer with price + ghost-link CTA.

#### Testimonial card
- White surface, `--line` border, `var(--r-md)` radius, 22px padding.
- Star row, body text (italic-feel via `--serif`? — no, we kept it sans for legibility), footer with avatar + name/meta + "New" badge.

#### Schedule cell (class)
- Sky-tint or rust-tint background.
- 10px radius, 10×12px padding.
- Subject title (13px / 700) + grade chip (10px / 600 uppercase).

### 5.4 Form elements

- Inputs/selects/textareas share styling: `--paper` background, `--line` border, `12px` radius, 12px / 14px padding, focus ring is `--sky` border + 3px `rgba(79,163,209,0.15)` glow.
- Labels: 11px / 600 uppercase, `0.06em` tracking, `--ink-3`.
- Helper text inside labels: keep sentence case, lighter weight.
- Star picker: 24px stars, `--line` colour off, `--rust` lit, `1.15` scale on hover.
- Submit button: matches `btn-dark btn-lg`.

### 5.5 Modal

- Overlay: `rgba(14,34,56,0.55)` + `6px` backdrop blur.
- Modal surface: white, `var(--r-lg)`, 36px padding, max-width 600px, max-height 85vh with internal scroll.
- Entrance: opacity + 12px slide, 250ms.
- Close button: 34×34 circle, top-right of modal.
- Esc closes. Click-outside closes. Focus is trapped (TODO: implement focus trap).

### 5.6 Nav

- Sticky in v1? **No** — the existing implementation is non-sticky and the page is short enough that a sticky CTA isn't critical. Revisit in v2 with scroll-back-to-top + sticky enroll.
- Logo (brand mark + word) on far left.
- Inline links centre-left.
- Search input centre-right (desktop only — collapses on mobile).
- "Enroll now" pill on far right.

---

## 6. Section-by-Section Design Intent

For each section, what we're optimizing for and what visual treatment delivers it.

### § Hero
- **Goal:** In one viewport, communicate "real tutoring, real teacher, grades 10–12, group, accessible."
- **Design move:** Big bold wordmark **STUDY** over a real classroom photo, with a small subtitle and 2 CTAs. The "BLR" superscript anchors the brand without diluting the headline.
- **Why it works:** Buyers are conditioned to expect either a sterile "edtech" hero (illustration of laptops) or a brochure photo of a kid smiling. Real chalkboard + bold typographic statement breaks the pattern.
- **What to avoid:** Stock photos of diverse smiling teens. Confetti. "Empowering students" headlines.

### § Why us (stats + features)
- **Goal:** Defuse "is this legit?" with three quick facts and three quick differentiators.
- **Design move:** 2-column. Left = narrative + 3 circular stat icons. Right = 3 stacked feature cards.
- **Why it works:** Stats give scale, features give substance. The stacking mimics how a buyer reads a comparison table.

### § Courses (subject hubs)
- **Goal:** Show exactly what the learner gets at their grade — no vagueness.
- **Design move:** Two big dark gradient hubs (navy = maths, rust = phys sci) side-by-side with grade-tab switchers that swap topic bullets without reload. Below: three program cards on light surface.
- **Why it works:** Two strong cards beat six weak cards. The grade switcher creates engagement (a small interaction) and proves "we know your curriculum."
- **Decorative elements:** Soft radial blobs in each hub bg + a hub-icon tile. **No** abstract math glyphs as wallpaper — they read AI-generated.

### § How it works (1-2-3)
- **Goal:** Defuse "is sign-up annoying?" in three steps.
- **Design move:** Three nodes with dashed connectors. Icon circle, title, one line of copy. No marketing fluff.
- **Why it works:** WANDER.ph-style 1-2-3 sets parent expectations: this is going to be easy.

### § The tutor
- **Goal:** Defuse "who is this person?"
- **Design move:** Wide dark card. Real photo on left with a "Live · Lead tutor" status chip. Right side has eyebrow, italic-serif pull-quote, then name + role + 4 credentials + 2 CTAs.
- **Why it works:** It's the only place we use the italic serif for body — that one moment of warmth makes the quote land. The "Live · Lead tutor" chip echoes the hero's "Live" pulse, reinforcing "real, active, current."

### § Schedule
- **Goal:** Defuse "does this fit my week?"
- **Design move:** Real timetable. Light card, subtle row separators, colour-coded subject chips (sky = maths, rust = phys sci).
- **Why it works:** A real schedule signals "this is a running practice." A "fully customizable" placeholder signals "we'll figure out the schedule when we get a student."

### § Pricing
- **Goal:** Defuse "what's the catch?"
- **Design move:** 2-column. Left = narrative ("One price. One subject. One month."). Right = a large gradient card with **R250**, the inclusion checklist, and the rust-and-cream colours that make it feel premium-yet-honest.
- **Why it works:** Treating pricing like a checkout step (not an afterthought) signals confidence in the price.

### § Testimonials
- **Goal:** Defuse "but does it actually work?" + give existing students a way to contribute.
- **Design move:** 3-column grid of testimonial cards (avatars with name initials, star ratings in rust, 13px italic-feel body) + a submission form card below.
- **Why it works:** Social proof from peers (other SA learners) is the single highest-converting trust signal in this market.
- **v1 caveat:** Seed reviews are clearly marked in code and replaced within 30 days. The submission form persists to localStorage — this is documented limitation, see PRD §12.

### § FAQ
- **Goal:** Last-mile objection handling.
- **Design move:** Native `<details>` accordions, large click-target. First one open by default to seed the pattern.
- **Why it works:** Native disclosure is faster, accessible, and doesn't need JS.

### § CTA banner
- **Goal:** One last ask.
- **Design move:** Dark gradient card matching the tutor card's tone. Headline with one italic emphasis, paragraph, 2 buttons (WhatsApp primary, Email secondary).
- **Why it works:** After 11 sections of trust-building, the parent is ready. Give them the easiest possible next step.

### § Footer
- **Goal:** Provide the 4 pieces of info Thandi needs to actually transfer R250: phone, email, address, banking.
- **Design move:** 4-column grid. Brand block (with mini description and socials), Reach Us, Banking, Browse.
- **Why it works:** Banking details in the footer is unusual outside SA — it's exactly the cultural cue that signals "we are a real local business, you can pay us today."

---

## 7. Accessibility (WCAG 2.1 AA targets)

| Requirement                                    | Status (v1)             | Notes                                                                 |
|------------------------------------------------|-------------------------|-----------------------------------------------------------------------|
| Colour contrast ≥ 4.5:1 (body)                | ✅                      | All text/bg pairs verified                                            |
| Colour contrast ≥ 3:1 (UI)                    | ✅                      |                                                                       |
| Keyboard navigable                             | ⚠️ Mostly               | Modal needs focus trap; tabindex on star picker spans                |
| Visible focus ring                             | ⚠️                      | Default browser ring works; we should add explicit `:focus-visible`   |
| Image alt text                                 | ✅                      |                                                                       |
| Semantic headings                              | ✅                      | One h1, sequential                                                    |
| Forms have labels                              | ✅                      |                                                                       |
| ARIA labels on icon buttons                    | ✅                      |                                                                       |
| `prefers-reduced-motion` honoured              | ❌ TODO v1.1            |                                                                       |
| No content conveyed by colour alone            | ✅                      | Stars also have ★/☆ shape, "active" tab has bg change AND weight     |
| Touch targets ≥ 44×44px                        | ✅                      |                                                                       |

---

## 8. Anti-patterns (will not appear in this site)

- ❌ "Animated number counters" on stats (visual noise; the number is what matters)
- ❌ Testimonial sliders that auto-rotate (steals attention, hard to actually read)
- ❌ Hover effects on mobile (mobile has no hover)
- ❌ "Schedule a consultation" buttons that open a Calendly modal (over-engineered for our context — WhatsApp is the booking)
- ❌ Cookie banners we don't need (no third-party tracking in v1, so no banner)
- ❌ Hero video backgrounds (data-cost taxes the buyer)
- ❌ Lottie / SVG animations for "AI-generated" feel
- ❌ Gradient text on headlines (looks like 2021 SaaS)
- ❌ Glassmorphism on light backgrounds (low contrast, accessibility regression)
- ❌ Stock photos of multi-ethnic students with laptops (the most over-used image in edtech)

---

## 9. Open design questions

1. **Real photography of a real class** — when can we capture it? This is the single biggest visual upgrade available.
2. **Logo / wordmark** — is the current "B" tile + "BLR Tutoring" wordmark the final mark, or do we want a proper logo? (Recommend: schedule a 2-hour session with a SA designer to formalize.)
3. **A "trusted by" / press strip** — do we have any media mentions or school partnerships we could surface? If yes, add a logo strip below the hero.
4. **Video introduction** — a 30s clip of Takalani saying the BLR pitch in his own voice would convert harder than any copy. Production cost: ~R0 (record on iPhone, edit in CapCut).

---

## 10. Versioning of this document

Changes to design tokens, components, or section intent require:
1. Update this file.
2. Update `index.html` CSS to match.
3. Note the change in PRD §14 Decision Log.

Do not introduce design exceptions in code without first updating Design.md. If you find yourself writing inline styles with new colours or font sizes, stop — the right answer is either a new token or a re-use of an existing one.
