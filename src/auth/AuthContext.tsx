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
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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
    default:
      return code
        ? `Something went wrong signing you in. Try again. (${code})`
        : "Something went wrong signing you in. Try again.";
  }
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(needAuth(), new GoogleAuthProvider());
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
