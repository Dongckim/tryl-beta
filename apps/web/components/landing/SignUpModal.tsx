"use client";

import { useRouter } from "next/navigation";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  const router = useRouter();

  function handleGoToSignUp() {
    onClose();
    router.push("/auth/sign-up");
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-white/60 transition hover:text-white"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="font-serif text-2xl font-light tracking-wide text-white">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Start your try-on journey in seconds.
        </p>
        <button
          type="button"
          onClick={handleGoToSignUp}
          className="mt-8 w-full border border-gold bg-gold/10 py-3 text-sm font-medium uppercase tracking-wider text-gold transition hover:bg-gold/20"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
