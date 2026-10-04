# Auditify — Post-Launch Next Steps (Weeks 1–4)

Launched under **KRYNEX STUDIO** (domain TBD — maybe krynex.in). Product is live,
scanner is real and accuracy-audited. Payments are NOT wired yet — checkout
buttons honestly say "opens at launch." This doc is what happens after the
24-hour launch sprint, in order.

Rule for all four weeks: **no new features until customers demand them.**
Talk > build.

---

## Week 1 — Money in, ears open

### 1. Paddle live (his lane — do it tomorrow)
- [ ] Finish Paddle signup + identity verification (passport/govt ID + liveness selfie, PAN, bank proof)
- [ ] Create 3 products in Paddle: **$24 one-time report**, **$19/mo monitoring**, **$109/mo agency white-label**
- [ ] Run a test checkout end-to-end in Paddle sandbox
- [ ] Hand the 3 checkout links to the build side so buttons get wired
- **Done looks like:** a real $24 test purchase completes and the money path works.

### 2. Domain decision (by end of week 1)
Options: `auditify.krynex.in` (keeps everything under the studio, zero cost)
vs a dedicated domain like `auditify.io` (cleaner SaaS brand, ~$10-15/yr).
- [ ] Decide. If dedicated: buy, connect to Vercel, set up Zoho Mail on it for a real business email (Paddle receipts + support look legit).
- [ ] Add "Auditify — a Krynex Studio product" to the footer (light touch, keeps the parent brand visible).
- **Done looks like:** the site lives on its final URL and support email works.

### 3. Email capture on scan results (build priority #1)
Right now a free scan ends with nowhere to go — no email, no follow-up.
That is the single biggest leak in the funnel.
- [ ] Add one field to the results page: "Email me the full report" → stores email + URL + score somewhere simple (even a Google Sheet via the API is fine for now).
- [ ] Auto-reply is NOT needed yet — you will email them manually (see #4).
- **Done looks like:** every scan can become an email address you own.

### 4. Concierge the first 50 users
For the first 50 emails captured, YOU personally send the full report
with a 2-line note. Template:

> "Here's your full 35-check report for [site] — [link/file].
> Quick question: was anything in it surprising or confusing? Just reply."

- [ ] Reply to every response within 24h.
- [ ] Log every reply in one doc: confusion points, feature requests, pricing reactions.
- **Done looks like:** 50 personal emails sent; you can list the top 5 things users didn't understand.

### 5. Keep it alive
- [ ] Check the site loads + a scan completes, once a day (2 min).
- [ ] Fix scan crashes first, everything else later.
- **Done looks like:** zero downtime you didn't notice.

---

## Week 2 — First 10 paying customers

### 6. Outreach sprint: 15 personalized audits a day
This is the highest-ROI activity you have. No ads, no waiting.
- [ ] Each morning, find 15 small-business/agency sites in the US/UK/CA with visible issues (Google: `"dentist" "chicago"`, `"law firm" "manchester"`, `"shopify store" + niche`, etc. — run each through your own scanner first).
- [ ] Email/LinkedIn DM each owner: 3 specific findings + the free full report + one line: "Full readable report is $24 if you want me to go deeper."
- [ ] Script (keep it short, no flattery):
> "Hi [name] — I ran a free technical audit on [site]. Found [3 specific things, e.g. 'no HTTPS redirect, 2.1MB of images, missing meta description']. Full plain-English report attached, free. If you want the deep version with fixes prioritized, it's $24: [link]."
- **Done looks like:** 100 outreach sent, 10+ replies, first paying customers.

### 7. Collect proof
- [ ] Ask every happy user: "Can I quote you? One line + your name/business."
- [ ] Put 3 real testimonials on the site (replaces nothing — there is no fake strip, keep it that way).
- **Done looks like:** 3 named testimonials live.

### 8. Pricing reality check
- [ ] First $24 sale = pricing validated, keep going.
- [ ] 100 outreach + 0 sales = the problem is traffic/offer framing, not price. Do NOT discount — re-read the concierge feedback doc first.
- **Done looks like:** you know WHY people buy or don't.

---

## Week 3 — Double down on what worked

### 9. Channel review (30 min, Sunday)
Look at the week's numbers (see free-marketing-plan.md metrics):
- [ ] Which channel brought scans? Which brought replies? Which brought money?
- [ ] Kill the bottom one. Double time on the top one.
- **Done looks like:** one channel cut, one channel doubled.

### 10. Test monitoring demand WITHOUT building it
Do not build scheduled scans yet. Instead:
- [ ] Email your $24 buyers: "Want me to re-scan [site] monthly and email you what changed + what broke? $19/mo, cancel anytime. Reply YES and I'll set it up manually."
- [ ] Fulfill manually with calendar reminders for the first 5 takers.
- **Done looks like:** you know if anyone actually wants monitoring before writing a line of scheduler code.

---

## Week 4 — Build only what's earned

Build triggers (do not build before these):
| Feature | Build when |
|---|---|
| User accounts | ≥10 paying customers OR ≥200 emails captured |
| Scheduled scans + alerts | ≥5 people pay for manual monthly re-scans |
| PDF export | ≥3 customers ask for it |
| Agency white-label ($109) | an actual agency asks for it |
| Admin panel | support volume > 5 emails/week |

- [ ] Whatever crossed its trigger gets built. Whatever didn't, waits.
- **Done looks like:** every feature built in month 1 was pulled by a customer, not pushed by a hunch.

### Weekly ritual (every Sunday, 30 min)
Update one spreadsheet: scans, emails captured, outreach sent/replied,
paying customers, MRR, best channel, one lesson. That's the whole dashboard
until revenue says otherwise.
