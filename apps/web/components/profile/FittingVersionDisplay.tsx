"use client";

import type { FittingProfileVersion } from "@/lib/api/types";

interface FittingVersionDisplayProps {
  version: FittingProfileVersion;
  onOpenFittingPhotos?: () => void;
}

export function FittingVersionDisplay({ version, onOpenFittingPhotos }: FittingVersionDisplayProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
            Active fitting profile version
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
            1st & 2nd photos for try-on
          </p>
        </div>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-500">
          #{version.id}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
            1st photo
          </p>
          <div className="aspect-[3/4] w-full max-w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-gray-100 sm:max-w-[240px]">
            {version.front_image_url ? (
              <img
                src={version.front_image_url}
                alt="1st photo"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-400">
                No image
              </div>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
            2nd photo
          </p>
          <div className="aspect-[3/4] w-full max-w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-gray-100 sm:max-w-[240px]">
            {version.side_image_url ? (
              <img
                src={version.side_image_url}
                alt="2nd photo"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-400">
                No image
              </div>
            )}
          </div>
        </div>
      </div>

      {onOpenFittingPhotos && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onOpenFittingPhotos}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold">
              2
            </span>
            <span className="tracking-[0.12em] uppercase">Update fitting photos</span>
          </button>
          <div className="mt-6 rounded-lg bg-gray-50 px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-sm leading-relaxed text-gray-700">
              Choose the best photo for each virtual try-on and load more versions whenever you want.
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">
              With <span className="text-amber-700">PRO</span>, you get multiple saved versions and can pick the one that works best for every look.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
