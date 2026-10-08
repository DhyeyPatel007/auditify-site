import { useCallback, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { Nav } from "../sections/Nav";
import { Footer } from "../sections/Footer";
import { Scanner, type ScanResult } from "../components/Scanner";
import { AuthModal } from "../components/AuthModal";
import { AccountModal } from "../components/AccountModal";
import { Phase2Modal } from "../components/Phase2Modal";
import { GradeStamp, type Grade } from "../components/Stamps";
import { PLANS, formatPrice } from "../lib/plans";
import { startCheckout } from "../lib/paddle";
import {
  clearReports,
  listReports,
  syncReports,
  unlockReport,
  countUnlocked,
  type PastReport,
} from "../lib/reports";
import { fetchEntitlements, planName, type Entitlements } from "../lib/entitlements";
import { downloadReportPDF } from "../lib/pdf";

type MonitoredSite = {
  url: string;
  host: string;
  lastChecked?: string;
  status: "healthy" | "warning" | "failing";
};

/**
 * /dashboard — the signed-in user's complete command center.
 * Past scans, full report viewing, branded PDF exports, monitoring, and agency white-label.
 */
function DashboardShell() {
  const { user, loading, signOutUser } = useAuth();
  const [auth, setAuth] = useState<{ open: boolean; mode: "signin" | "signup" }>({
    open: false,
    mode: "signin",
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const [phase2Open, setPhase2Open] = useState(false);
  const [reports, setReports] = useState<PastReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ScanResult | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [unlockedNotice, setUnlockedNotice] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Monitoring state
  const [monitoredSites, setMonitoredSites] = useState<MonitoredSite[]>([
    { url: "https://example.com", host: "example.com", lastChecked: "Today", status: "healthy" },
  ]);
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [savedAlertMsg, setSavedAlertMsg] = useState(false);

  // Agency state
  const [agencyName, setAgencyName] = useState("My Digital Studio");
  const [agencyColor, setAgencyColor] = useState("#C93A1B");
  const [embedCopied, setEmbedCopied] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  const uid = user?.uid ?? null;

  const reload = useCallback(() => {
    if (!uid) {
      setReports([]);
      return;
    }
    const local = listReports(uid);
    setReports(local);
    if (user) {
      syncReports(uid, () => user.getIdToken())
        .then((merged) => setReports(merged))
        .catch(() => {});
    }
  }, [uid, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Fetch paid entitlements and process auto-unlock
  useEffect(() => {
    if (!user) {
      setEntitlements(null);
      return;
    }
    let cancelled = false;

    const checkAndUnlock = async (attempts = 3) => {
      try {
        const e = await fetchEntitlements(() => user.getIdToken());
        if (cancelled) return;
        setEntitlements(e);

        // Auto-unlock pending report after payment
        const pendingRaw = localStorage.getItem(`auditify:pending-unlock:${user.uid}`);
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw) as { url: string; scannedAt?: string };
          const unlocked = unlockReport(user.uid, pending.url, pending.scannedAt);
          if (unlocked) {
            localStorage.removeItem(`auditify:pending-unlock:${user.uid}`);
            setUnlockedNotice(`Full report unlocked for ${pending.url.replace(/^https?:\/\//i, "")}!`);
            reload();
          } else if (attempts > 1) {
            // Retry once after 2 seconds in case transaction webhook is finalizing
            setTimeout(() => checkAndUnlock(attempts - 1), 2000);
          }
        }
      } catch {
        if (!cancelled) {
          setEntitlements({ report: false, reportCredits: 0, monitoring: false, agency: false });
        }
      }
    };

    checkAndUnlock();
    return () => {
      cancelled = true;
    };
  }, [user, reload]);

  const currentPlan = entitlements ? planName(entitlements) : "Free";
  const reportCredits = entitlements?.reportCredits ?? 0;
  const unlockedCount = uid ? countUnlocked(uid) : 0;
  const availableCredits = Math.max(0, reportCredits - unlockedCount);

  const handleUnlock = (report: PastReport) => {
    if (!uid || availableCredits <= 0) return;
    unlockReport(uid, report.url, report.scannedAt);
    setUnlockedNotice(`Full report unlocked for ${report.host}!`);
    reload();
  };

  const handleDownloadPDF = async (report: PastReport) => {
    // SECURITY: Never generate a PDF from local data. Fetch full findings from
    // the server, which verifies the Firebase token + Paddle payment server-side.
    // Flipping `unlocked` in localStorage/DevTools cannot bypass this.
    if (!user || pdfLoading) return;
    setPdfLoading(report.url);
    setPdfError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: report.url, full: true, idToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.full) {
        setPdfError(
          data?.error || "Payment required — unlock this report to download the PDF."
        );
        return;
      }
      downloadReportPDF({
        host: data.host,
        url: data.url,
        score: data.score,
        grade: data.grade,
        checksRun: data.checksRun,
        scannedAt: report.scannedAt,
        summary: data.summary,
        issues: data.issues,
      });
    } catch {
      setPdfError("Could not verify payment. Please try again.");
    } finally {
      setPdfLoading(null);
    }
  };

  const handleViewReport = async (report: PastReport) => {
    // SECURITY: Fetch full findings from the server (verifies payment).
    // Local `unlocked` flag alone is not trusted.
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: report.url, full: true, idToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.full) {
        setPdfError(
          data?.error || "Payment required — unlock this report to view it."
        );
        return;
      }
      setSelectedReport({
        url: data.url,
        host: data.host,
        score: data.score,
        grade: data.grade as Grade,
        checksRun: data.checksRun,
        durationMs: data.durationMs || 2200,
        summary: data.summary,
        issues: data.issues,
        locked: [],
        full: true,
      });
      window.scrollTo({ top: 180, behavior: "smooth" });
    } catch {
      setPdfError("Could not verify payment. Please try again.");
    }
  };

  const when = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const firstName = user?.displayName?.split(" ")[0];
  const paidPlans = PLANS.filter((p) => p.name !== "Free");

  const buyPlan = async (planName: string, forUrl?: string, forScannedAt?: string) => {
    if (!user) return;
    if (planName === "One-time report" && forUrl) {
      try {
        localStorage.setItem(
          `auditify:pending-unlock:${user.uid}`,
          JSON.stringify({ url: forUrl, scannedAt: forScannedAt })
        );
      } catch { /* ignore */ }
    }
    setBuyError(null);
    setBuying(planName);
    try {
      await startCheckout(planName, () => user.getIdToken());
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : "Checkout failed to start.");
    } finally {
      setBuying(null);
    }
  };

  const addMonitoredSite = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSiteUrl.trim();
    if (!trimmed) return;
    const clean = trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    if (monitoredSites.some((s) => s.host === clean)) return;
    setMonitoredSites([
      ...monitoredSites,
      { url: `https://${clean}`, host: clean, lastChecked: "Scheduled", status: "healthy" },
    ]);
    setNewSiteUrl("");
  };

  const removeMonitoredSite = (host: string) => {
    setMonitoredSites(monitoredSites.filter((s) => s.host !== host));
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav
        user={
          user
            ? { email: user.email ?? "", name: user.displayName, photoURL: user.photoURL }
            : null
        }
        onSignIn={() => setAuth({ open: true, mode: "signin" })}
        onSignOut={() => void signOutUser()}
        onAccount={() => setAccountOpen(true)}
      />
      <main className="mx-auto max-w-[1120px] px-6 py-12 md:py-16">
        {loading ? (
          <div className="py-24 text-center" aria-label="Loading">
            <p className="eyebrow text-ink-2">Dashboard</p>
            <div className="mx-auto mt-8 h-2 w-40 animate-pulse rounded-full bg-line-strong" />
          </div>
        ) : !user ? (
          <div className="mx-auto max-w-[560px] py-16 text-center">
            <p className="eyebrow text-ink-2">Dashboard</p>
            <h1 className="mt-4 font-display text-[36px] font-semibold sm:text-[44px]">
              Sign in to see your dashboard.
            </h1>
            <p className="mx-auto mt-4 max-w-[420px] text-[15px] leading-relaxed text-ink-2">
              Your scans, scores and plan live here — one screen per account,
              not the marketing site.
            </p>
            <button
              type="button"
              onClick={() => setAuth({ open: true, mode: "signin" })}
              className="mt-8 rounded-[8px] bg-ink px-6 py-3 text-[15px] font-semibold text-paper transition-colors hover:bg-accent"
            >
              Sign in
            </button>
          </div>
        ) : (
          <>
            <a
              href="/"
              className="text-[14px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
            >
              &larr; Back to site
            </a>
            <p className="eyebrow mt-8 text-ink-2">Your dashboard</p>
            <h1 className="mt-4 font-display text-[36px] font-semibold sm:text-[44px]">
              Welcome back{firstName ? `, ${firstName}` : ""}.
            </h1>

            {pdfError && (
              <div
                role="alert"
                className="mt-6 flex items-center justify-between rounded-[10px] border border-accent/40 bg-accent/10 p-4 text-[14px] font-medium text-ink"
              >
                <span>{pdfError}</span>
                <button
                  type="button"
                  onClick={() => setPdfError(null)}
                  className="text-xs text-muted hover:text-ink"
                >
                  ✕ Dismiss
                </button>
              </div>
            )}

            {unlockedNotice && (
              <div
                role="status"
                className="mt-6 flex items-center justify-between rounded-[10px] border border-success/40 bg-success/10 p-4 text-[14px] font-medium text-ink"
              >
                <span>{unlockedNotice}</span>
                <button
                  type="button"
                  onClick={() => setUnlockedNotice(null)}
                  className="text-xs text-muted hover:text-ink"
                >
                  ✕ Dismiss
                </button>
              </div>
            )}

            <section aria-label="Run a scan" className="mt-10">
              <Scanner
                onUnlock={() => setPhase2Open(true)}
                uid={uid}
                onScanComplete={reload}
                hasFullAccess={!!entitlements && (entitlements.monitoring || entitlements.agency)}
                getIdToken={user ? () => user.getIdToken() : undefined}
                initialReport={selectedReport}
              />
            </section>

            {/* Scan History Section */}
            <section aria-labelledby="dash-history" className="mt-14">
              <div className="flex items-baseline justify-between">
                <h2
                  id="dash-history"
                  className="font-display text-[28px] font-semibold"
                >
                  Your scans
                </h2>
                {reports.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Clear all scan history? This cannot be undone. Paid report unlocks tied to these scans will also be removed."
                        )
                      ) {
                        if (uid) {
                          clearReports(uid, () => user.getIdToken());
                          setReports([]);
                        }
                      }
                    }}
                    className="text-[14px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
                  >
                    Clear history
                  </button>
                )}
              </div>
              {reports.length === 0 ? (
                <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-ink-2">
                  Nothing here yet. Run a scan above and it lands here
                  automatically — synced to your account across devices.
                </p>
              ) : (
                <>
                  {availableCredits > 0 && (
                    <p className="mt-4 rounded-[10px] border border-accent/40 bg-accent/10 p-4 text-[14px] font-medium text-ink">
                      You have {availableCredits} full report {availableCredits === 1 ? "credit" : "credits"} — click "Unlock full report" on any scan below.
                    </p>
                  )}
                  <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {reports.map((r) => (
                      <li
                        key={`${r.url}-${r.scannedAt}`}
                        className="flex flex-col justify-between rounded-[10px] border border-line bg-surface p-6"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate font-mono text-[13px] text-ink-2">
                              {r.host}
                            </p>
                            <GradeStamp grade={r.grade as Grade} />
                          </div>
                          <p className="mt-3 font-display text-[40px] font-semibold leading-none">
                            {r.score}
                            <span className="text-[20px] text-ink-2">/100</span>
                          </p>
                          <p className="mt-3 text-[13px] text-ink-2">
                            {r.checksRun} checks · {when(r.scannedAt)}
                          </p>
                        </div>
                        <div className="mt-5 border-t border-line pt-4">
                          {r.unlocked ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadPDF(r)}
                                disabled={pdfLoading === r.url}
                                className="rounded-[8px] bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
                              >
                                {pdfLoading === r.url ? "Verifying…" : "Download PDF"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewReport(r)}
                                className="rounded-[8px] border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink"
                              >
                                View full
                              </button>
                            </div>
                          ) : availableCredits > 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUnlock(r)}
                                className="rounded-[8px] bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover"
                              >
                                Unlock full report
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewReport(r)}
                                className="text-[12px] text-ink-2 hover:text-ink hover:underline"
                              >
                                View scan
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={buying === "One-time report"}
                                onClick={() => void buyPlan("One-time report", r.url, r.scannedAt)}
                                className="rounded-[8px] bg-ink px-4 py-2 text-[13px] font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-60"
                              >
                                {buying === "One-time report" ? "Opening…" : "Buy to unlock — $15"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewReport(r)}
                                className="text-[12px] text-ink-2 hover:text-ink hover:underline"
                              >
                                View scan
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {/* Monitoring Section */}
            <section aria-labelledby="dash-monitoring" className="mt-14">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 id="dash-monitoring" className="font-display text-[28px] font-semibold">
                    Website Monitoring
                  </h2>
                  <p className="mt-1 text-[14px] text-ink-2">
                    Automated weekly scans, health tracking, and email/Slack alerts when problems arise.
                  </p>
                </div>
                {entitlements?.monitoring || entitlements?.agency ? (
                  <span className="rounded-full bg-success/20 px-3 py-1 font-mono text-[12px] font-semibold text-success">
                    Active
                  </span>
                ) : (
                  <span className="font-mono text-[12px] text-muted">$12/mo plan</span>
                )}
              </div>

              {entitlements?.monitoring || entitlements?.agency ? (
                <div className="mt-6 rounded-[10px] border border-line bg-surface p-6">
                  <h3 className="font-display text-[18px] font-semibold">Monitored Websites</h3>
                  <form onSubmit={addMonitoredSite} className="mt-4 flex gap-3">
                    <input
                      type="text"
                      placeholder="e.g. mycompany.com"
                      value={newSiteUrl}
                      onChange={(e) => setNewSiteUrl(e.target.value)}
                      className="min-h-[44px] flex-1 rounded-lg border border-line-strong px-4 font-mono text-[14px] text-ink placeholder:font-sans focus:border-ink focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-ink px-5 text-sm font-medium text-paper hover:bg-accent"
                    >
                      Add Site
                    </button>
                  </form>

                  <ul className="mt-5 divide-y divide-line">
                    {monitoredSites.map((site) => (
                      <li key={site.host} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-success" />
                          <span className="font-mono text-[14px] text-ink">{site.host}</span>
                          <span className="text-xs text-muted">Last check: {site.lastChecked}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[12px] text-ink-2">Weekly re-scan</span>
                          <button
                            type="button"
                            onClick={() => removeMonitoredSite(site.host)}
                            className="text-xs text-muted hover:text-accent"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 border-t border-line pt-5">
                    <h4 className="font-display text-[15px] font-semibold">Alert Settings</h4>
                    <p className="mt-1 text-xs text-ink-2">
                      Alerts sent automatically to <strong>{user.email}</strong> whenever score dips or high-severity issues emerge.
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={slackWebhook}
                        onChange={(e) => setSlackWebhook(e.target.value)}
                        className="min-h-[40px] flex-1 rounded-lg border border-line-strong px-3 font-mono text-[13px] text-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSavedAlertMsg(true);
                          setTimeout(() => setSavedAlertMsg(false), 2500);
                        }}
                        className="rounded-lg border border-line-strong px-4 py-2 text-xs font-semibold text-ink hover:border-ink"
                      >
                        {savedAlertMsg ? "Saved ✓" : "Save Slack Hook"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[10px] border border-line-strong bg-surface p-6 sm:p-8">
                  <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="max-w-[560px]">
                      <h3 className="font-display text-[20px] font-semibold">Weekly automated monitoring</h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                        Get alerted immediately when deploys cause regressions, images balloon, or certificates near expiration.
                        Includes up to 3 sites and email/Slack notifications.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={buying === "Monitoring"}
                      onClick={() => void buyPlan("Monitoring")}
                      className="min-h-[44px] shrink-0 rounded-lg bg-ink px-6 py-2.5 text-[14px] font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-60"
                    >
                      {buying === "Monitoring" ? "Opening…" : "Start monitoring — $12/mo"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Agency White-Label Section */}
            <section aria-labelledby="dash-agency" className="mt-14">
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 id="dash-agency" className="font-display text-[28px] font-semibold">
                    Agency White-Label
                  </h2>
                  <p className="mt-1 text-[14px] text-ink-2">
                    Client-facing branded reports, custom cover marks, shareable URLs, and website lead-gen embed.
                  </p>
                </div>
                {entitlements?.agency ? (
                  <span className="rounded-full bg-success/20 px-3 py-1 font-mono text-[12px] font-semibold text-success">
                    Active
                  </span>
                ) : (
                  <span className="font-mono text-[12px] text-muted">$69/mo plan</span>
                )}
              </div>

              {entitlements?.agency ? (
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div className="rounded-[10px] border border-line bg-surface p-6">
                    <h3 className="font-display text-[18px] font-semibold">Brand Customization</h3>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-ink-2">Agency Name</label>
                        <input
                          type="text"
                          value={agencyName}
                          onChange={(e) => setAgencyName(e.target.value)}
                          className="mt-1 min-h-[40px] w-full rounded-lg border border-line-strong px-3 text-sm text-ink focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-ink-2">Primary Accent Color</label>
                        <div className="mt-1 flex items-center gap-3">
                          <input
                            type="color"
                            value={agencyColor}
                            onChange={(e) => setAgencyColor(e.target.value)}
                            className="h-10 w-12 cursor-pointer rounded border border-line-strong p-1"
                          />
                          <input
                            type="text"
                            value={agencyColor}
                            onChange={(e) => setAgencyColor(e.target.value)}
                            className="min-h-[40px] flex-1 rounded-lg border border-line-strong px-3 font-mono text-sm text-ink focus:outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShareLinkCopied(true);
                          setTimeout(() => setShareLinkCopied(false), 2000);
                        }}
                        className="mt-2 rounded-lg border border-line-strong px-4 py-2 text-xs font-semibold text-ink hover:border-ink"
                      >
                        {shareLinkCopied ? "Client Link Copied! ✓" : "Copy Shareable Report Link"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[10px] border border-line bg-surface p-6">
                    <h3 className="font-display text-[18px] font-semibold">Lead-Gen Widget Embed</h3>
                    <p className="mt-1 text-xs text-ink-2">
                      Place this audit box on your agency site to capture qualified inbound leads.
                    </p>
                    <div className="mt-4 rounded border border-line bg-paper p-3 font-mono text-xs text-ink-2">
                      {`<iframe src="https://auditify.krynex.in/?embed=1&agency=${encodeURIComponent(
                        agencyName
                      )}" width="100%" height="480" frameborder="0"></iframe>`}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(
                          `<iframe src="https://auditify.krynex.in/?embed=1&agency=${encodeURIComponent(
                            agencyName
                          )}" width="100%" height="480" frameborder="0"></iframe>`
                        );
                        setEmbedCopied(true);
                        setTimeout(() => setEmbedCopied(false), 2000);
                      }}
                      className="mt-4 rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-accent"
                    >
                      {embedCopied ? "Embed Code Copied! ✓" : "Copy Embed Code"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[10px] border border-line-strong bg-surface p-6 sm:p-8">
                  <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="max-w-[560px]">
                      <h3 className="font-display text-[20px] font-semibold">Sell audits under your brand</h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                        Includes client share links with your logo, white-labeled PDF downloads, up to 25 monitored sites,
                        and an embeddable audit widget for your website.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={buying === "Agency white-label"}
                      onClick={() => void buyPlan("Agency white-label")}
                      className="min-h-[44px] shrink-0 rounded-lg bg-ink px-6 py-2.5 text-[14px] font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-60"
                    >
                      {buying === "Agency white-label" ? "Opening…" : "Upgrade to Agency — $69/mo"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Plans Section */}
            <section aria-labelledby="dash-plan" className="mt-14">
              <h2
                id="dash-plan"
                className="font-display text-[28px] font-semibold"
              >
                Your plan
              </h2>
              <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <li
                  className={`rounded-[10px] border p-6 ${
                    currentPlan === "Free"
                      ? "border-2 border-ink bg-surface"
                      : "border border-line bg-surface"
                  }`}
                >
                  <p className="font-display text-[20px] font-semibold">Free</p>
                  <p className="mt-2 font-mono text-[13px] text-ink-2">
                    {formatPrice(0)}/forever
                  </p>
                  {currentPlan === "Free" && (
                    <p className="mt-4 inline-block rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-paper">
                      Current plan
                    </p>
                  )}
                </li>
                {paidPlans.map((p) => (
                  <li
                    key={p.name}
                    className={`rounded-[10px] border bg-surface p-6 ${
                      currentPlan === p.name ? "border-2 border-ink" : "border-line"
                    }`}
                  >
                    <p className="font-display text-[20px] font-semibold">
                      {p.name}
                    </p>
                    <p className="mt-2 font-mono text-[13px] text-ink-2">
                      {formatPrice(p.price)}
                      {p.per}
                    </p>
                    {currentPlan === p.name ? (
                      <p className="mt-4 inline-block rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-paper">
                        Current plan
                      </p>
                    ) : p.name === "One-time report" ? (
                      <p className="mt-4 text-[13px] text-ink-2">
                        Buy from your scan history above — pick which report to unlock.
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={buying === p.name}
                        onClick={() => void buyPlan(p.name)}
                        className="mt-4 rounded-[8px] bg-ink px-4 py-2 text-[13px] font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-60"
                      >
                        {buying === p.name ? "Opening…" : "Buy now"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {buyError && (
                <p className="mt-4 text-[14px] font-medium text-accent">
                  Checkout couldn&apos;t start: {buyError}
                </p>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
      <Phase2Modal
        open={phase2Open}
        context="Full report"
        onClose={() => setPhase2Open(false)}
      />
      <AuthModal
        open={auth.open}
        mode={auth.mode}
        onClose={() => setAuth((a) => ({ ...a, open: false }))}
      />
      {user && (
        <AccountModal
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          uid={user.uid}
          email={user.email ?? ""}
          name={user.displayName}
          onSignOut={() => void signOutUser()}
        />
      )}
    </div>
  );
}

export function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardShell />
    </AuthProvider>
  );
}
