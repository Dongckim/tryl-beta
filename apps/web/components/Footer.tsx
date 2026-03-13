"use client";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-white/50">
        <p>© {year} TRYL by Alexander. All rights reserved.</p>
      </div>
    </footer>
  );
}

