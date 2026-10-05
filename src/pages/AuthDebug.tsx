import { useEffect, useState } from "react";
import { getRedirectResult, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";
import { auth, isAuthConfigured } from "../lib/firebase";
import { friendlyAuthError } from "../auth/AuthContext";

/** Temporary diagnostics for the Google redirect flow. Shows every step on-page. */
export function AuthDebugPage() {
  const [log, setLog] = useState<string[]>([]);
  const push = (line: string) =>
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} ${line}`]);

  useEffect(() => {
    push(`configured=${isAuthConfigured()}`);
    push(`authDomain=${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "(missing)"}`);
    push(`projectId=${import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "(missing)"}`);
    const key = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
    push(`apiKey=${key ? key.slice(0, 8) + "..." : "(missing)"}`);
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes("pendingRedirect")) keys.push(k);
      }
      push(`pendingRedirect keys in localStorage: ${keys.length ? keys.join(",") : "(none)"}`);
    } catch (e) {
      push(`localStorage unreadable: ${String(e)}`);
    }
    if (!auth) {
      push("auth is null, aborting");
      return;
    }
    push("calling getRedirectResult…");
    getRedirectResult(auth)
      .then((cred) => {
        if (cred) {
          push(`RESULT: signed in as ${cred.user.email ?? cred.user.uid}`);
        } else {
          push("RESULT: null (no pending redirect result)");
        }
      })
      .catch((err) => {
        push(`ERROR: ${friendlyAuthError(err)}`);
      });
  }, []);

  const start = async () => {
    if (!auth) return;
    push("starting signInWithRedirect…");
    await signInWithRedirect(auth, new GoogleAuthProvider());
  };

  return (
    <div style={{ padding: 24, fontFamily: "monospace", maxWidth: 800 }}>
      <h1>Auth debug</h1>
      <button
        onClick={start}
        style={{ padding: "12px 24px", fontSize: 16, margin: "12px 0" }}
      >
        Test Google redirect
      </button>
      <pre style={{ whiteSpace: "pre-wrap", background: "#f4f4f4", padding: 16 }}>
        {log.join("\n") || "(waiting…)"}
      </pre>
    </div>
  );
}
