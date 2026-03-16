"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function Nav() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLanding = pathname === "/";

  const startClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setMenuClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
      closeTimeoutRef.current = null;
    }, 150);
  };

  useEffect(() => {
    setMenuOpen(false);
    setMenuClosing(false);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen || menuClosing) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        startClose();
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen, menuClosing]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-colors ${
        isLanding
          ? "border-b border-white/10 bg-black/60 backdrop-blur-md"
          : "border-b border-white/10 bg-black"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-4 md:px-4 lg:gap-6">
        <Link
          href="/"
          className="flex shrink-0 flex-col font-serif tracking-[0.15em] text-white transition hover:text-gold/90"
        >
          <span className="text-xl font-light italic sm:text-2xl md:text-3xl">TRYL</span>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.4em] text-white/60 sm:block">
            AI Fashion Try-On
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4 lg:gap-6">
          <Link
            href="/how-it-works"
            className="hidden text-sm text-white/70 transition hover:text-white sm:block"
          >
            How it Works
          </Link>
          {loading ? (
            <span className="text-sm text-white/50">…</span>
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => (menuOpen ? startClose() : setMenuOpen(true))}
                title="Account menu"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white/90 transition hover:bg-white/10 hover:text-white"
              >
                <span className="max-w-[140px] truncate font-medium md:max-w-[180px]">
                  {(user.first_name || user.last_name) ? [user.first_name, user.last_name].filter(Boolean).join(" ").trim() : user.email}
                </span>
                <span className="rounded-full border border-white/25 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
                  Beta
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-white/60 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {(menuOpen || menuClosing) && (
                <div
                  className={`absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/10 bg-neutral-950 shadow-xl ${
                    menuClosing ? "animate-nav-panel-close" : "animate-nav-panel-open"
                  }`}
                >
                  <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">
                        {(user.first_name || user.last_name) ? [user.first_name, user.last_name].filter(Boolean).join(" ").trim() : "Account"}
                      </p>
                      <p className="truncate text-xs text-white/60">{user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-3">
                    <Link
                      href="/profile"
                      className="flex flex-col items-center gap-1 rounded-lg bg-white/5 py-3 transition hover:bg-white/10"
                      onClick={() => startClose()}
                    >
                      <svg className="h-5 w-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-xs font-medium text-white/90">Profile</span>
                    </Link>
                    <Link
                      href="/closet"
                      className="flex flex-col items-center gap-1 rounded-lg bg-white/5 py-3 transition hover:bg-white/10"
                      onClick={() => startClose()}
                    >
                      <svg className="h-5 w-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span className="text-xs font-medium text-white/90">Closet</span>
                    </Link>
                  </div>
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                      Invite code
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-white">
                      {user.invite_code ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {user.referral_count ?? 0} {user.referral_count === 1 ? "person" : "people"} used your code
                    </p>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => { startClose(); signOut(); }}
                      className="flex w-full items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/auth/sign-in"
                className="shrink-0 text-sm text-white/70 transition hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="shrink-0 rounded-sm border border-gold bg-gold/20 px-3 py-1.5 text-sm font-medium text-gold transition hover:bg-gold/30"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

