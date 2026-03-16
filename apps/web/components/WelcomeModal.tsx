"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function WelcomeModal() {
  const { user, pendingWelcome, dismissWelcome } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!user?.invite_code) return;
    navigator.clipboard.writeText(user.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [user?.invite_code]);

  if (!user || !pendingWelcome) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-center font-serif text-2xl font-semibold text-gray-900">
          Welcome
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your invite code is below. Share it so others can join TRYL.
        </p>
        <div className="mt-4 flex gap-2">
          <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-lg font-semibold text-gray-900">
            {user.invite_code ?? "—"}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <button
          type="button"
          onClick={dismissWelcome}
          className="mt-4 w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Done
        </button>
      </div>
    </div>
  );
}
