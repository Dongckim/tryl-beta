"use client";

import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-white/50">
        <p>© {year} TRYL by Alexander. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/privacy" className="transition hover:text-white/80">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition hover:text-white/80">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}

