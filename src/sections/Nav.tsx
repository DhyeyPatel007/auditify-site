import { useEffect, useRef, useState } from "react";
import { Wordmark } from "../components/Logo";
import { Avatar } from "../components/Avatar";

export type NavUser = {
  email: string;
  name: string | null;
  photoURL: string | null;
};

type Props = {
  user: NavUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onAccount: () => void;
};

export function Nav({ user, onSignIn, onSignOut, onAccount }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-6"
        aria-label="Primary"
      >
        <a href="/#top" className="flex items-center" aria-label="Auditify home">
          <Wordmark className="text-[26px] leading-none" />
        </a>
        <ul className="hidden items-center gap-9 text-[15px] font-medium text-ink-2 md:flex">
          <li>
            <a href="/#features" className="transition-colors hover:text-ink">
              Product
            </a>
          </li>
          <li>
            <a href="/methodology" className="transition-colors hover:text-ink">
              Methodology
            </a>
          </li>
          <li>
            <a href="/teardowns" className="transition-colors hover:text-ink">
              Teardowns
            </a>
          </li>
          <li>
            <a href="/#pricing" className="transition-colors hover:text-ink">
              Pricing
            </a>
          </li>
          <li>
            <a href="/#faq" className="transition-colors hover:text-ink">
              FAQ
            </a>
          </li>
        </ul>
        <div className="flex items-center gap-3">
          {user ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Account: ${user.email}`}
                className="rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Avatar
                  name={user.name}
                  email={user.email}
                  photoURL={user.photoURL}
                  size={44}
                />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[52px] w-64 rounded-[10px] border border-line-strong bg-surface p-2 shadow-[0_8px_24px_rgba(28,25,21,0.12)]"
                >
                  <div className="flex items-center gap-3 px-3 pb-2 pt-2">
                    <Avatar
                      name={user.name}
                      email={user.email}
                      photoURL={user.photoURL}
                      size={40}
                    />
                    <div className="min-w-0">
                      {user.name && (
                        <p className="truncate text-[14px] font-medium text-ink">
                          {user.name}
                        </p>
                      )}
                      <p className="truncate text-[13px] text-muted">{user.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-line" />
                  <a
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-ink transition-colors hover:bg-paper"
                  >
                    Dashboard
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onAccount();
                    }}
                    className="mt-1 w-full rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-ink transition-colors hover:bg-paper"
                  >
                    My reports &amp; plans
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-ink transition-colors hover:bg-paper"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium text-ink transition-colors hover:border-ink"
            >
              Sign in
            </button>
          )}
          <a
            href="/#scan"
            className="hidden min-h-[44px] items-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-[#2A251F] sm:inline-flex"
          >
            Run free audit
          </a>
        </div>
      </nav>
    </header>
  );
}
