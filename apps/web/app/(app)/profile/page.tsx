"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createProfile, createProfileVersion, getMyProfile, getMyProfileVersions, setDefaultVersion } from "@/lib/api";
import type { FitPreference, FittingProfileVersion, MyProfileResponse } from "@/lib/api/types";
import {
  FittingVersionDisplay,
  FittingVersionForm,
  ProfileForm,
  ProUpgradeModal,
} from "@/components/profile";
import { useAuth } from "@/contexts/AuthContext";

type ProfileState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "create" }
  | { status: "ready"; data: MyProfileResponse; versions: FittingProfileVersion[] };

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [fittingModalOpen, setFittingModalOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [data, versionsRes] = await Promise.all([
        getMyProfile(),
        getMyProfileVersions(),
      ]);
      setState({ status: "ready", data, versions: versionsRes.versions });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load profile";
      if (msg.includes("Not authenticated") || msg.includes("401")) {
        router.push("/auth/sign-in");
        return;
      }
      if (msg.includes("Profile not found") || msg.includes("404")) {
        setState({ status: "create" });
      } else {
        setState({ status: "error", message: msg });
      }
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/sign-in");
      return;
    }
    if (user) loadProfile();
  }, [authLoading, user, loadProfile, router]);

  async function handleCreateProfile(data: {
    height_cm: number;
    weight_kg: number | null;
    fit_preference: FitPreference;
  }) {
    setSubmitting(true);
    try {
      await createProfile(data);
      await loadProfile();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateVersion(data: {
    front_image_url: string;
    side_image_url: string;
  }) {
    setSubmitting(true);
    try {
      const version = await createProfileVersion(data);
      await setDefaultVersion(version.id);
      await loadProfile();
      setFittingModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div>
        <h1 className="font-serif text-3xl font-semibold text-gray-900">Profile</h1>
        <p className="mt-4 text-gray-600">Loading…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div>
        <h1 className="font-serif text-3xl font-semibold text-gray-900">Profile</h1>
        <p className="mt-4 text-red-600">{state.message}</p>
      </div>
    );
  }

  if (state.status === "create") {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">
            Add your body metrics and fitting photos. This profile will be used across TRYL.
          </p>
        </div>
        {user?.invite_code && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-gray-700">Your invite code</p>
            <p className="mt-1 font-mono text-lg font-semibold text-gray-900">{user.invite_code}</p>
            <p className="mt-1 text-xs text-gray-500">Share this code so others can sign up.</p>
          </div>
        )}
        <ProfileForm onSubmit={handleCreateProfile} disabled={submitting} />
      </div>
    );
  }

  const { default_version } = state.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">
          Your body metrics and fitting photos power TRYL across web and extension.
        </p>
      </div>

      {user?.invite_code && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm font-medium text-gray-700">Your invite code</p>
          <p className="mt-1 font-mono text-lg font-semibold text-gray-900">{user.invite_code}</p>
          <p className="mt-1 text-xs text-gray-500">Share this code so others can sign up.</p>
        </div>
      )}

      <div className={default_version ? "grid gap-4 lg:grid-cols-2" : ""}>
        {default_version ? (
          <FittingVersionDisplay
            version={default_version}
            onOpenFittingPhotos={() => setFittingModalOpen(true)}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Active fitting profile version</h2>
                <p className="mt-1 text-sm text-gray-600">
                  No fitting photos yet. Add your mirror shots to power try-on.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFittingModalOpen(true)}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
              >
                Add fitting photos
              </button>
            </div>
          </div>
        )}

        {default_version && (
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="relative flex min-h-[200px] flex-col rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-6 text-left transition hover:border-amber-400"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Saved versions</h2>
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                PRO
              </span>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded bg-gray-200/90 p-2">
                  <div className="aspect-[3/4] rounded bg-gray-300/90" />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/90 text-white">
                  🔒
                </span>
                <p className="text-sm font-medium text-white">PRO archive</p>
                <p className="text-xs text-white/70">More versions & history — coming soon</p>
              </div>
            </div>
          </button>
        )}
      </div>

      <ProUpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      {fittingModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Fitting photos</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Upload or refresh the mirror shots used for try-on.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFittingModalOpen(false)}
                className="rounded-full border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50"
              >
                <span className="sr-only">Close</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 11-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <FittingVersionForm
              onSubmit={handleCreateVersion}
              disabled={submitting}
              hasExistingVersion={!!default_version}
            />
          </div>
        </div>
      )}
    </div>
  );
}
