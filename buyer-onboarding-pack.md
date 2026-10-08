# Auditify — buyer onboarding + manual fulfillment pack (draft 2026-10-08)

Send-from address: `contact@auditify.krynex.in` (forwards to his inbox, verified 2026-10-06).
Buyer lookup on each Paddle sale email: buyer email + plan name show in the buyer's dashboard
(`/dashboard` on auditify.krynex.in, signed in with the purchase email).

## Onboarding email — $15 one-time report

Subject: Your Auditify report is ready — here's how to read it

Hi {name},

Thanks for picking up the full Auditify report. It's ready in your dashboard:
https://auditify.krynex.in/dashboard (sign in with the email you purchased with)

Your purchase buys one full report credit, tied to the scan you pick in your
dashboard. Pick the scan, hit download, and you get the full findings + the
branded PDF.

The "Want these fixed?" section at the end of your report includes an AI fix
prompt for every issue — and if you'd rather have it handled for you, book a
fix call with us: https://cal.com/auditify/15min

Reply to this email with any questions — a human reads every one.

— Auditify

## Onboarding email — $12/mo monitoring

Subject: Monitoring is on — here's your schedule

Hi {name},

Your Auditify monitoring is live. Here's what happens now:

- Every week I'll run a fresh full scan of {site} and email you the report.
- If a scan drops in score or turns up something new and important, you'll
  hear about it in that email — no need to log in.
- Everything lives in your dashboard: https://auditify.krynex.in/dashboard

The monitoring stays active until you cancel — no lock-in.

— Auditify

## Onboarding email — $69/mo agency (white-label)

Subject: Your white-label reports are set up — one thing I need from you

Hi {name},

Your Auditify agency plan is active. Every report you generate can be
exported as a white-label PDF under your brand.

To set that up, reply with:
1. Your agency name (as it should appear on the report)
2. Your brand color (hex code if you have one, e.g. #C93A1B)
3. Your logo (optional — PNG with transparent background works best)

Once I have those, your first white-label PDF goes out within a day.

— Auditify

## Manual fulfillment checklist (his runbook)

**Trigger:** Paddle's "New sale" email arrives.

1. Note buyer email + plan (one-time / monitoring / agency).
2. One-time $15: verify in buyer's dashboard that the credit attached to
   their scan (entitlements endpoint already auto-records it — this is just
   a sanity check the first few times). Send the $15 onboarding email.
3. Monitoring $12/mo: schedule a weekly reminder to run a fresh scan of the
   buyer's site and email the report. Keep sending each billing period until
   they cancel.
4. Agency $69/mo: send the agency onboarding email; when they reply with
   name + brand color (+ logo), generate the white-label PDF from their scan
   and email it. Repeat per billing period.

**Still pending items (not his to do now):** delete test Firebase account,
delete 100% Paddle test coupon, confirm Payoneer email matches his own name,
delete leftover auditify CNAME, create 5% 'next purchase' coupon.
