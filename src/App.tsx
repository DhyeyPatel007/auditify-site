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
import { Phase2Modal } from "./components/Phase2Modal";
import { AuthModal } from "./components/AuthModal";
import { AccountModal } from "./components/AccountModal";
import { AuthProvider, useAuth } from "./auth/AuthContext";

function Shell() {
  const { user, signOutUser, redirectError } = useAuth();
  const [phase2, setPhase2] = useState<{ open: boolean; context: string }>({
    open: false,
    context: "",
  });
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

  const openPhase2 = (context: string) => setPhase2({ open: true, context });
  const closePhase2 = () => setPhase2((p) => ({ ...p, open: false }));
  const openAuth = (mode: "signin" | "signup") => setAuth({ open: true, mode });
  const closeAuth = () => setAuth((a) => ({ ...a, open: false }));

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
        <Hero onUnlock={() => openPhase2("Full report")} uid={user?.uid ?? null} />
        <Transformations />
        <HowItWorks />
        <SampleReport onUnlock={() => openPhase2("Full report")} />
        <Compare />
        <MonitoringPreview />
        <WhiteLabel />
        <Features />
        <Pricing onPhase2={openPhase2} email={user?.email ?? null} />
        <History uid={user?.uid ?? null} />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
      <Phase2Modal
        open={phase2.open}
        context={phase2.context}
        onClose={closePhase2}
      />
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
