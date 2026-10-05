# Auth + Paddle setup checklist — needs the site owner's hands

Everything below is outside what automation can do: it needs logins only the
owner has. Until this is done, sign-in shows a graceful "being connected"
state and checkout stays "opens at launch" — nothing breaks.

## 1. Firebase project (free Spark plan — no card needed)

1. Go to https://console.firebase.google.com/ → **Add project** (skip Google Analytics).
2. In the project: **Build → Authentication → Get started**.
3. Enable two sign-in methods:
   - **Google** → enable, pick a support email.
   - **Email/Password** → enable.
4. **Authentication → Settings → Authorized domains** → add `auditify-site.vercel.app`.
5. **Project settings (gear) → General → Your apps → Web** (`</>`): register the
   app (nickname `auditify-site`), copy the `firebaseConfig` values.

## 2. Vercel environment variables

Vercel dashboard → project `auditify-site` → **Settings → Environment Variables**,
add these four (Production + Preview), then **redeploy**:

- `VITE_FIREBASE_API_KEY` — from the firebaseConfig
- `VITE_FIREBASE_AUTH_DOMAIN` — e.g. `your-project.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

After the redeploy, sign-in (Google button + email/password), the account menu,
logout, and the "My reports & plans" panel go live automatically — no code
changes needed.

## 3. Paddle products (after Paddle signup + identity verification)

Create 3 products in the Paddle dashboard:

| Product | Price |
|---|---|
| One-time full report | **$15** one-time |
| Monitoring | **$12** / month |
| Agency white-label | **$69** / month |

## 4. Paddle coupon codes (create these in the Paddle dashboard)

Create **two** coupons — you choose the actual codes (the site never hard-codes them):

| Offer | Discount | Usage |
|---|---|---|
| First purchase | 10% off | one-time use per customer |
| Next purchase | 5% off | one-time use per customer |

How it works once created: the pricing page advertises the offers, and the
checkout modal has a coupon-code box. The customer's typed code is passed
through to Paddle, which validates and applies it — Paddle is the source of
truth for the percentage and one-time-use enforcement. Nothing in the repo
needs to change when you create or rename codes.

## 5. Security note (action needed if the key is real)

On 2026-10-05 an automation run committed a **real-looking Firebase API key**
into `.env.example` (git history, commit `1980924`). It has been removed from
the current files. If that key belongs to a real Firebase project, rotate it:
Firebase console → Project settings → rotate/regenerate the Web API key, then
update the Vercel env var. Firebase web API keys are meant to be public-by-
design (restricted by authorized domain), but rotation is the safe move.
