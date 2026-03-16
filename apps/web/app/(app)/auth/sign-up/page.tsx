"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PolicyModal } from "@/components/auth/PolicyModal";
import {
  TermsContent,
  PrivacyContent,
  AIProcessingConsentContent,
} from "@/components/auth/PolicyContent";

type PolicyType = "terms" | "privacy" | "ai" | null;

export default function SignUpPage() {
  const { signUp, verifyEmailCode, resendVerification } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [policyOpen, setPolicyOpen] = useState<PolicyType>(null);
  const [termsViewed, setTermsViewed] = useState(false);
  const [privacyViewed, setPrivacyViewed] = useState(false);
  const [aiViewed, setAiViewed] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedAi, setAgreedAi] = useState(false);

  function openPolicy(type: PolicyType) {
    setPolicyOpen(type);
  }

  function closePolicy() {
    if (policyOpen === "terms") setTermsViewed(true);
    if (policyOpen === "privacy") setPrivacyViewed(true);
    if (policyOpen === "ai") setAiViewed(true);
    setPolicyOpen(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreedTerms || !agreedPrivacy || !agreedAi) {
      setError("Please read and agree to all three items above.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { email: sentTo } = await signUp({
        invite_code: inviteCode.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        age: age ? parseInt(age, 10) : null,
        sex: sex || null,
      });
      setPendingEmail(sentTo);
      setStep("verify");
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
      const msg = err instanceof Error ? err.message : "Sign up failed";
      setError(code === "invite_code_invalid" ? "Invalid invite code" : code === "email_already_in_use" ? "Email already registered" : code === "email_not_verified" ? "Email not verified. Request a new code below." : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyEmailCode(pendingEmail, code.trim());
      router.push("/profile");
    } catch (err: unknown) {
      const codeErr = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
      setError(
        codeErr === "verification_code_expired" ? "This code has expired. Please request a new one." :
        codeErr === "verification_code_max_attempts_exceeded" ? "Too many attempts. Request a new code." :
        "Invalid code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      await resendVerification(pendingEmail);
      setResendCooldown(60);
      const t = setInterval(() => {
        setResendCooldown((s) => {
          if (s <= 1) {
            clearInterval(t);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const codeErr = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
      setError(codeErr === "verification_resend_too_soon" ? "You can request a new code in 60 seconds." : "Failed to resend.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "verify") {
    return (
      <>
        <h1 className="text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Verify your email</h1>
        <p className="mt-1 text-center text-sm text-gray-600">
          We sent a 6-digit verification code to your email.
        </p>
        <p className="mt-1 text-center text-sm font-medium text-gray-700">{pendingEmail}</p>
        <form onSubmit={handleVerify} className="mt-4 space-y-3">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              maxLength={6}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="000000"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
              className="text-sm text-gray-600 hover:text-black disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification code"}
            </button>
          </div>
        </form>
        <p className="mt-3 text-center text-sm text-gray-600">
          <Link href="/auth/sign-in" className="font-medium text-black hover:underline">Sign in</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Sign up</h1>
      <p className="mt-1 text-center text-sm text-gray-600">
        Create an account to start your try-on journey.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="invite_code" className="block text-sm font-medium text-gray-700">Invite code</label>
          <input
            id="invite_code"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="TRYL-XXXXXX"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First name</label>
            <input
              id="first_name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Last name</label>
            <input
              id="last_name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          <p className="mt-1 text-xs text-gray-500">At least 8 characters</p>
        </div>
        <div>
          <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700">Confirm password</label>
          <input
            id="password_confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          {passwordConfirm.length >= 8 && password === passwordConfirm && (
            <p className="mt-1 text-xs text-green-600">Passwords match</p>
          )}
          {passwordConfirm.length > 0 && password !== passwordConfirm && (
            <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age (optional)</label>
            <input
              id="age"
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label htmlFor="sex" className="block text-sm font-medium text-gray-700">Sex (optional)</label>
            <select
              id="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50/80 p-2.5">
          <p className="text-xs font-medium text-gray-600">Agreements (open each link before checking)</p>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              disabled={!termsViewed}
              className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-black focus:ring-black disabled:opacity-50"
            />
            <span className="text-xs text-gray-700">
              I agree to the{" "}
              <button
                type="button"
                onClick={() => openPolicy("terms")}
                className="font-medium text-black underline hover:no-underline"
              >
                Terms of Service
              </button>
              {!termsViewed && <span className="text-amber-600"> · read first</span>}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={agreedPrivacy}
              onChange={(e) => setAgreedPrivacy(e.target.checked)}
              disabled={!privacyViewed}
              className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-black focus:ring-black disabled:opacity-50"
            />
            <span className="text-xs text-gray-700">
              I agree to the{" "}
              <button
                type="button"
                onClick={() => openPolicy("privacy")}
                className="font-medium text-black underline hover:no-underline"
              >
                Privacy Policy
              </button>
              {!privacyViewed && <span className="text-amber-600"> · read first</span>}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={agreedAi}
              onChange={(e) => setAgreedAi(e.target.checked)}
              disabled={!aiViewed}
              className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-black focus:ring-black disabled:opacity-50"
            />
            <span className="text-xs text-gray-700">
              I allow Tryl to process my photos for AI try-on{" "}
              <button
                type="button"
                onClick={() => openPolicy("ai")}
                className="font-medium text-black underline hover:no-underline"
              >
                (Content & deletion)
              </button>
              {!aiViewed && <span className="text-amber-600"> · read first</span>}
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={
            loading ||
            password !== passwordConfirm ||
            !agreedTerms ||
            !agreedPrivacy ||
            !agreedAi
          }
          className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-3 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-medium text-black hover:underline">Sign in</Link>
      </p>

      {policyOpen === "terms" && (
        <PolicyModal
          open
          onClose={closePolicy}
          title="Tryl Terms of Service"
        >
          <TermsContent />
        </PolicyModal>
      )}
      {policyOpen === "privacy" && (
        <PolicyModal
          open
          onClose={closePolicy}
          title="Tryl Privacy Policy"
        >
          <PrivacyContent />
        </PolicyModal>
      )}
      {policyOpen === "ai" && (
        <PolicyModal
          open
          onClose={closePolicy}
          title="Content & image policies"
        >
          <AIProcessingConsentContent />
        </PolicyModal>
      )}
    </>
  );
}
