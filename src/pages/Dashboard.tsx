import { useCallback, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { Nav } from "../sections/Nav";
import { Footer } from "../sections/Footer";
import { Scanner } from "../components/Scanner";
import { AuthModal } from "../components/AuthModal";
import { AccountModal } from "../components/AccountModal";
import { Phase2Modal } from "../components/Phase2Modal";
import { GradeStamp, type Grade } from "../components/Stamps";
import { PLANS, formatPrice } from "../lib/plans";
import { startCheckout } from "../lib/paddle";
import { clearReports, listReports, type PastReport } from "../lib/reports";
import { fetchEntitlements, planName, type Entitlements } from "../lib/entitlements";

/**
 * /dashboard — the signed-in user's own screen.
 * Past scans (this browser, tied to the account), a scan box, and the plan card.
 * Anonymous visitors get a sign-in gate, not the marketing page.
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
  const [buying, setBuying] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const uid = user?.uid ?? null;

  const reload = useCallback(() => {
    setReports(uid ? listReports(uid) : []);
  }, [uid]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Fetch paid entitlements when signed in
  useEffect(() => {
    if (!user) {
      setEntitlements(null);
      return;
    }
    let cancelled = false;
    fetchEntitlements(() => user.getIdToken())
      .then((e) => {
        if (!cancelled) setEntitlements(e);
      })
      .catch(() => {
        if (!cancelled) setEntitlements({ report: false, monitoring: false, agency: false });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const currentPlan = entitlements ? planName(entitlements) : "Free";

  const when = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const firstName = user?.displayName?.split(" ")[0];
  const paidPlans = PLANS.filter((p) => p.name !== "Free");

  const buyPlan = async (planName: string) => {
    if (!user) return; // dashboard is auth-gated; belt and suspenders
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

            <section aria-label="Run a scan" className="mt-10">
              <Scanner
                onUnlock={() => setPhase2Open(true)}
                uid={uid}
                onScanComplete={reload}
                hasFullAccess={!!entitlements && (entitlements.report || entitlements.monitoring || entitlements.agency)}
                getIdToken={user ? () => user.getIdToken() : undefined}
              />
            </section>

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
                      if (uid) {
                        clearReports(uid);
                        setReports([]);
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
                  automatically — stored in this browser, tied to your account.
                </p>
              ) : (
                <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reports.map((r) => (
                    <li
                      key={`${r.url}-${r.scannedAt}`}
                      className="rounded-[10px] border border-line bg-surface p-6"
                    >
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
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-[13px] italic text-ink-2">
                History lives in this browser for now — server-side history
                ships with paid plans.
              </p>
            </section>

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
                    ) : p.name === "One-time report" && reports.length === 0 ? (
                      <p className="mt-4 text-[13px] text-ink-2">
                        Scan a site first — then unlock its full report.
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
