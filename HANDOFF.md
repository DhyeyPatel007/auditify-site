# AUDITIFY — Full Project Handoff

**Written:** 2026-10-06 ~00:30 IST, by Dillo (Muse), for the next agent taking over.
**Purpose:** Everything known about the Auditify project — what it is, what's done, what's next, where secrets live (names/locations only, NO values in this file), and how to work on it without breaking things.

---

## 1. Project snapshot

- **Product:** Auditify — a self-serve website-audit SaaS. Free scan → paid full report → monitoring/agency subscriptions.
- **Brand:** Launched under **KRYNEX STUDIO**. Tagline (approved): "A website audit you'll actually read."
- **Production URL:** https://auditify.krynex.in/ (decided 2026-10-05; free subdomain, Vercel-managed DNS, SSL automatic)
- **Legacy URL:** https://auditify-site.vercel.app/ (still serves; keep as fallback)
- **GitHub:** `DhyeyPatel007/auditify-site`, private, branch `main`
- **Local source:** `~/workspace/auditify-app/`
- **Figma:** "Auditify — Website", key `UtSWrcfJ3TLavsNAzYBDe0`
- **Owner:** 19-year-old builder in India (Asia/Kolkata). Name unresolved — "Snehil" (inferred from a filename) vs "DHYEY PATEL" (Figma handle). **Never address him by either name unless he volunteers one.**
- **Design language:** "Report card, not dashboard." Paper `#F7F3EA`, ink, vermilion `#C93A1B`. Fonts: Fraunces (display), Inter (body), IBM Plex Mono. Quiet/confident/precise personality. No AI-slop visuals, no purple/blue gradients, no glassmorphism.

### Pricing (single source of truth: `src/lib/plans.ts`) — reset 2026-10-05 by owner
| Plan | Price |
|---|---|
| Free scan | $0 |
| Full report | **$15** one-time |
| Monitoring | **$12**/month |
| Agency white-label | **$69**/month |

Discounts (advertised, NOT hard-coded — owner creates real codes in Paddle): 10% off first purchase, 5% off next purchase, one-time use each. Old `$24/$19/$109` prices are stale — audit any old doc/asset before public use.

### Audience
Small businesses + agencies + developers. **Deliberately broad** — owner is a generalist by conviction ("if they want any service i can do it"). Never push niche-only positioning.

---

## 2. Tech stack & architecture

- **Frontend:** React 19 + Vite 7 + Tailwind CSS 4, TypeScript. SPA with manual pathname routing in `src/main.tsx` (no react-router).
- **Backend:** One Vercel serverless function: `api/scan.ts` (~1077 lines). Runs 35+ deterministic checks per scan (target-dependent). **Heuristic/rule-based — never trained ML.**
- **Auth:** Firebase Auth (free Spark plan) — Google OAuth + email/password. **Google sign-in uses a custom GIS direct-token flow** (see §5).
- **Hosting:** Vercel, project `auditify-site`, auto-deploys from GitHub `main`.
- **Payments:** Paddle (chosen 2026-10-05; Razorpay ruled out — not a merchant of record). NOT yet integrated — checkout still to build.

### Key files
| Path | What |
|---|---|
| `src/main.tsx` | Manual router (pathname → page). **Every SPA route needs a Vercel rewrite** (see §8) |
| `src/App.tsx` | Main site shell, auth modals, nav |
| `src/auth/AuthContext.tsx` | Auth state, Google (GIS) + email/password, friendly errors |
| `src/lib/firebase.ts` | Firebase init from `VITE_FIREBASE_*` env vars |
| `src/lib/plans.ts` | Pricing single source of truth |
| `src/components/Avatar.tsx` | Post-login avatar (Google photo or tonal initials) |
| `src/pages/AuthDebug.tsx` | **Auth diagnostics page** (`/auth-debug`) — keep hidden, remove before public launch |
| `api/scan.ts` | The scanner — 35+ checks, SSRF guards, rate limiter |
| `vercel.json` | Rewrites, security headers (CSP/HSTS/etc.) |
| `launch/` | Launch docs: readiness, next-steps, marketing plan, social captions, canva links, auth-paddle checklist |
| `accuracy/` | Ground-truth + test harnesses from the 2026-10-04 accuracy audit |

### Routes (all need Vercel rewrites — 6 exist in vercel.json)
`/`, `/terms`, `/privacy`, `/refund`, `/methodology`, `/teardowns`, `/teardowns/:slug`, `/auth-debug` (hidden)

---

## 3. Credentials & secrets map — NAMES AND LOCATIONS ONLY, NO VALUES HERE

| Secret | Where it lives | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Vercel env vars (project `auditify-site`), type **Config** | Public-by-design (ships in JS bundle); restricted by Firebase authorized domains + GCP API key HTTP-referrer restrictions |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same as above | `auditify-74fad.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Same as above | `auditify-74fad` |
| `VITE_FIREBASE_APP_ID` | Same as above | From Firebase web app registration |
| Google OAuth client ID | **Hardcoded** in `src/auth/AuthContext.tsx` (`GOOGLE_CLIENT_ID`) | `932266314669-2hqrrst210vpog5dfa4hlu82u8frqd50.apps.googleusercontent.com` — public value, auto-created by Firebase |
| Paddle price IDs | **Don't exist yet** — owner creates products, then sends IDs | Needed to build checkout |
| Paddle webhook secret | **Don't exist yet** — owner sends after creating products | Needed for fulfillment webhook |
| Paddle coupon codes | Owner creates in Paddle dashboard (10% first, 5% next) | Never hard-code; site passes typed codes through to Paddle |

**Rules:** never commit secrets; never put values in this file, memory, or chat. Firebase web keys are public-by-design but still don't paste them anywhere unnecessary. The 2026-10-05 Firebase key scare was verified byte-by-byte as empty values — nothing leaked, nothing to rotate.

---

## 4. What is DONE (2026-10-04 → 2026-10-06)

### Scanner & accuracy (2026-10-04)
- 12 real bugs found via ground-truth audit on 8 live sites and fixed: mixed-content dead code, `.env` false positives on SPAs, HEAD-only broken-link false positives, empty `alt=""` treated as missing, HTTPS assumed not probed, OG description substituting meta description, weak CSPs passing, HSTS/mixed-content double penalties, HTML comments breaking tag checks, TTFB wording, HTTP/2 never detected (ALPN), TLS failures → generic 500s (now useful 502s).
- Post-fix live scores: Auditify ~96/A, GitHub 90/A, Krynex ~84–86/B, Google ~75/C, example.com 70/C, http://example.com 66/D, http://neverssl.com 61/D.
- SSRF/edge tests pass (localhost, private IPs, metadata endpoints, bad ports, garbage input).
- Score = weighted directional signal, not absolute truth. Limitations disclosed on `/methodology`: homepage-only, single snapshot, no JS execution, ≤10 links sampled, perf measured from scan-server location.

### Launch polish (2026-10-05)
- Removed 9 dead footer links; footer = `© 2026 Krynex Studio · Auditify`; temp contact `dhyeypatel.work2@gmail.com` (swap to `hello@krynex.in` later — decision pending).
- Terms corrected ("35+ checks", was "roughly a hundred").
- **`/refund` page live** (14-day money-back on report, first-month refundable on subscriptions, cancel anytime — provisional, he can make it stricter). Required for Paddle approval.
- Canonical/OG/sitemap/robots → `auditify.krynex.in` (commit `383bc55`).
- Seven additions shipped (commit `152326d`): `/methodology`, anatomy-of-a-fix (real Nilkanth scan), monitoring preview, white-label agency mock (labeled fictional), comparison table, per-account scan history (localStorage), `/teardowns` (real Zerodha teardown).
- Social: 2 Canva posts (launch announcement + benefit post), captions for X/LinkedIn/Instagram in `launch/social-captions.md`. Designs are 1080×1350 portrait. **Verify no stale $24/$19/$109 pricing in them before publishing.**
- OG image `og-image.png` live (1200×630 branded card).

### Domain (2026-10-05)
- `auditify.krynex.in` added by owner in Vercel (DNS Vercel-managed, SSL automatic). Verified live: 200, correct canonical, scanner works.

### Auth (2026-10-05) — the saga
- Firebase project created by owner; Google + Email/Password enabled; domains `auditify.krynex.in` + `auditify-site.vercel.app` authorized; 4 `VITE_FIREBASE_*` vars in Vercel as Config; redeployed.
- Google sign-in failed for hours (`auth/internal-error`, silent redirect death). Root causes found: our CSP blocked `apis.google.com` + Firebase auth iframe; GCP API-key referrer restrictions blocked Firebase's own handler domain; redirect return-trip lost its event silently.
- **Fix that worked:** bypass Firebase's `/__/auth/handler` entirely — **Google Identity Services direct token flow** in `src/auth/AuthContext.tsx` (`initTokenClient` → access token → `signInWithCredential`). Owner confirmed working 2026-10-05 ~21:19 IST. Email/password sign-up verified working via browser test.
- Clean avatars shipped: Google photo in circle, or tonal initials (deterministic per user) with photo-fallback. Account dropdown shows avatar + name + email.
- `/auth-debug` diagnostics page was the tool that cracked it — **removed 2026-10-06** (commit `316c0cd`, verified 404 live).
- **Still needed:** publish the Google OAuth consent screen (currently Testing mode; instant, no review — Firebase uses non-sensitive scopes only).

### Paddle (2026-10-05)
- Owner signed up. Payout settings done: India, Individual/Sole Proprietorship, Payoneer, $100 threshold. **Unverified:** Payoneer account must exist in his name at the email he entered, or payouts fail.
- Fee: free to start, ~5% + $0.50/transaction. Verification (ID/bank) takes ~1–2 days.

---

## 5. Current state (2026-10-06 00:30 IST)

**Working live:** marketing site, free scanner (35+ checks), Google + email/password auth, avatars, scan history, teardowns, methodology, refund/terms/privacy pages, rate limiting (in-memory, 1 scan/day/IP — preview-grade, not durable across serverless instances).

**Not yet working:** payments (no checkout, no webhook — Paddle products don't exist yet), monitoring/agency features (preview mocks only), analytics (none).

**PageSpeed 2026-10-05:** 99/96/100/100 mobile, 100/96/100/100 desktop (perf/accessibility/best-practices/SEO). **Accessibility fix shipped 2026-10-06** — `--color-muted` → `#726c62` (4.70:1), `--color-warning` → `#946117` (4.76:1), both WCAG AA on paper (commit `316c0cd`). Re-run PageSpeed on the live URL to confirm 100s.

---

## 6. Immediate next steps

### Owner's lane (needs his hands — automation cannot do these)
1. **Paddle:** finish seller verification → create 3 products (report $15 one-time, monitoring $12/mo, agency $69/mo) + 2 coupons (10% first, 5% next, one-time each) in **sandbox first**, then live → send price IDs + webhook secret.
2. **Firebase:** publish the Google OAuth consent screen (one click).
3. Confirm Payoneer account exists in his name (else payouts fail).
4. 5-minute real-phone mobile QA pass.
5. Confirm public contact email (temp `dhyeypatel.work2@gmail.com` → ideally `hello@krynex.in`).
6. Accessibility call: fix contrast or launch at 96.

### Next agent's lane (once owner delivers)
1. Build Paddle checkout (Paddle.js) on pricing buttons using sandbox price IDs.
2. Build webhook endpoint (verify Paddle signature) → fulfill: unlock full report, activate monitoring/agency.
3. Sandbox end-to-end test → swap to live IDs → live test.
4. Remove/hide `/auth-debug`.
5. Optional: privacy-compatible analytics; durable rate limiting (Redis/Upstash) if abuse appears.

---

## 7. Future plans (post-launch, from `launch/next-steps.md` + `launch/free-marketing-plan.md`)
- Week 1–4: Paddle live → email capture on scan results (biggest funnel leak) → outreach sprint (10–15 personalized free audits/day via email/LinkedIn DM) → build in public (X daily, LinkedIn 3–4×/wk; skip Reddit — account situation).
- Marketing engine: the free scan IS the marketing; public teardowns of real sites (private-first, permission before naming, never punch down); 14-day channel calendar in `launch/free-marketing-plan.md`.
- Build accounts/monitoring/agency features only when customers pull for it; concierge first 50 users by hand.
- No admin panel (recommended: skip for launch).

---

## 8. Gotchas & lessons (read before touching anything)

1. **Every SPA route needs an explicit Vercel rewrite** — `/refund` and `/auth-debug` both 404'd until added to `vercel.json`.
2. **Vercel↔GitHub integration silently disconnected once (2026-10-04)** — if pushes stop deploying, check project Settings → Git first.
3. **CSP vs Firebase auth:** the CSP must allow `https://apis.google.com` (script-src), `https://accounts.google.com` (script-src + connect-src), and `frame-src https://auditify-74fad.firebaseapp.com`. Tightening CSP will break Google login — test auth after any CSP change.
4. **Google sign-in does NOT use Firebase's popup/redirect** — it uses the custom GIS flow in `AuthContext.tsx`. Don't "simplify" it back to `signInWithPopup`.
5. **Never hard-code coupon codes** — Paddle is the source of truth (`src/lib/plans.ts` documents this).
6. **Pricing single source of truth is `src/lib/plans.ts`** — `$15/$12/$69`. Old `$24/$19/$109` refs are stale.
7. **The scanner is heuristic** — never call it ML/AI. Score is directional.
8. **krynex.in DNS is Vercel-managed** — subdomains go in Vercel Domains settings; no registrar step. (Relevant later for Zoho MX records if `dillo@krynex.in` inbox is ever set up.)
9. **Debug by running, not re-reading** — owner judges by touching the live deployment. Verify fixes on the live URL, never claim fixed before that. Screenshots > explanations.
10. **Vercel env var type:** use **Config**, not Secret, for the Firebase vars (they ship in the public bundle anyway; Config lets you view them later). Redeploy after any env change.

---

## 9. Working with the owner — operating rules

- **Credits are precious.** He is on the free weekly limit (resets Sundays ~13:07 IST). Subagents = fast + parallel but each gets a full copy of the conversation context (expensive). Him: "subagents when I want it fast, me directly when I want it cheap." For routine work, work directly, no crews.
- **Zero budget default.** Always state what is free and exact fee mechanics before he spends.
- **One-line directives, numbered lists.** He judges by touching the thing. Flat corrections ("just check website bug, stop wasting my time") are ground truth — comply instantly, don't negotiate or explain.
- **Don't guess at his expense.** His 2026-10-05 correction: "atleast stop guessing this time check our code, every mistake cant be of google side." Read the code, run one decisive test, report the result. No test-again loops.
- **Long tasks:** work quietly, then report verified results. Don't narrate.
- **Never address him by name** (Snehil vs DHYEY PATEL unresolved).
- **Chat is instant; `dhyeypatel.work2@gmail.com` is the async channel.** When emailing AS Dillo, always pass `--account 5bb50778c8a6411b93d24c8a06b71ebf` to gmail +send (default account = his personal Gmail; learned the hard way).
- **His exam:** SST1003, **today** Tue Oct 6, 11:40–13:10 IST — keep that morning quiet.
- **Time zone:** Asia/Kolkata.

---

## 10. Quick start for the next agent

```bash
cd ~/workspace/auditify-app
git pull origin main          # repo: DhyeyPatel007/auditify-site (private)
npm install                   # if needed
npm run build                 # tsc + vite; must pass before push
git push origin main          # Vercel auto-deploys (check Settings → Git if it doesn't)
```

- Verify live: `curl -s -o /dev/null -w "%{http_code}" https://auditify.krynex.in/`
- Test scanner: `curl -X POST https://auditify.krynex.in/api/scan -H 'Content-Type: application/json' -d '{"url":"https://example.com"}'`
- Full context: `~/MEMORY.md`, `~/memory/2026-10-05.md`, `launch/` docs in this repo.
