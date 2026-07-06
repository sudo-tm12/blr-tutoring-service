# CLAUDE.md — BLR Tutoring repo guide

This file tells Claude (and any human contributor) how to make changes to this project without breaking the design system or the product intent.

**Read first:** [PRD.md](PRD.md) (what we're building & why) → [Design.md](Design.md) (the visual rules).

---

## 1. What this repo is

A **single-page marketing website** for BLR Tutoring, a South African Grade 10–12 maths and physical science tutoring service. The site's job is to convert WhatsApp-first South African parents into paying enrolled learners.

- **Stack:** Single static `index.html` file. Zero build step. Zero npm. Zero framework.
- **JS:** Vanilla, embedded `<script>` at end of file. No bundler.
- **CSS:** Embedded `<style>` at top of file, organized in commented sections.
- **Images:** Live in `assets/` (canonical) and `uploads/` (raw photos, some used, some reference only).
- **Deployment:** Static hosting. Open `index.html` directly or serve via any HTTP server.

This is deliberate. The site is short, the audience is on poor data, and a build step would mean nothing for the user experience while adding a maintenance burden.

---

## 2. File map

```
Blr tutoring service/
├── index.html          ← The site. All HTML, CSS, JS lives here.
├── BLR Tutoring.html   ← Redirect stub (meta-refresh → index.html).
├── privacy.html        ← POPIA privacy notice page.
├── PRD.md              ← Product requirements (read for "why").
├── Design.md           ← Design spec (read for "how it should look").
├── CLAUDE.md           ← This file.
├── sitemap.xml         ← XML sitemap for search engines.
├── robots.txt          ← Crawl rules for search engines.
├── assets/
│   ├── hero-classroom.png   ← Canonical hero photo
│   └── takalani-tutor.png   ← Canonical tutor photo
├── uploads/
│   ├── pasted-1779097568197-0.png   ← Old hero photo (keep as fallback)
│   └── WhatsApp Image 2026-05-16…   ← Reference screenshots, NOT photos
├── scraps/
│   └── sketch-2026-05-16T18-09-04-l6efmi.napkin   ← Old design sketch
└── .git/
```

**Important:** Most of the files in `uploads/` are *screenshots of the existing live site*, not photographs. Don't reference them as classroom imagery in code. The only real photos are `assets/hero-classroom.png` and `assets/takalani-tutor.png`.

---

## 3. How `index.html` is organized

Top to bottom:

```
<head>
  meta tags + Google Fonts
  <style>
    :root { /* design tokens — see Design.md §3 */ }
    /* Then sections in this order: */
    /* Shell · Nav · Hero · Why · Panel/Courses · Subjects-hub · Programs · Booking · Schedule · Pricing · Tutor card · Testimonials · FAQ · CTA banner · Footer · Modals · Reveal · Responsive */
  </style>
</head>
<body>
  <div class="page">
    <header class="nav">…</header>
    <section class="hero" id="home">…</section>
    <section class="why">…</section>
    <section class="panel" id="courses">…</section>
    <section class="booking" id="how">…</section>
    <section class="tutor-card" id="tutor">…</section>
    <section class="sched-wrap" id="schedule">…</section>
    <section class="pricing-wrap" id="pricing">…</section>
    <section class="testimonials" id="testimonials">…</section>
    <section class="faq-wrap" id="faq">…</section>
    <section class="cta-banner" id="contact">…</section>
    <footer class="footer">…</footer>
  </div>
  <div class="modal-overlay" id="math-modal">…</div>
  <div class="modal-overlay" id="phys-modal">…</div>
  <script>
    // Scroll reveal · Smooth scroll · Modals · Search filter
    // · Testimonials render + form + star picker
    // · Active nav on scroll · Grade tab switching
  </script>
</body>
```

Section IDs (`#home`, `#courses`, etc.) are referenced by the nav and by smooth-scroll links. Don't rename them without updating nav + every anchor that points at them.

---

## 4. Design tokens (single source of truth)

All colours, fonts, radii, shadows are CSS custom properties declared in `:root` at the top of the `<style>` block. They mirror the tokens in [Design.md §3](Design.md). **Never hardcode a colour in a component rule.** If a token doesn't exist for what you need, the right move is to ask whether the design genuinely needs a new token — and if it does, add it to `:root` AND `Design.md` in the same commit.

---

## 5. Conventions

### 5.1 Class naming
Plain, hyphenated, no methodology dogma (not BEM, not utility-first). Names describe the role:
- `hero-title`, not `h1__main`
- `t-card` (testimonial card), `ep-icon` (extra-program icon)
- Variants as second class: `btn btn-dark`, `subject-hub math`, `ep-icon clinic`

### 5.2 IDs
Used only for: section anchors (`#courses`), form fields (`tf-name`), and modal targets (`math-modal`). Not used for styling.

### 5.3 HTML order
Per section: heading → lede → content → CTA. Mirrors how the eye scans the rendered page.

### 5.4 CSS section headers
Use this comment pattern to keep navigation easy:
```css
/* ===== Section Name ===== */
```

### 5.5 JS
- No frameworks, no jQuery.
- IIFE not required — the script block runs once at end of body.
- Use `const`/`let`, arrow functions, modern DOM APIs (`querySelectorAll`, `IntersectionObserver`, `addEventListener`).
- Function names: `camelCase` and verb-first (`renderTestimonials`, `openModal`).
- Don't introduce a build step.

### 5.6 No new dependencies
- No npm packages, no CDN libraries except the existing Google Fonts.
- If you find yourself wanting a library, the answer is almost always "write the 30 lines yourself."

---

## 6. Common tasks

### Add a new testimonial seed
Find the `SEED` array in the `<script>` block. Add an object with `{ name, grade, subject, rating, text, seed:true }`. Seeded testimonials show *without* a "New" badge. Real submissions get `seed:false`.

### Update the schedule
Find `<section class="sched-wrap" id="schedule">`. Each `.sched-row` is a time slot; each `.sched-cell` is a day. Empty `.sched-cell` for a gap. Add `.phys` class to `.sched-class` for physics colour.

### Update prices
Search for `R250` to find every instance. Hero, course hubs, pricing card, programs. If we change the price, search-and-replace all of them and verify against PRD §1 (the R250 number is core positioning).

### Update WhatsApp / contact numbers
Search for `27799424883`. It appears in the nav button, course enroll buttons, social icons, footer, and CTA banner. **Update all of them.** Also check `27784742802` (second phone).

### Add a new grade-tab subject
Inside the `.subject-hub` card, the `.grade-tabs` row controls which `.grade-content` block is visible. Each `.grade-tab` has a `data-g` attribute (`10`, `11`, `12`). Each `.grade-content` has a matching `data-g`. The JS in the footer handles the switch — *if missing, add this snippet:*

```js
document.querySelectorAll('.grade-tabs').forEach(tabRow => {
  const hub = tabRow.dataset.hub;
  tabRow.querySelectorAll('.grade-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabRow.querySelectorAll('.grade-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll(`.grade-content[data-hub="${hub}"]`).forEach(c => {
        c.classList.toggle('active', c.dataset.g === tab.dataset.g);
      });
    });
  });
});
```

**Check:** as of this writing, the grade-tab JS may not be wired up. Verify by clicking the Gr 11/12 tabs in the courses section — if topics don't change, paste the snippet above into the script block.

### Add a new FAQ item
Inside `<div class="faq-list">`, add `<details><summary>Q?<span class="plus"></span></summary><p class="ans">A.</p></details>`. The `.plus` element is the +/× toggle, styled by CSS — don't omit it.

### Add a new section
1. Open Design.md §6 — does this section have a defendable "one job"? If not, don't add it.
2. Pick a section-level class name (e.g., `.partners-wrap`).
3. Use existing tokens: `--ink`, `--card`, `--r-md`, etc.
4. Mirror an existing section's heading pattern (header row with `h3` + descriptor `<p>`).
5. Add to nav if it's worth navigating to.
6. Add to footer "Browse" column if it's evergreen.
7. Update PRD §7 IA table.

---

## 7. Things that break in surprising ways

| Thing                                       | Why it breaks                                          | How to avoid                                                              |
|---------------------------------------------|--------------------------------------------------------|---------------------------------------------------------------------------|
| Hero photo URL                              | Relative path is `assets/hero-classroom.png` | Don't move that file. If you must rename it, update the CSS in `.hero-photo .photo-bg::after`. |
| Smooth scroll anchors                       | Hard-coded section IDs                                 | When changing a section's `id`, also update the nav `<a href="#…">` and any in-page anchors. |
| Testimonial localStorage                    | Per-device only — submissions don't sync               | Documented in PRD §12. Don't claim it's a "review board" — it isn't yet.   |
| `<details>` inside `.faq summary` markup    | The `.plus` toggle styling depends on exact class      | Always include `<span class="plus"></span>` inside `<summary>`.            |
| Modal Escape key                            | Listens at document level; if another listener stops propagation, modals won't close | Don't add document-level keydown handlers that `stopPropagation()`. |
| Mobile nav links                            | Hidden via `display: none` at ≤ 1024px                 | We need a hamburger eventually. For now, the footer is the mobile nav. Don't gate critical info behind nav links only. |

---

## 8. Performance budget (do not exceed)

| Resource                | Budget               | Current (approx) | Notes                              |
|-------------------------|----------------------|------------------|------------------------------------|
| HTML (gzipped)          | 25 KB                | ~18 KB           | Inline CSS/JS counts here          |
| Inline CSS              | 35 KB raw            | ~30 KB           |                                    |
| Inline JS               | 8 KB raw             | ~5 KB            |                                    |
| Hero photo              | 200 KB               | ~160 KB (PNG — should be WebP) | TODO: convert to WebP via Squoosh |
| Tutor photo             | 200 KB               | ~630 KB (PNG — should be WebP) | TODO: convert to WebP via Squoosh |
| Google Fonts (display=swap) | 1 stylesheet + 2 families | ✅           | Plus Jakarta + Newsreader only     |
| Third-party scripts     | 0                    | 0                | Keep at zero in v1                 |

If you add an image, **optimize it before committing.** Use TinyPNG or Squoosh. Aim for < 80 KB per image where possible.

---

## 9. Accessibility checklist for every change

- [ ] Does this introduce text that fails 4.5:1 against its background?
- [ ] Is every new interactive element keyboard-focusable?
- [ ] Are new icons either decorative (`aria-hidden`) or labeled (`aria-label`)?
- [ ] Do new images have meaningful `alt` text?
- [ ] Does the change keep heading hierarchy sequential (no h2 → h4 jumps)?
- [ ] Touch targets ≥ 44 × 44 px on mobile?

---

## 10. Conventions for AI-assisted edits

If you're Claude reading this to make a change:

1. **Read PRD.md and Design.md before touching the file.** Skim, don't memorize. The docs are short on purpose.
2. **Prefer `Edit` over `Write`** for surgical changes. Use `Write` only for new files or full rewrites that the user has explicitly asked for.
3. **Never invent a new colour, font, or radius.** If you think you need one, surface that as a question to the user with a recommendation; don't silently introduce it.
4. **Never use stock photo URLs** (unsplash.com, picsum, etc.) in production code. Use what's in `assets/` and `uploads/`, or use illustrated/gradient treatments.
5. **Never replace working content with placeholder.** If you don't know what should go in a section, ask. Lorem ipsum is a sin in a marketing site.
6. **Preserve real business data exactly.** Phone numbers, banking, address — do not rewrite, summarize, or "clean up." If they're wrong, the *owner* fixes them, not you.
7. **The voice rules in PRD §10 are not suggestions.** No "world-class," no "premier," no "empower." If you find yourself writing that, stop and read a real testimonial for tone reference.
8. **Test mobile in your head.** When you write a `grid-template-columns: repeat(4, 1fr)`, the responsive override at `≤ 1024px` is your responsibility.
9. **Don't add features the PRD didn't ask for.** A "newsletter signup" feels helpful; it's actually a distraction from the WhatsApp conversion path. Run additions past PRD §11 (Out of Scope) first.
10. **If the user says "this isn't working," ask what specifically before redesigning everything.** Three follow-up questions beat one wasted rewrite.

---

## 11. Open TODOs (sorted by impact)

These are tracked in PRD §13 Roadmap. Listed here for engineering convenience.

### Done in v1.0
- [x] Wire up grade-tab switching JS
- [x] Open Graph + Twitter Card meta tags (WhatsApp/social share preview works)
- [x] Schema.org JSON-LD: LocalBusiness + EducationalOrganization + FAQPage
- [x] Inline SVG favicon + apple-touch-icon
- [x] `theme-color` for mobile browser chrome
- [x] Mobile hamburger nav with off-canvas drawer
- [x] `prefers-reduced-motion: reduce` handling
- [x] Explicit `:focus-visible` styles for all interactive elements
- [x] Modal focus trap (Tab cycling) + restore focus on close
- [x] Drawer Esc-key + click-outside dismissal
- [x] Active-nav scroll detection synced to drawer links too
- [x] Search filter rewired to new subject-hub structure + auto-switches grade tabs
- [x] `BLR Tutoring.html` duplicate replaced with a redirect to `index.html`
- [x] `sitemap.xml` and `robots.txt` at site root
- [x] POPIA privacy notice page (`privacy.html`) linked from footer
- [x] WebP feature detection (`.webp` class on `<html>` for CSS fallback chain)

### Still open (ops or v1.5+)
- [ ] **Real testimonials** — collect 6+ from current learners, replace `SEED` array. *Ops task — Takalani to send requests via WhatsApp.*
- [ ] **Convert hero + tutor photo to WebP** with PNG fallback. *Use Squoosh; target < 80 KB each. WebP detection JS is already in place.*
- [ ] **Capture real photos of a live class** for hero variation and section backgrounds.
- [ ] **Formspree/Airtable backend** for testimonial submissions (v1.5 — see PRD §13).
- [ ] **Analytics** — Plausible or Umami. Not Google Analytics (data sovereignty).

---

## 12. Contact

For product decisions: **Takalani Mugeri** — see footer for contact info.
For design questions: refer to Design.md; if not answered, escalate to product owner.
For code/Claude assistance: this file.
