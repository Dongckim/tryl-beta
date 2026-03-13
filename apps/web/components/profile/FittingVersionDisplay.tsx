"use client";

import type { FittingProfileVersion } from "@/lib/api/types";

interface FittingVersionDisplayProps {
  version: FittingProfileVersion;
  onOpenFittingPhotos?: () => void;
}

export function FittingVersionDisplay({ version, onOpenFittingPhotos }: FittingVersionDisplayProps) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Active fitting profile version</h2>
        <p className="mt-1 text-sm text-gray-600">
          Your current 1st and 2nd photos that power virtual try-on.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-500">1st photo</p>
          <div className="aspect-[3/4] overflow-hidden rounded border bg-gray-100">
            {version.front_image_url ? (
              <img
                src={version.front_image_url}
                alt="1st photo"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                No image
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-gray-500">2nd photo</p>
          <div className="aspect-[3/4] overflow-hidden rounded border bg-gray-100">
            {version.side_image_url ? (
              <img
                src={version.side_image_url}
                alt="2nd photo"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                No image
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">Version ID: {version.id}</p>

      {onOpenFittingPhotos && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onOpenFittingPhotos}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-black via-neutral-900 to-black px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)] ring-1 ring-white/10 transition hover:from-neutral-900 hover:via-black hover:to-neutral-900 hover:ring-gold/60"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold/90 text-[10px] font-semibold text-black">
              2
            </span>
            <span className="tracking-[0.18em] uppercase">Update fitting photos</span>
          </button>
        </div>
      )}
    </div>
  );
}
