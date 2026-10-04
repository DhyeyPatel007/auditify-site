# Email capture — setup & morning checklist

The scan-results page shows a small "Get this report by email" card. Submitting
it POSTs `{ email, url, score, grade }` to `/api/capture`, which validates the
email and stores the record through a provider (`api/lib/emailCapture.ts`).

## What's live tonight

- UI: `src/components/EmailCapture.tsx`, rendered in the free-scan results
  (`src/components/Scanner.tsx`). Optional, never blocks the scan.
- Endpoint: `api/capture.ts` — validates email + URL, rate-limits (10 tries /
  10 min per IP), stores via the active provider.
- Provider: **stub**. Records are logged to the Vercel function logs and held
  in memory (not durable across instances). Nothing is emailed anywhere.
- Copy is honest: the saved state says the report arrives **"shortly after
  launch"** — we never claim "check your inbox".

## Morning: connect the email service (you supply the credentials)

1. In the Vercel dashboard: project **auditify-site** → Settings →
   **Environment Variables**. Add:
   - `EMAIL_SERVICE_API_KEY` = the secret API key from your email service
     (newsletter/marketing tool — never commit this to the repo)
   - `EMAIL_SERVICE_LIST_ID` = the list / audience ID emails should join
   - `EMAIL_SERVICE_API_URL` = (optional) the service's subscribe endpoint,
     only if the provider below needs it
2. Apply to the same environment the site deploys from (Production, or
   Preview if testing this branch). **Redeploy** after adding vars — Vercel
   only picks up new env vars on a fresh deployment.
3. Tell me which email service it is. In
   `api/lib/emailCapture.ts`, class `ExternalEmailServiceProvider`, fill in
   the ~10-line `capture()` body with that service's subscribe API call —
   there's a marked TODO with the standard shape. No other file changes.

When both env vars are set, `getProvider()` switches from the stub to the
real service automatically. If the vars are missing, the stub stays active
and nothing breaks.

## Reading tonight's captures

Vercel dashboard → project → Logs, filter for `[email-capture/stub]`.
Each saved capture prints `email`, `host`, and `score`. Copy them into the
email service in the morning as needed.
