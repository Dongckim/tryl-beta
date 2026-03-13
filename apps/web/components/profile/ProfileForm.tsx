"use client";

import { useState } from "react";
import type { FitPreference, Profile } from "@/lib/api/types";

const FIT_OPTIONS: { value: FitPreference; label: string }[] = [
  { value: "slim", label: "Slim" },
  { value: "regular", label: "Regular" },
  { value: "relaxed", label: "Relaxed" },
  { value: "oversized", label: "Oversized" },
];

interface ProfileFormProps {
  profile?: Profile | null;
  onSubmit: (data: {
    height_cm: number;
    weight_kg: number | null;
    fit_preference: FitPreference;
  }) => Promise<void>;
  disabled?: boolean;
}

export function ProfileForm({
  profile,
  onSubmit,
  disabled = false,
}: ProfileFormProps) {
  const isCreate = !profile;
  const [height, setHeight] = useState(profile?.height_cm ?? 170);
  const [weight, setWeight] = useState<string>(profile?.weight_kg?.toString() ?? "");
  const [fitPreference, setFitPreference] = useState<FitPreference>(
    (profile?.fit_preference as FitPreference) ?? "regular"
  );
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const weightVal = weight.trim() ? parseFloat(weight) : null;
    await onSubmit({ height_cm: height, weight_kg: weightVal, fit_preference: fitPreference });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        {isCreate ? "Create profile" : "Edit profile"}
      </h2>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="height_cm" className="mb-2 block text-sm font-medium text-gray-700">
            Height (cm)
          </label>
          <div className="flex items-center gap-3">
            <input
              id="height_cm"
              name="height_cm"
              type="range"
              min={140}
              max={220}
              step={1}
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value, 10))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-gray-900"
            />
            <input
              type="number"
              min={140}
              max={220}
              value={height}
              onChange={(e) => setHeight(Math.min(220, Math.max(140, parseInt(e.target.value, 10) || 170)))}
              className="w-16 rounded border border-gray-300 px-2 py-1.5 text-center text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">{height} cm</p>
        </div>

        <div>
          <label htmlFor="weight_kg" className="mb-2 block text-sm font-medium text-gray-700">
            Weight (kg)
          </label>
          <input
            id="weight_kg"
            name="weight_kg"
            type="number"
            min={30}
            max={300}
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Optional"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="fit_preference" className="mb-2 block text-sm font-medium text-gray-700">
            Fit preference
          </label>
          <select
            id="fit_preference"
            name="fit_preference"
            value={fitPreference}
            onChange={(e) => setFitPreference(e.target.value as FitPreference)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          >
            {FIT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className={`rounded px-4 py-2.5 text-sm font-medium text-white transition ${
          saved ? "bg-green-600" : "bg-black hover:bg-gray-800"
        } disabled:opacity-50`}
      >
        {saved ? "Saved" : isCreate ? "Create profile" : "Save changes"}
      </button>
    </form>
  );
}
