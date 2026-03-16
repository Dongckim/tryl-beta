"use client";

import { usePathname } from "next/navigation";

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullWidth = pathname === "/how-it-works";

  if (isFullWidth) {
    return <div className="min-h-screen pb-0">{children}</div>;
  }
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
