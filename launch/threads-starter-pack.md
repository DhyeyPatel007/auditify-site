# Auditify — Threads Starter Pack + Bug-Bounty Playbook
Prepared 2026-10-08. Voice: quiet, confident, precise. Domain: https://auditify.krynex.in
Rule: every number below comes from a real scan. Re-run the scan before posting if you want fresher numbers.

## Posting notes
- Threads is your account — no mod/ban risk. Post 1/day in the IST evening window (US/UK awake roughly 6pm–1am IST).
- Each post ends with the free-scan link. The scan IS the product demo.
- Reply to every comment. First 10 customers are earned by hand.

---

## Post 1 — Series kickoff (post this first)

I built a tool that audits websites and explains the results in plain English.

Starting today I'm running famous websites through it and posting the honest scores — no cherry-picking, no shilling.

First up: Zerodha. Full breakdown here: auditify.krynex.in/teardowns/zerodha

Run your own site free: auditify.krynex.in

## Post 2 — Zerodha teardown
(Sourced from src/teardowns/teardowns.ts — real scan, Oct 2026)

I audited zerodha.com with my own tool. Score: 84/100 (B).

28 of 36 checks pass. This is one of the tightest-run sites in Indian fintech — but the 3 failures are interesting:

1. 9 of 23 images have no alt text — screen readers skip them, image search can't index them.
2. No Content-Security-Policy header. On a fintech homepage, that's the scariest line in the report — one compromised third-party script runs with full page privileges.
3. HSTS is set but max-age is only ~6 months. Should be a year minimum.

None of this is a disaster. All of it is fixable in an afternoon. That's the whole point of the tool.

Full teardown: auditify.krynex.in/teardowns/zerodha
Free scan for your site: auditify.krynex.in

## Post 3 — The Google hook
(Score from real scan, 2026-10-04: 79/100, grade C. Reasons: no enforcing Content-Security-Policy, no HSTS, no viewport meta tag. Re-run before posting if you want.)

Google.com gets a 79/100 on my website audit tool. A C.

Missing: an enforcing CSP header, HSTS, and a viewport meta tag.

If Google ships without a CSP, your site probably does too — and on a smaller site there's no security team watching. The free scan takes 2 minutes:

auditify.krynex.in

## Post 4 — Eat your own dogfood (template — fill in after running the scan)
1. Run krynex.in through your own scanner (2 min).
2. Fill in the blanks and post:

I audited my own agency site with my own tool.

krynex.in: [SCORE]/100 ([GRADE]).

[One honest finding, e.g. "Still no CSP header — fixing it this week."]

If I post my own bad scores, you can trust the good ones too.
auditify.krynex.in

## Post 5 — Bug bounty promo (his idea, Threads version)

Bug bounty, but make it broke-founder edition:

Find a real bug in my website-audit tool → get the $15 full report free (one per person).

Rules: must be reproducible, must be something I can fix. UI papercuts count if they're real.

Comment the bug or DM me. If it checks out, I send you a 100%-off coupon code.

Tool: auditify.krynex.in

---

## Bug-bounty playbook (how to run it without getting banned or scammed)

**Threads:** Post 5 above as-is. It's your account — no risk.

**Discord:** Do NOT cold-drop the link in servers. Instead:
1. Only post in servers where you're already a known member, and only in channels that allow self-promo / feedback (e.g. #showcase, #feedback).
2. If unsure, DM a mod first: "I built a free website-audit tool, can I post a bug-bounty offer in #feedback?" One polite ask beats one ban.
3. Best servers for this: the ones in your client-radar list (Reactiflux, BuildNIX, Anywork, GraphiQ, Braintrust) — but check each server's rules first.

**Reddit:** His Reddit account is banned (per launch/free-marketing-plan.md) — do NOT create a throwaway to post links; that's how accounts die permanently. Skip Reddit until one account is rebuilt slowly with genuine participation.

**The coupon (Paddle):**
1. FIRST: delete the old 100% test coupon in the Paddle dashboard (still pending — it must go before you mint a new 100%-off code, or you'll mix up redemptions).
2. Create a new 100%-off coupon, code e.g. BUGBOUNTY, limited redemptions, one use per customer.
3. Do NOT publish the code in the post — DM it to verified bug finders only, otherwise bots eat it in an hour.

**Email collection flow (automatic):**
- Even at 100% off, checkout goes through Paddle and the buyer must enter an email.
- The entitlements endpoint records ALL purchases including $0 coupon redemptions, and you get Paddle's sale email per redemption.
- That email address IS your email base. Save every one to a spreadsheet the day it lands.
- Manual fulfillment per his 2026-10-08 call: he gets the sale email, runs the scan / sends the report by hand.

**Scam guard:** "reproducible bug" only. If someone reports something vague ("site feels slow"), ask for steps. No steps, no coupon.

---

## Still open (his call, not done here)
- "First report free for every user" funnel (his idea, 2026-10-08): needs a per-user "used free report" flag in Firestore + checkout gating. Implement only on his word.
- "Book a call" upsell line ("Fix packages start at $49 — book a call to discuss"): one-line copy addition under the existing cal.com link. Ready to add on his word.
