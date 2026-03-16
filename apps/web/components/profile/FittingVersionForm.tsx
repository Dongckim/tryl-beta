"use client";

import { useEffect, useState } from "react";
import type { UserPlan } from "@/lib/api/types";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB per photo
const ACCEPT_ATTRIBUTE = "image/jpeg,image/png,.jpg,.jpeg,.png";

interface FittingVersionFormProps {
  onSubmit: (data: { front_image_url: string; side_image_url: string }) => Promise<void>;
  disabled?: boolean;
  /** Current user plan (free/pro). Kept for future use. */
  plan?: UserPlan;
  /**
   * Whether the user already has at least one fitting profile version.
   * In the current beta, any existing version means uploads are blocked and we show the beta modal instead.
   */
  hasExistingVersion?: boolean;
  /** Called instead of uploading when the beta limit is hit. */
  onRequireUpgrade?: () => void;
}

export function FittingVersionForm({
  onSubmit,
  disabled = false,
  hasExistingVersion,
}: FittingVersionFormProps) {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sidePreview, setSidePreview] = useState<string | null>(null);
  const [dragFront, setDragFront] = useState(false);
  const [dragSide, setDragSide] = useState(false);
  const [error, setError] = useState("");

  const betaLocked = !!hasExistingVersion;

  useEffect(() => {
    if (betaLocked) {
      setError(
        "Beta: you already have a 2-shot fitting profile. We’ll unlock editing and more versions soon."
      );
    }
  }, [betaLocked]);

  function handleFile(
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
    role: string
  ) {
    if (!file) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      setError("Only JPEG and PNG are allowed. HEIC and other formats are not supported.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Each photo must be 5MB or smaller.");
      return;
    }
    setError("");
    setFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Beta guard: once a fitting profile version exists, block further uploads and show inline warning.
    if (betaLocked) {
      setError(
        "During the beta, you can keep one fitting profile (2 photos). Editing and additional versions are coming soon."
      );
      return;
    }

    if (!frontFile || !sideFile) {
      setError("Please upload both 1st and 2nd photos.");
      return;
    }
    try {
      const { uploadProfileImages } = await import("@/lib/api");
      const { front_image_url, side_image_url } = await uploadProfileImages(frontFile, sideFile);
      await onSubmit({ front_image_url, side_image_url });
      setFrontFile(null);
      setSideFile(null);
      setFrontPreview(null);
      setSidePreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Fitting photos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload personal mirror shots one by one. 1st and 2nd photos power your try-on.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <strong>Upload rules:</strong> Allowed formats: JPEG, PNG. Max 5MB per photo. HEIC is not supported.
      </div>

      {betaLocked && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Beta limit reached: you already created your 1st and 2nd fitting photos. You&apos;ll be
          able to edit and add more once TRYL PRO is live.
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-medium text-white">
              1
            </div>
            <span className="text-sm font-medium text-gray-900">1st photo</span>
          </div>
          <div
            className={`relative overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
              dragFront ? "border-gold bg-gold/5" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragFront(true);
            }}
            onDragLeave={() => setDragFront(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragFront(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f, setFrontFile, setFrontPreview, "Front");
            }}
          >
            <input
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                const f = e.target.files?.[0];
                handleFile(f ?? null, setFrontFile, setFrontPreview, "1st photo");
              }}
            />
            {frontPreview ? (
              <div className="aspect-[3/4]">
                <img src={frontPreview} alt="1st photo preview" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 p-4 text-gray-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm">Drop or click to upload</span>
                <span className="text-xs text-gray-400">Mirror shot, full body</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-[10px] font-medium text-gray-500">
              2
            </div>
            <span className="text-sm font-medium text-gray-600">2nd photo</span>
          </div>
          <div
            className={`relative overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
              dragSide ? "border-gold bg-gold/5" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragSide(true);
            }}
            onDragLeave={() => setDragSide(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragSide(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f, setSideFile, setSidePreview, "Side");
            }}
          >
            <input
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                const f = e.target.files?.[0];
                handleFile(f ?? null, setSideFile, setSidePreview, "2nd photo");
              }}
            />
            {sidePreview ? (
              <div className="aspect-[3/4]">
                <img src={sidePreview} alt="2nd photo preview" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 p-4 text-gray-400">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm">Upload 1st photo first</span>
                <span className="text-xs text-gray-400">Then unlock 2nd shot</span>
              </div>
            )}
          </div>
          {/* Buttons below are kept purely visual for now; the main action is the form submit. */}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={disabled || !frontFile || !sideFile || betaLocked}
        className="rounded bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {disabled ? "Uploading…" : "Create fitting profile"}
      </button>
    </form>
  );
}
