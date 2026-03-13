"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function Nav() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const isLanding = pathname === "/";

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
          <Link href="/profile" className="shrink-0 text-sm text-white/70 transition hover:text-white">
            Profile
          </Link>
          <Link href="/closet" className="shrink-0 text-sm text-white/70 transition hover:text-white">
            Closet
          </Link>
          {loading ? (
            <span className="text-sm text-white/50">…</span>
          ) : user ? (
            <div className="flex shrink-0 items-center gap-4">
              <span className="max-w-[140px] truncate text-sm text-white/70 md:max-w-[200px]">
                {user.email}
              </span>
              <span className="rounded-full border border-white/25 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
                Beta
              </span>
              <button
                type="button"
                onClick={signOut}
                className="text-sm text-white/70 transition hover:text-white"
              >
                Sign out
              </button>
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

