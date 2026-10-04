# neverssl.com — scanner crash diagnosis
Date: 2026-10-05 ~00:06 IST. Probed from sandbox VM (outbound via egress proxy; TCP connects in <1ms — timings below include proxy).

## Probe 1 — GET / (full headers)
```
$ curl -s -D - --max-time 15 -o /tmp/nv.html -w "\nHTTP:%{http_code} SIZE:%{size_download} TIME:%{time_total} REDIRECTS:%{num_redirects}\n" http://neverssl.com/
HTTP/1.1 200 OK
Date: Sun, 04 Oct 2026 18:36:07 GMT
Server: Apache/2.4.68 ()
Content-Type: text/html; charset=UTF-8
Vary: Accept-Encoding
Last-Modified: Wed, 29 Jun 2022 00:23:33 GMT
ETag: "f79-5e28b29d38e93"
Accept-Ranges: bytes
Connection: close
Content-Length: 3961


HTTP:200 SIZE:3961 TIME:2.548311 REDIRECTS:0
```
Notes: zero redirects (http-only site, no https upgrade). `Connection: close` on EVERY response (no keep-alive). No security headers at all (no HSTS/CSP/X-Frame-Options/etc.). Server version disclosed: Apache/2.4.68.

## Probe 2 — HEAD /
```
HTTP/1.1 200 OK
Date: Sun, 04 Oct 2026 18:36:11 GMT
Server: Apache/2.4.68 ()
Content-Type: text/html; charset=UTF-8
Vary: Accept-Encoding
Last-Modified: Wed, 29 Jun 2022 00:23:33 GMT
ETag: "f79-5e28b29d38e93"
Accept-Ranges: bytes
Content-Length: 3961
Connection: close


HTTP:200 TIME:1.260473
```
HEAD works fine when the server is responsive.

## Probe 3 — exposed-file probes
```
$ curl -s --max-time 10 http://neverssl.com/.env -o /dev/null -w "env HTTP:%{http_code} TIME:%{time_total}\n"
env HTTP:000 TIME:10.002264        # full timeout, zero bytes

$ curl -s --max-time 10 http://neverssl.com/.git/HEAD -o /dev/null -w "git HTTP:%{http_code} TIME:%{time_total}\n"
git HTTP:404 TIME:1.248915          # fast 404 on first try…
```
Retest of `/.env` with timing breakdown:
```
retry-env HTTP:000 T_conn:0.000861 T_start:0.000000 T_total:8.001018
```
TCP connects instantly, then the server NEVER sends a single byte — hangs until client timeout. (curl exit 28.)

## Probe 4 — body
- `wc -c /tmp/nv.html` → 3961 bytes. `file` → "HTML document, Unicode text, UTF-8 text".
- Null bytes: **0** (`tr -cd '\0' | wc -c`). (An earlier `grep -c $'\x00'` printed 131 due to shell quoting — corrected, authoritative count is 0.)
- First 600 bytes: plain `<html><head><title>NeverSSL - Connecting ...` + inline CSS. Nothing unusual.

## Probe 5 — unknown path
```
$ curl -s --max-time 10 "http://neverssl.com/auditify-probe-xyz123" -o /dev/null -w "junk HTTP:%{http_code}\n"
junk HTTP:000                       # hangs to timeout, same as /.env
```

## Probe 6 — binary check
```
$ curl -s --max-time 10 http://neverssl.com/ | od -c | head -5
0000000   <   h   t   m   l   >  \n  \t   <   h   e   a   d   >  \n  \t
...clean ASCII throughout the head; no binary/non-UTF8 bytes.
```

## Probe 7 — path sweep (flakiness map)
```
$ for p in "/auditify-probe-xyz123" "/.git/HEAD" "/index.html" "/?x=1" "/nonexistent-page-abc"; do ...
/auditify-probe-xyz123 -> HTTP:000 T_start:0.000000 T_total:6.002367
/.git/HEAD             -> HTTP:000 T_start:0.000000 T_total:6.002534   # was fast-404 minutes earlier!
/index.html            -> HTTP:200 T_start:3.577960 T_total:3.578388  # valid page, 3.6s TTFB
/?x=1                 -> HTTP:000 T_start:0.000000 T_total:6.002660
/nonexistent-page-abc  -> HTTP:000 T_start:0.000000 T_total:6.001552
```
Same path (`/.git/HEAD`) returned a fast 404 once and hung the next time — behavior is nondeterministic. Valid pages can take 3.5s+ to first byte.

## Probe 8 — HTTPS on 443
```
$ curl -s --max-time 8 -o /dev/null -w "https -> HTTP:%{http_code} ..." https://neverssl.com/
https -> HTTP:000 T_start:5.696486 T_total:5.696506     # curl exit 52: Empty reply from server
```
Port 443 accepts TCP then sends nothing — no TLS at all. TLS handshake just stalls ~6s then dies.

## Diagnosis for the scanner
The crash/hang is **network behavior, not body parsing** (body is clean UTF-8, no null bytes).
1. Unknown paths (404s, `/.env`, query strings) intermittently hang forever: connect OK, zero bytes back. Any probe without its own tight timeout (exposed-file checks, sampled broken links) stalls the scan.
2. Port 443 accepts connections but never speaks TLS (empty reply after ~6s) — TLS-version probes must timeout independently and record "no HTTPS", not throw.
3. `Connection: close` on every response + tiny/slow origin (2.5–3.6s TTFB, flaky under sequential load) — the client must tolerate closed/idle connections and not assume keep-alive.
4. No security headers and no redirects is expected-correct output (many "missing" findings), not an error.

## Hardening checklist
- Per-request timeout (8–10s) on EVERY outbound probe, including `/.env`, `/.git/HEAD`, and sampled link checks — not just the main fetch.
- Overall per-scan deadline so one hung host can't stall a worker.
- Treat empty TLS reply / ECONNRESET / `Connection: close` as completed observations, never as uncaught exceptions.
- Limit concurrency per target (origin seems to serve ~1 slow connection at a time; parallel probes hang).
