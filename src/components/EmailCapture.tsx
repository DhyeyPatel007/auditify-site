import { useState } from "react";

type Props = {
  url: string;
  host: string;
  score: number;
  grade: string;
};

type CaptureState = "idle" | "saving" | "saved" | "error";

export function EmailCapture({ url, host, score, grade }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, url, score, grade }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.saved) {
        throw new Error(
          (data && data.error) ||
            "Couldn't save your email right now — try again in a moment."
        );
      }
      setState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your email right now.");
      setState("error");
    }
  }

  return (
    <section
      className="mt-6 rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_2px_rgba(28,25,21,0.05)]"
      aria-label="Get this report by email"
    >
      <div className="border-b border-line px-6 py-4">
        <p className="eyebrow text-ink-2">Keep this report</p>
      </div>
      <div className="px-6 py-6">
        <h3 className="font-display text-[22px] font-semibold text-ink">
          Get this report by email.
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          Optional. We&rsquo;ll email you a copy of this{" "}
          <span className="font-mono">{score}/100</span> audit of{" "}
          <span className="font-mono">{host}</span>. Skipping costs you nothing —
          your results stay on screen regardless.
        </p>

        {state === "saved" ? (
          <p className="mt-4 rounded-lg border border-line bg-surface-raised px-4 py-3 text-[14px] text-ink" role="status">
            <span className="font-semibold">Saved.</span>{" "}
            We&rsquo;ll send your report by email shortly after launch.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4" aria-label="Email capture">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="capture-email" className="sr-only">
                Email address
              </label>
              <input
                id="capture-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state === "saving"}
                className="h-[52px] flex-1 rounded-lg border border-line-strong bg-surface-raised px-4 font-mono text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={state === "saving" || !email.trim()}
                className="h-[52px] shrink-0 rounded-lg bg-ink px-7 text-[15px] font-medium text-paper transition-colors hover:bg-[#2A251F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state === "saving" ? "Saving…" : "Email me the report"}
              </button>
            </div>
            <p className="mt-3 text-[13px] text-ink-2">
              One email with your report. No spam, ever. See{" "}
              <a href="/privacy" className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                how we handle your data
              </a>
              .
            </p>
          </form>
        )}

        {state === "error" && error && (
          <p className="mt-3 text-[13px] text-accent" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
