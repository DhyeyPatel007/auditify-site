# Auditify — Complete Handoff Prompt for Opus 5.5

Copy everything below the line and paste it to Opus 5.5 as your first message.

---

You are taking over the **Auditify** project — a website-audit SaaS. The previous developer (Muse) built the core product but left several bugs and incomplete features. Your job: **analyze the entire codebase, find all issues, fix them in one response, with zero regressions.**

## Project Overview

**What it is:** Self-serve website audit tool. Free scan → $15 one-time full report → $12/mo monitoring → $69/mo agency white-label.

**Live URL:** https://auditify.krynex.in/
**Repo:** `DhyeyPatel007/auditify-site` (private, branch `main`)
**Local path:** `~/workspace/auditify-app/`
**Stack:** React + Vite + TypeScript + Tailwind CSS (frontend) | Vercel Serverless Functions (API) | Firebase Auth | Paddle Billing (payments)

**Brand:** Paper `#F7F3EA`, ink, vermilion `#C93A1B`. Typography: Fraunces (display), Inter (body), IBM Plex Mono (numbers). Design language: "report card, not dashboard." No purple/blue gradients, no glassmorphism, no generic AI visuals.

## Architecture

### Frontend (`src/`)
- `src/pages/` — Dashboard (login-gated), CheckoutPage, Methodology, Teardowns, legal pages
- `src/sections/` — Pricing, Hero, Scanner landing, Features, etc.
- `src/components/Scanner.tsx` — The audit UI. Shows score, top 3 issues free, locked teasers for the rest. Paid users get full reports.
- `src/components/` — AuthModal, AccountModal, Phase2Modal, Stamps, etc.
- `src/lib/plans.ts` — **Single source of truth for pricing:** Free ($0), One-time report ($15), Monitoring ($12/mo), Agency ($69/mo)
- `src/lib/paddle.ts` — Paddle.js initialization, checkout flow
- `src/lib/entitlements.ts` — Client-side entitlement fetching
- `src/lib/reports.ts` — Browser localStorage for scan history (keyed by Firebase UID)
- `src/lib/firebase.ts` — Firebase Auth config
- `src/auth/AuthContext.tsx` — Auth provider, Google + email/password

### API Routes (`api/`)
- `api/scan.ts` — The audit engine. ~1077 lines. Runs 35+ deterministic checks server-side. Returns `{ score, grade, issues[3], locked[], summary }` for free. Accepts `full: true` + `idToken` for paid full reports (returns all issues).
- `api/paddle-transaction.ts` — Creates Paddle transactions. Verifies Firebase ID token server-side using Google public certs (zero-dependency RS256). Puts `firebase_uid` and `plan` in `custom_data`.
- `api/paddle-webhook.ts` — Receives Paddle webhooks. Verifies HMAC-SHA256 signature (`Paddle-Signature` header, format `ts=<ts>;h1=<hmac>`, signed payload is `ts:rawBody` with a **colon**). Currently only logs events — does NOT write to any database.
- `api/entitlements.ts` — Given a Firebase ID token, queries Paddle API for customer's completed transactions + active subscriptions. Returns `{ report, reportCredits, monitoring, agency }`. **Paddle is the source of truth — no database.**

### Key Technical Decisions (DO NOT BREAK THESE)
1. **Paddle.js rendering fix:** Paddle's checkout iframe mispositions itself (tiny, bottom-left corner) on this page. Fixed via CSS override in `src/index.css`: `iframe.paddle-frame { position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%,-50%) !important; width: min(480px,94vw) !important; ... }`. Do NOT remove this.
2. **Webhook signature:** Paddle signs `timestamp:body` with a **colon**, not semicolon. No timestamp freshness check (Paddle replays reuse old timestamps).
3. **Firebase token verification:** Done manually with `node:crypto` + Google certs. Do NOT add `firebase-admin` — it crashes Vercel serverless functions.
4. **No database:** Entitlements are checked live via Paddle API. Scan history is in browser localStorage. Unlocked reports tracked in localStorage.
5. **Checkout flow:** User must be signed in → server creates Paddle transaction with verified UID → user goes to `/?checkout=<txnId>` → CheckoutPage opens Paddle overlay.
6. **One-time report model:** $15 = one credit = one specific report. User picks which scan to unlock from Dashboard history. Credits tracked via Paddle transaction count minus localStorage unlock count.

### Environment Variables (Vercel)
**Public (VITE_ prefix, safe in browser):**
- `VITE_PADDLE_TOKEN` — Paddle client-side token (`test_...` sandbox, `live_...` production)
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`

**Secret (server-only, NEVER expose to client):**
- `PADDLE_API_KEY` — Paddle server API key
- `PADDLE_WEBHOOK_SECRET` — Webhook signing secret (from Paddle → Developer tools → Notifications → destination)
- `PADDLE_API_URL` — `https://sandbox-api.paddle.com` or `https://api.paddle.com`
- `PADDLE_PRICE_REPORT`, `PADDLE_PRICE_MONITORING`, `PADDLE_PRICE_AGENCY` — Price IDs (env-configurable, sandbox defaults in code)
- `FIREBASE_PROJECT_ID` — `auditify-74fad`

## Current Issues (Find and Fix All)

### Critical Bugs
1. **PDF download may not appear after payment.** The "Download PDF" button only shows when `result.full === true`. The entitlement check queries Paddle API — if `PADDLE_API_URL` points to live but the purchase was in sandbox (or vice versa), or if `PADDLE_PRICE_*` env vars don't match actual price IDs, the check fails silently. Verify the full chain: purchase → Paddle API → entitlements → Scanner `full: true` → PDF button.
2. **Code duplication:** `api/scan.ts` has inlined Firebase token verification + Paddle entitlement checking (duplicated from `api/entitlements.ts`) because shared files in `api/` caused Vercel bundling failures. Find a clean way to share this logic without breaking Vercel deployment.
3. **No error recovery:** If Paddle API is down, entitlements fail closed (user sees free tier). Add appropriate retry/caching without compromising security.

### Missing Features
4. **Monitoring ($12/mo) not built:** Needs weekly re-scan cron, email/Slack alerts, issue history/trends UI. The entitlement exists (`monitoring: true`) but no features behind it.
5. **Agency white-label ($69/mo) not built:** Needs branded reports, client share links, lead-gen embed form. Entitlement exists but no features.
6. **No server-side history:** Scan history is localStorage-only. The Dashboard even says "History lives in this browser for now — server-side history ships with paid plans." Paid users expect cross-device history.

### UX Issues
7. **Post-payment flow is confusing:** After paying for a report, the user must manually find the scan in history and click unlock. The auto-unlock (via `localStorage` pending-unlock key) may not work reliably across the Paddle redirect.
8. **Many buttons may not work:** Audit every button in the UI. The user reports "many buttons don't work." Test each one: Pricing CTAs, Dashboard actions, Scanner buttons, Auth modal, Account modal, mobile nav, footer links.
9. **Coupon UX:** The pricing page mentions discount codes, but there's no clear flow for how users get/apply them.

### Infrastructure
10. **DNS conflict:** `auditify` subdomain has both a CNAME (to Vercel) and an A record (76.76.21.21). The CNAME must be deleted. (Requires user action in Vercel DNS — flag this, don't try to fix in code.)
11. **Test Firebase account** (`browsertest12345@example.com`) should be deleted before public launch. (Requires user action in Firebase Console.)

## Your Tasks (In Order)

1. **Clone and analyze:** Read every file in `src/` and `api/`. Map all data flows: scan → report → purchase → entitlement → unlock → PDF.
2. **Reproduce issues:** For each bug above, trace the exact code path and confirm the root cause. Don't guess — read the code.
3. **Fix in one response:** Apply all fixes. Maintain 100% backward compatibility — no existing working feature may break.
4. **Security audit:** 
   - Verify no API keys, secrets, or tokens are exposed in client-side code or git history
   - Verify Firebase token verification is cryptographically sound in ALL endpoints (not just payload decoding)
   - Verify Paddle webhook signature verification is correct
   - Verify no SSRF vulnerabilities in the scan API
5. **Optimization:** Remove dead code, eliminate duplication, ensure no unnecessary API calls. The entitlements check hits Paddle API on every dashboard load — add appropriate caching.
6. **Generate sample PDF:** Create a sample Auditify report PDF showing exactly how a full paid report should look. Use realistic data (use `example.com` scan results as the basis). Brand it correctly (paper/ink/vermilion, Fraunces/Inter typography). This is the visual spec for the PDF feature.

## Architecture Guidance for Further Work

**Where to go next:**
- **Database:** The "no database" decision was pragmatic for launch but won't scale. Recommend: Firestore (already on Firebase) for entitlements, scan history, and monitoring config. Migration path: keep Paddle as source of truth for purchases, cache in Firestore, sync via webhook.
- **Monitoring:** Vercel Cron Jobs → weekly scan trigger → compare with previous → send email via Resend/Postmark → store trend data. Needs: monitored-sites list per user, alert preferences.
- **Agency:** White-label = custom logo/colors on reports + shareable links (signed URLs) + embeddable audit form (iframe). Needs: agency settings page, link generation, embed code generator.
- **PDF:** Current jsPDF implementation is basic. For production-quality PDFs, consider server-side generation (Puppeteer on Vercel is heavy — evaluate alternatives) or a polished client-side template.

## Constraints
- **Zero regressions.** If it works now, it must still work after your changes.
- **No API leaks.** Grep for every `process.env` — ensure secrets never reach the browser bundle.
- **No new dependencies** unless absolutely necessary. Prefer zero-dep solutions.
- **Keep the brand.** Paper/ink/vermilion. Report card aesthetic. No AI-slop visuals.
- **Test everything.** Don't just fix — verify each fix works.

## Success Criteria
- [ ] All buttons in the UI work correctly
- [ ] Purchase → unlock → PDF download works end-to-end for $15 report
- [ ] No way to access paid features without paying (try to break it via devtools)
- [ ] No console errors on any page
- [ ] Sample PDF generated showing ideal report format
- [ ] Code is cleaner than before (less duplication, better organized)
- [ ] No secrets in client bundle (verify with `grep` on built assets)

Start by reading the codebase, then present your findings (issues found + root causes) before applying fixes.
