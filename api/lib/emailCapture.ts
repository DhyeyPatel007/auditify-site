/**
 * Email capture storage — Auditify.
 *
 * Architecture: one small provider interface. Tonight we ship with the
 * stub provider (no credentials needed, nothing is sent anywhere). In the
 * morning, the user pastes the email-service API credentials into Vercel
 * env vars (see EMAIL_CAPTURE.md) and flips on the external provider —
 * the rest of the code (endpoint + UI) doesn't change.
 *
 * Env vars (all optional tonight, required for the external provider):
 *   EMAIL_SERVICE_API_KEY  — secret key from the email service (morning)
 *   EMAIL_SERVICE_LIST_ID  — the list/audience ID to subscribe emails to (morning)
 *   EMAIL_SERVICE_API_URL  — base URL of the service's subscribe endpoint (morning,
 *                            optional; only used once the provider above is filled in)
 */

/** One captured email + the scan context it came from. */
export type CaptureRecord = {
  email: string;
  url: string; // full scanned URL as entered
  host: string; // bare hostname
  score: number; // 0–100
  grade: string; // A–F
  capturedAt: string; // ISO timestamp
  source: string; // e.g. "free-scan-results"
};

/** Provider contract. `isConfigured()` must be cheap and synchronous. */
export interface EmailCaptureProvider {
  /** Human name used in logs ("stub" / "external-email-service"). */
  name: string;
  /** True only when this provider is ready to accept records. */
  isConfigured(): boolean;
  /** Persist one record. Must never throw sensitive data into the message. */
  capture(record: CaptureRecord): Promise<void>;
}

// ---------------------------------------------------------------------------
// Stub provider (tonight's default — no credentials, no external calls)
// ---------------------------------------------------------------------------

/**
 * Holds captures in-memory for the lifetime of the function instance and
 * always logs them to stdout so they are recoverable from Vercel's function
 * logs. On Vercel serverless, memory does NOT persist across instances —
 * this is a preview-grade holding pen only. It is honest: it never claims
 * to be a mailing list.
 */
const stubBuffer: CaptureRecord[] = [];
const STUB_BUFFER_MAX = 200;

export class StubCaptureProvider implements EmailCaptureProvider {
  readonly name = "stub";

  isConfigured(): boolean {
    return true; // the stub is always "ready"; it stores locally
  }

  async capture(record: CaptureRecord): Promise<void> {
    stubBuffer.push(record);
    if (stubBuffer.length > STUB_BUFFER_MAX) stubBuffer.splice(0, stubBuffer.length - STUB_BUFFER_MAX);
    // Vercel keeps function logs — emails stay retrievable until the
    // external provider is wired in. Never logs anything besides the record.
    console.log(`[email-capture/stub] saved ${record.email} (host=${record.host} score=${record.score})`);
  }
}

// ---------------------------------------------------------------------------
// External provider slot (morning: paste credentials, fill in the call)
// ---------------------------------------------------------------------------

/**
 * Production slot for the real email service (newsletter/marketing tool).
 *
 * Status tonight: DELIBERATELY UNWIRED. It activates only when both
 * EMAIL_SERVICE_API_KEY and EMAIL_SERVICE_LIST_ID are set in the Vercel
 * project env vars. Once the user tells us which service it is (morning),
 * replace the TODO body of `capture()` below with that service's subscribe
 * API call — everything upstream (validation, rate limiting, UI copy)
 * already works unchanged.
 */
export class ExternalEmailServiceProvider implements EmailCaptureProvider {
  readonly name = "external-email-service";

  private apiKey(): string | undefined {
    const v = process.env.EMAIL_SERVICE_API_KEY;
    return v && v.trim() ? v.trim() : undefined;
  }

  private listId(): string | undefined {
    const v = process.env.EMAIL_SERVICE_LIST_ID;
    return v && v.trim() ? v.trim() : undefined;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey() && this.listId());
  }

  async capture(record: CaptureRecord): Promise<void> {
    const apiKey = this.apiKey();
    const listId = this.listId();
    if (!apiKey || !listId) {
      throw new Error("External email service is not configured (EMAIL_SERVICE_API_KEY / EMAIL_SERVICE_LIST_ID).");
    }
    // `record` is consumed by the TODO implementation below once wired.
    void record;

    // ------------------------------------------------------------------
    // TODO (morning, ~10 lines): call the email service's subscribe API.
    // Example shape most services follow (adapt to the chosen provider):
    //
    //   const res = await fetch(`${process.env.EMAIL_SERVICE_API_URL}/subscribe`, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${apiKey}`,
    //     },
    //     body: JSON.stringify({
    //       email: record.email,
    //       list_id: listId,
    //       tags: ["auditify-free-scan"],
    //       metadata: { host: record.host, score: record.score, grade: record.grade },
    //     }),
    //   });
    //   if (!res.ok) throw new Error(`Email service responded ${res.status}`);
    //
    // Keep the key OUT of error messages and logs.
    // ------------------------------------------------------------------
    throw new Error(
      "ExternalEmailServiceProvider.capture() is not wired to a service yet — " +
        "see EMAIL_CAPTURE.md for the morning steps."
    );
  }
}

// ---------------------------------------------------------------------------
// Provider selection
// ---------------------------------------------------------------------------

const stub = new StubCaptureProvider();
const external = new ExternalEmailServiceProvider();

/** Returns the external provider when credentials exist, else the stub. */
export function getProvider(): EmailCaptureProvider {
  return external.isConfigured() ? external : stub;
}

/** True when a real email service is configured and will receive captures. */
export function isExternalServiceLive(): boolean {
  return external.isConfigured();
}
