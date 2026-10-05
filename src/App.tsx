import { useCallback, useState } from "react";
import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { HowItWorks } from "./sections/HowItWorks";
import { SampleReport } from "./sections/SampleReport";
import { Features } from "./sections/Features";
import { Pricing } from "./sections/Pricing";
import { Faq } from "./sections/Faq";
import { CtaBand } from "./sections/CtaBand";
import { Footer } from "./sections/Footer";
import { Phase2Modal } from "./components/Phase2Modal";
import { AuthModal } from "./components/AuthModal";
import { AuthProvider, useAuth } from "./auth/AuthContext";

function Shell() {
  const { user, signOutUser } = useAuth();
  const [phase2, setPhase2] = useState<{ open: boolean; context: string }>({
    open: false,
    context: "",
  });
  const [auth, setAuth] = useState<{ open: boolean; mode: "signin" | "signup" }>({
    open: false,
    mode: "signin",
  });

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
        user={user ? { email: user.email ?? "", name: user.displayName } : null}
        onSignIn={() => openAuth("signin")}
        onSignOut={handleSignOut}
      />
      <main>
        <Hero onUnlock={() => openPhase2("Full report")} />
        <HowItWorks />
        <SampleReport onUnlock={() => openPhase2("Full report")} />
        <Features />
        <Pricing onPhase2={openPhase2} />
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
