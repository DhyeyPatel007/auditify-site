# Auditify — Launch Readiness Audit
**Date:** 2026-10-05 · **Auditor:** launch-readiness subagent
**Target:** launch within 24h under **KRYNEX STUDIO** (product: Auditify)
**Scope:** everything except payments (founder handles Paddle separately tomorrow)
**Method:** live site crawl (homepage, /terms, /privacy), source inspection (src/, api/, vercel.json, public/), header/SEO/asset checks, edge-case API tests.

**Verdict:** the engine is launch-grade (35+ checks verified accurate 2026-10-05; SSRF guards verified; security headers strong). The **site chrome is not** — the blockers are all trust/polish items, ~1.5h of work total. Nothing here needs money.

---

## MUST-HAVE (blocks launch)

### 1. Kill or fix the 9 dead footer links
**What:** Footer's Company/Resources columns link `Changelog, About, Blog, Contact, Careers, Help center, Audit checklist, Status, Security` — all `href="#"`. Every page carries a footer full of dead ends.
**Why:** Launch-day visitors *will* click these. Dead links scream "unfinished" and tank credibility for a tool selling "audits you can trust."
**Effort:** 30 min — delete the dead columns (keep Product/Legal with working anchors), or ship a real Contact link (see #3).

### 2. Add KRYNEX STUDIO branding
**What:** "Krynex" appears **zero times** anywhere on the site. Footer reads "© 2026 Auditify".
**Why:** Founder's explicit call: launch under KRYNEX STUDIO. Minimum viable: footer "© 2026 Krynex Studio" + "Auditify by Krynex Studio" tagline. Without it the launch announcement ("from Krynex Studio") points at a site that never mentions the name.
**Effort:** 15 min.

### 3. Add a contact/support path
**What:** No email, no contact page, no support link anywhere (`/contact` → 404, zero `mailto:`, zero "contact" mentions in code). The Privacy page literally says "contact us and we'll take it down" — pointing at nothing.
**Why:** A tool asking for trust (and soon money) with no way to reach a human is a launch-blocker. Also a practical need: scan disputes, takedown requests, pre-sales questions.
**Effort:** 15 min — footer "Contact" → `mailto:` (use the Krynex/professional address once domain is decided; temp: existing Gmail).

### 4. Fix Terms: "roughly a hundred checks" → "35+ checks"
**What:** `src/pages/Terms.tsx:8` still claims "roughly a hundred checks". The engine runs 35+ (verified). Homepage already says 35+.
**Why:** Anyone who runs a scan and counts, or reads the homepage vs Terms, catches the lie. For an *accuracy* product, this is the worst possible inconsistency.
**Effort:** 5 min.

### 5. Fix Privacy's phantom "last updated" date
**What:** `src/pages/Privacy.tsx:43` says "we'll update the 'last updated' date above" — no such date exists on the page.
**Why:** Sloppy legal page on launch day; trivial to fix.
**Effort:** 5 min — add a "Last updated: 5 October 2026" line or reword.

### 6. Make the domain decision (even if the decision is "not yet")
**What:** `auditify-site.vercel.app` is hardcoded in: canonical URL, `og:url`, `og:image`, `twitter:*`, `public/sitemap.xml`, `public/robots.txt`.
**Why:** If krynex.in (or any domain) is coming, every one of these must change or launch-day shares/SEO point at the wrong URL. If the call is "launch on vercel.app for now," that's fine — just make it explicit so the swap is a known task, not a surprise.
**Effort:** 0 min to decide; ~30 min to execute the swap later.

### 7. Founder does a 5-minute mobile pass on a real phone
**What:** Subagent can't render; code uses responsive classes throughout, but hero/scanner/pricing/footer need eyeballs on a real device.
**Why:** Most launch traffic from social will be mobile. One broken layout = lost day-one users.
**Effort:** 5 min of his time.

---

## SHOULD-HAVE (within days; #8 needed *before* Paddle tomorrow)

### 8. Refund policy page (`/refund` → currently 404)
Paddle requires a refund policy before payments go live — and he's doing Paddle tomorrow. One short page, link it in the footer Legal column and from the pricing section. **Effort:** 30 min.

### 9. Basic analytics
Privacy page boasts "no third-party analytics" — true, which means launch traffic is invisible. Vercel Web Analytics (free tier) or Plausible keeps the privacy promise while showing where day-one users come from. **Effort:** 30 min.

### 10. Close the Lighthouse 100/100 gate
Still open from the earlier QA round. The site is already fast (2 KB HTML, 252 KB JS / 78 KB gzipped, 31 KB CSS, sub-second loads from test), so this is verification + small fixes, not a rebuild. Founder set it as a hard gate — don't launch without at least one clean measurement. **Effort:** 1–2 h.

### 11. Swap hardcoded URLs when the domain lands
Canonical, OG/Twitter tags, sitemap.xml, robots.txt — all point at `auditify-site.vercel.app` today (see #6). **Effort:** 30 min at swap time.

### 12. Watch `/api/scan` for abuse on launch day
No auth, no CAPTCHA; the 1/day/IP limit is in-memory per serverless instance (resets on cold starts — lenient, not strict). Fine for launch, but keep an eye on Vercel function logs for hammering. **Effort:** monitoring only.

### 13. FAQ "What happens to my data?" mentions accounts that don't exist
Forward-looking copy ("Delete your account…") for a product with no accounts yet. Harmless, but reword to present tense to avoid confusion. **Effort:** 10 min.

---

## NICE-TO-HAVE

- **Twitter card `summary` → `summary_large_image`** for richer link previews (one-line change in `index.html`).
- **Real Changelog / Status pages** later — don't fake them now (correctly stubbed as dead links today; see #1).
- **Blog** for SEO later — correctly absent today.
- **Sample report card** shows a static "2026-10-04 14:22 IST" stamp — fine, it's labeled a sample.

---

## What's already launch-grade (no action)

- Scanner engine: 35+ deterministic checks, accuracy-audited 2026-10-05 against curl ground truth on 8 sites; 12 bugs fixed and verified live.
- Security: full CSP, HSTS (preload), X-Frame-Options DENY, nosniff, no exposed `.env`/`.git`/sourcemaps.
- Honest monetization: paid tiers open a "Checkout opens at launch" modal — nothing faked; post-scan upsell ("Unlock full report — $24") works.
- SEO basics: title, meta description, OG tags, twitter card, OG image (200), favicon set, sitemap.xml + robots.txt present, canonical set.
- Legal pages exist (Terms, Privacy) with honest "paid plans are Phase 2" framing.
- All nav anchors (`#features`, `#pricing`, `#faq`, `#scan`, `#top`) resolve; `/terms` and `/privacy` route correctly.
- Edge cases: empty/garbage/SSRF/private-IP/bad-port/nonexistent-domain/deep-URL all return clear 400s; friendly 502 on TLS failures.
- "Proudly made in India" footer badge present, as specified.

## Suggested 24h order
1. #4 + #5 (10 min, copy fixes) → 2. #1 + #2 + #3 (1 h, footer/branding/contact — one editing session) → 3. #6 domain call → 4. #7 mobile pass → 5. deploy → 6. #10 Lighthouse measurement → launch. #8 refund page before Paddle tomorrow.
