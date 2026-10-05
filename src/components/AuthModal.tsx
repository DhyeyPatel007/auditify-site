import { useEffect, useRef, useState } from "react";
import { Mark } from "./Logo";
import { friendlyAuthError, useAuth } from "../auth/AuthContext";

type Props = {
  open: boolean;
  mode: "signin" | "signup";
  onClose: () => void;
};

export function AuthModal({ open, mode: initialMode, onClose }: Props) {
  const { configured, redirectError, clearRedirectError, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      clearRedirectError();
      setPassword("");
    }
  }, [open, initialMode, clearRedirectError]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector("input")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password, name.trim() || undefined);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      onClose(); // onAuthStateChanged flips the UI to signed-in
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-line-strong bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-muted outline-none focus:border-accent";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="w-full max-w-md rounded-[10px] border border-line-strong bg-surface p-8 shadow-[0_1px_2px_rgba(28,25,21,0.05)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <Mark size={28} />
          <p className="eyebrow text-ink-2">
            {mode === "signup" ? "Create account" : "Sign in"}
          </p>
        </div>
        <h2 id="auth-title" className="font-display text-2xl font-semibold text-ink">
          {mode === "signup" ? "Your reports live here." : "Welcome back."}
        </h2>
        <p className="mt-2 text-[14px] text-ink-2">
          {mode === "signup"
            ? "One account for full reports, monitoring, and your discount codes."
            : "Sign in to see your reports and plans."}
        </p>

        {!configured ? (
          <p className="mt-6 rounded-lg border border-line bg-paper p-4 text-[14px] text-ink-2">
            Sign-in is being connected — check back soon. The free scan above
            works without an account.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-3 rounded-lg border border-line-strong bg-paper px-5 text-[15px] font-medium text-ink transition-colors hover:border-ink disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.5 0 10.2 0 12s.5 3.5 1.4 5.2l3.8-2.8z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.4 6.8l3.8 2.9c1-2.9 3.7-5 6.8-5z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-[13px] text-muted">
              <span className="h-px flex-1 bg-line" />
              or with email
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  autoComplete="name"
                  className={inputCls}
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoComplete="email"
                className={inputCls}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className={inputCls}
              />
              {(error || redirectError) && (
                <p role="alert" className="text-[14px] text-accent-deep">
                  {error || redirectError}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="min-h-[48px] w-full rounded-lg bg-accent px-5 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>
          </>
        )}

        <p className="mt-5 text-center text-[14px] text-ink-2">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New to Auditify?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Create an account
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
