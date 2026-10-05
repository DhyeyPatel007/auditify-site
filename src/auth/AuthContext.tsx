import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import { auth, isAuthConfigured } from "../lib/firebase";

/** Turn Firebase auth errors into plain-language messages. */
export function friendlyAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right — check it and try again.";
    case "auth/weak-password":
      return "That password is too short — use at least 6 characters.";
    case "auth/email-already-in-use":
      return "There's already an account with this email — try logging in instead.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Wrong email or password. Try again.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed before finishing.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window — allow popups and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't switched on yet — contact us and we'll sort it.";
    case "auth/too-many-requests":
      return "Too many attempts — wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network problem — check your connection and try again.";
    default: {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      const suffix = [code, msg].filter(Boolean).join(" | ");
      return suffix
        ? `Something went wrong signing you in. Try again. (${suffix})`
        : "Something went wrong signing you in. Try again.";
    }
  }
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  /** Error from a completed Google redirect sign-in, if any. */
  redirectError: string | null;
  clearRedirectError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function needAuth(): NonNullable<typeof auth> {
  if (!auth) throw new Error("Sign-in is not connected yet.");
  return auth;
}

/**
 * Google sign-in via Google Identity Services (GIS) directly, bypassing
 * Firebase's /__/auth/handler round-trip. We get an access token from
 * Google and hand it to Firebase with signInWithCredential. Fewer moving
 * parts: no handler page, no iframe, no redirect state to lose.
 */
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

// Public OAuth client ID auto-created by Firebase for this project.
// Visible in any Google OAuth URL; safe to ship in the client bundle.
const GOOGLE_CLIENT_ID =
  "932266314669-2hqrrst210vpog5dfa4hlu82u8frqd50.apps.googleusercontent.com";

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load Google sign-in. Check your connection and try again."));
    document.head.appendChild(script);
  });
}

async function signInWithGoogleViaGis(authInstance: Auth): Promise<void> {
  await loadGis();
  const accessToken = await new Promise<string>((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: (response) => {
          if (response.access_token) resolve(response.access_token);
          else {
            // Shape it like a Firebase error so friendlyAuthError maps it.
            const err = new Error(response.error || "popup_closed_by_user");
            (err as { code?: string }).code =
              response.error === "access_denied"
                ? "auth/popup-closed-by-user"
                : "auth/popup-closed-by-user";
            reject(err);
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      reject(e);
    }
  });
  await signInWithCredential(authInstance, GoogleAuthProvider.credential(null, accessToken));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    // Preload Google Identity Services so the sign-in popup opens within
    // the user's click gesture (async script load would break it).
    loadGis().catch(() => {});
    if (!auth) {
      setLoading(false);
      return;
    }
    // Complete a Google redirect sign-in if we just came back from Google.
    getRedirectResult(auth)
      .catch((err) => {
        setRedirectError(friendlyAuthError(err));
      })
      .finally(() => setLoading(false));
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const clearRedirectError = useCallback(() => setRedirectError(null), []);

  const signInWithGoogle = useCallback(async () => {
    // GIS direct flow: Google popup -> access token -> Firebase credential.
    // Bypasses Firebase's handler/iframe/redirect round-trip entirely.
    await signInWithGoogleViaGis(needAuth());
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(needAuth(), email.trim(), password);
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name?: string) => {
      const cred = await createUserWithEmailAndPassword(needAuth(), email.trim(), password);
      if (name?.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
    },
    []
  );

  const signOutUser = useCallback(async () => {
    if (auth) await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: isAuthConfigured(),
        redirectError,
        clearRedirectError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
