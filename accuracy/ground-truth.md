# Scanner Accuracy — Ground Truth
Collected 2026-10-05 ~00:15 IST via curl/openssl from sandbox VM. Raw facts only, no interpretation.

## Environment caveats (read first)
- Outbound HTTPS goes through a sandbox egress proxy (CONNECT tunneling). For `example.com`, `www.google.com`, `github.com` the certificate observed is the proxy's MITM cert (`CN = Hatch Sandbox Egress CA`), NOT the origin's real cert. `krynex.in` and `auditify-site.vercel.app` returned their genuine origin certs.
- `curl ssl_verify_result=19` (self-signed cert in chain) was returned for EVERY host — this is environmental (proxy chain vs system CA), not a property of any site.
- Header capture used `curl -sI -L`; only the listed security headers were present (absence noted per URL).

---

## 1. https://example.com
a) Chain: single `HTTP/1.1 200 OK`, no redirects. Headers present: `Server: cloudflare`. ABSENT: strict-transport-security, content-security-policy, x-frame-options, x-content-type-options, referrer-policy, permissions-policy, x-powered-by, content-encoding.
b) Negotiated: TLSv1.3. Cert observed = proxy MITM cert (see caveats); real origin cert not visible from here.
c) `/.env` → 404 · `/robots.txt` → 404 · `/sitemap.xml` → 404 · `/favicon.ico` → 404. robots.txt body = the site's own HTML homepage (no real robots.txt).
d) n/a (https URL).
e) `<html lang=en>` · `<title>Example Domain</title>` · `<meta charset=utf-8>` · viewport present (`width=device-width,initial-scale=1`) · NO meta description in head · h1 count in fetched chunk: 0.

## 2. https://www.google.com
a) Chain: single `HTTP/1.1 200 OK`, no redirects. Headers present: `Server: gws` · `X-Frame-Options: SAMEORIGIN` · `Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-…' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp`. ABSENT: enforcing `content-security-policy`, strict-transport-security, x-content-type-options, referrer-policy, permissions-policy.
b) Negotiated: TLSv1.3. Cert observed = proxy MITM cert (see caveats).
c) `/.env` → 404 · `/robots.txt` → 200 (body starts `User-agent: *` / `User-agent: Yandex` / `Disallow: /search`…) · `/sitemap.xml` → 200 · `/favicon.ico` → 200.
d) n/a (https URL).
e) `<html lang="en">` · `<title>Google</title>` · meta description present (`Search the world's information, including webpages, images, videos and more…`) · charset via `http-equiv="Content-Type" content="text/html; charset=UTF-8"` · NO viewport meta in first 3000 chars · h1 count in chunk: 0.

## 3. https://github.com
a) Chain: single `HTTP/1.1 200 OK`, no redirects. Headers present: `Server: github.com` · `Strict-Transport-Security: max-age=31536000; includeSubdomains; preload` · `X-Frame-Options: deny` · `X-Content-Type-Options: nosniff` · `Referrer-Policy: origin-when-cross-origin, strict-origin-when-cross-origin` · enforcing `Content-Security-Policy: default-src 'none'; … frame-ancestors 'none'; …` (long policy). ABSENT: permissions-policy.
b) Negotiated: TLSv1.3. Cert observed = proxy MITM cert (see caveats).
c) `/.env` → 404 · `/robots.txt` → 200 (starts `# If you would like to crawl GitHub contact us via https://support.github.com…`) · `/sitemap.xml` → 406 · `/favicon.ico` → 200.
d) n/a (https URL).
e) `<html lang="en">` · `<meta charset="utf-8">` · NO `<title>` and NO meta description and NO viewport within first 3000 chars (head is importmap/preload heavy; title renders later) · h1 count in chunk: 0.

## 4. https://krynex.in
a) Chain: `HTTP/1.1 308 Permanent Redirect` → `Location: https://www.krynex.in/`, then `HTTP/1.1 200 OK`. BOTH hops: `Server: Vercel` · `Strict-Transport-Security: max-age=63072000` (no includeSubDomains, no preload). ABSENT on both hops: content-security-policy, x-frame-options, x-content-type-options, referrer-policy, permissions-policy.
b) Negotiated: TLSv1.3. Genuine origin cert: issuer `C=US, O=Let's Encrypt, CN=YR1`, SAN `DNS:*.krynex.in, DNS:krynex.in`, notBefore Sep 6 2026, notAfter Dec 5 2026.
c) On apex (all 308 → www): `/.env` → 308 · `/robots.txt` → 308 (body `Redirecting…`) · `/sitemap.xml` → 308 · `/favicon.ico` → 308.
d) n/a (https URL). Note: `http://krynex.in/` → `308` → `Location: https://krynex.in/`.
e) (after www redirect) `<html lang="en">` · `<title>KRYNEX STUDIO</title>` · meta description present (`An independent studio building unforgettable digital moments. Design, motion and engineering, orchestrated as one.`) · viewport present · `<meta charSet="utf-8"/>` · h1 count in first 3000 chars: 0.

## 5. https://auditify-site.vercel.app
a) Chain: single `HTTP/1.1 200 OK`, no redirects. Headers present: `Server: Vercel` · `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` · `X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy: camera=(), microphone=(), geolocation=()` · enforcing `Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'`.
b) Negotiated: TLSv1.3. Genuine origin cert: issuer `C=US, O=Google Trust Services, CN=WR1`, SAN `DNS:*.vercel.app`, notBefore Aug 29 2026, notAfter Nov 27 2026.
c) `/.env` → 404 · `/robots.txt` → 200 (body: `User-agent: *` / `Allow: /` / blank / `Sitemap: https://auditify-site.vercel.app/sitemap.xml`) · `/sitemap.xml` → 200 · `/favicon.ico` → 404.
d) n/a (https URL).
e) `<html lang="en">` · `<title>Auditify — A website audit you'll actually read</title>` · meta description present (`Auditify scans your website against 35+ checks — speed, SEO, accessibility, security — and hands you a plain-English stamped report. Free scan, no sign-up.`) · viewport present · `<meta charset="UTF-8" />` · h1 count in head chunk: 0 (h1 is client-rendered in body).

## 6. http://neverssl.com
a) Chain: single `HTTP/1.1 200 OK`, no redirects. Headers present: `Server: Apache/2.4.68 ()`. ABSENT: all six security headers.
b) n/a (plain http).
c) HEAD `/.env` → 000 (no response) · HEAD `/robots.txt` → 000 · HEAD `/sitemap.xml` → 000 · HEAD `/favicon.ico` → 200. GET `/robots.txt` returned a `404 Not Found` HTML page → robots.txt does not exist. (HEAD flakiness noted; GET works.)
d) Serves `200` over plain HTTP at `http://neverssl.com/` — NO redirect to HTTPS.
e) `<title>NeverSSL - Connecting ... </title>` · NO meta description, NO viewport, NO charset, NO lang attribute in head chunk · body contains `<h1>NeverSSL</h1>` plus an empty JS-filled `<h1 id="status">`.

## 7. http://example.com
a) Chain: single `HTTP/1.1 200 OK`, no redirects. Headers present: `Server: cloudflare`. ABSENT: all six security headers.
b) n/a (plain http).
c) `/.env` → 404 · `/robots.txt` → 404 · `/sitemap.xml` → 404 · `/favicon.ico` → 404.
d) Serves `200` over plain HTTP at `http://example.com/` — NO redirect to HTTPS.
e) Identical to https: `<html lang=en>`, `<title>Example Domain</title>`, charset utf-8, viewport present, no meta description, no h1.

## 8. https://expired.badssl.com
a) Proxy CONNECT succeeded, then TLS failed — NO HTTP response at all (`curl` → 000, even with `-k`).
b) Cert presented: issuer `C=GB, O=COMODO CA Limited, CN=COMODO RSA Domain Validation Secure Server CA`, subject `CN=*.badssl.com`, notBefore Apr 9 2015, notAfter **Apr 12 2015 23:59:59 GMT** → expired. Protocol reached TLSv1.2 in handshake but connection unusable.
c) `/.env`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico` → all 000.
d) n/a (https URL).
e) No content retrievable.
