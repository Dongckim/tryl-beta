"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProfile } from "@/lib/api";
import type { FitPreference } from "@/lib/api/types";
import { useAuth } from "@/contexts/AuthContext";

const FIT_OPTIONS: { value: FitPreference; label: string }[] = [
  { value: "slim", label: "Slim" },
  { value: "regular", label: "Regular" },
  { value: "relaxed", label: "Relaxed" },
  { value: "oversized", label: "Oversized" },
];

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  const { signUp } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"auth" | "metrics">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [fitPreference, setFitPreference] = useState<FitPreference>("regular");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(email, password);
      setStep("metrics");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleMetricsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const height = parseInt(heightCm, 10);
      if (isNaN(height) || height < 100 || height > 250) {
        setError("Please enter a valid height (100–250 cm)");
        setLoading(false);
        return;
      }
      await createProfile({
        height_cm: height,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        fit_preference: fitPreference,
      });
      onClose();
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
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

        {step === "auth" ? (
          <>
            <h2 className="font-serif text-2xl font-light tracking-wide text-white">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Start your try-on journey in seconds.
            </p>
            <form onSubmit={handleAuthSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-white/70">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mt-2 block w-full border-b border-white/20 bg-transparent py-2 text-white placeholder-white/40 focus:border-gold focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-white/70">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="mt-2 block w-full border-b border-white/20 bg-transparent py-2 text-white placeholder-white/40 focus:border-gold focus:outline-none"
                  placeholder="At least 8 characters"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full border border-gold bg-gold/10 py-3 text-sm font-medium uppercase tracking-wider text-gold transition hover:bg-gold/20 disabled:opacity-50"
              >
                {loading ? "Creating…" : "Continue"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="font-serif text-2xl font-light tracking-wide text-white">
              Your fitting profile
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Help us tailor the perfect fit for you.
            </p>
            <form onSubmit={handleMetricsSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="height" className="block text-xs font-medium uppercase tracking-wider text-white/70">
                  Height (cm)
                </label>
                <input
                  id="height"
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  required
                  min={100}
                  max={250}
                  placeholder="170"
                  className="mt-2 block w-full border-b border-white/20 bg-transparent py-2 text-white placeholder-white/40 focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="weight" className="block text-xs font-medium uppercase tracking-wider text-white/70">
                  Weight (kg) — optional
                </label>
                <input
                  id="weight"
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  min={30}
                  max={300}
                  step={0.1}
                  placeholder="65"
                  className="mt-2 block w-full border-b border-white/20 bg-transparent py-2 text-white placeholder-white/40 focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="fit" className="block text-xs font-medium uppercase tracking-wider text-white/70">
                  Preferred fit
                </label>
                <select
                  id="fit"
                  value={fitPreference}
                  onChange={(e) => setFitPreference(e.target.value as FitPreference)}
                  className="mt-2 block w-full border-b border-white/20 bg-transparent py-2 text-white focus:border-gold focus:outline-none"
                >
                  {FIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0a0a0a]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full border border-gold bg-gold/10 py-3 text-sm font-medium uppercase tracking-wider text-gold transition hover:bg-gold/20 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Get Started"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
