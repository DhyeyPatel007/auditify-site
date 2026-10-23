import { useCallback, useEffect, useState } from "react";
import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Transformations } from "./sections/Transformations";
import { HowItWorks } from "./sections/HowItWorks";
import { SampleReport } from "./sections/SampleReport";
import { Compare } from "./sections/Compare";
import { MonitoringPreview } from "./sections/MonitoringPreview";
import { WhiteLabel } from "./sections/WhiteLabel";
import { Features } from "./sections/Features";
import { Pricing } from "./sections/Pricing";
import { History } from "./sections/History";
import { Faq } from "./sections/Faq";
import { CtaBand } from "./sections/CtaBand";
import { Footer } from "./sections/Footer";
import { AuthModal } from "./components/AuthModal";
import { AccountModal } from "./components/AccountModal";
import { AuthProvider, useAuth } from "./auth/AuthContext";

function Shell() {
  const { user, signOutUser, redirectError } = useAuth();
  const [auth, setAuth] = useState<{ open: boolean; mode: "signin" | "signup" }>({
    open: false,
    mode: "signin",
  });
  const [accountOpen, setAccountOpen] = useState(false);

  // If a Google redirect sign-in came back with an error, open the dialog
  // so the error is visible instead of failing silently.
  useEffect(() => {
    if (redirectError) setAuth({ open: true, mode: "signin" });
  }, [redirectError]);

  const openAuth = (mode: "signin" | "signup") => setAuth({ open: true, mode });
  const closeAuth = () => setAuth((a) => ({ ...a, open: false }));

  /** "Full report" buttons (hero scanner + sample report). Everything is
   * free since 2026-10-23 — the only gate is a free account. Signed-out
   * visitors get the sign-in dialog; signed-in users go to the scanner,
   * which returns full reports automatically for their session. */
  const getFullReport = () => {
    if (!user) {
      openAuth("signin");
      return;
    }
    document.getElementById("scan")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSignOut = useCallback(async () => {
    await signOutUser();
  }, [signOutUser]);

  return (
    <div id="top" className="min-h-screen bg-paper text-ink">
      <a
        href="#scan"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to the free audit
      </a>
      <Nav
        user={
          user
            ? { email: user.email ?? "", name: user.displayName, photoURL: user.photoURL }
            : null
        }
        onSignIn={() => openAuth("signin")}
        onSignOut={handleSignOut}
        onAccount={() => setAccountOpen(true)}
      />
      <main>
        <Hero
          onUnlock={getFullReport}
          uid={user?.uid ?? null}
          hasFullAccess={!!user}
          getIdToken={user ? () => user.getIdToken() : undefined}
        />
        <Transformations />
        <HowItWorks />
        <SampleReport onUnlock={getFullReport} />
        <Compare />
        <MonitoringPreview />
        <WhiteLabel />
        <Features />
        <Pricing user={user} onSignIn={() => openAuth("signin")} />
        <History uid={user?.uid ?? null} />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
      <AuthModal open={auth.open} mode={auth.mode} onClose={closeAuth} />
      {user && (
        <AccountModal
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          uid={user.uid}
          email={user.email ?? ""}
          name={user.displayName}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
