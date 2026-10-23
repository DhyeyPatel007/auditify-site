/**
 * Shared server-side authentication: Firebase ID-token verification.
 * Used by /api/scan, /api/monitored, and /api/history.
 * (Paddle entitlements lived here until payments were removed on
 * 2026-10-23 — full reports are now free for any signed-in user.)
 */

import { createPublicKey, verify } from "node:crypto";

export const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  "auditify-74fad";

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

export async function googleCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("Could not fetch Google certs.");
  const certs = (await res.json()) as Record<string, string>;
  certCache = { certs, expiresAt: Date.now() + 55 * 60 * 1000 };
  return certs;
}

export function b64url(input: string): Buffer {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export async function verifyFirebaseToken(
  idToken: string
): Promise<{ uid: string; email: string }> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed token.");

  const header = JSON.parse(b64url(parts[0]).toString("utf8")) as {
    kid?: string;
    alg?: string;
  };
  const payload = JSON.parse(b64url(parts[1]).toString("utf8")) as {
    aud?: string;
    iss?: string;
    sub?: string;
    email?: string;
    exp?: number;
  };

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unexpected token algorithm.");
  }

  const cert = (await googleCerts())[header.kid];
  if (!cert) throw new Error("Unknown signing key.");

  const key = createPublicKey(cert);
  const signed = Buffer.from(`${parts[0]}.${parts[1]}`);
  if (!verify("RSA-SHA256", signed, key, b64url(parts[2]))) {
    throw new Error("Bad token signature.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error("Token not for this project.");
  }
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error("Bad token issuer.");
  }
  if (typeof payload.exp !== "number" || payload.exp < now) {
    throw new Error("Token expired.");
  }
  if (!payload.sub || typeof payload.email !== "string" || !payload.email) {
    throw new Error("Token has no identity.");
  }

  return { uid: payload.sub, email: payload.email };
}
