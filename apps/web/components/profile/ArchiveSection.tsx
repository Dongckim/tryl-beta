"use client";

import type { FittingProfileVersion, UserPlan } from "@/lib/api/types";

interface ArchiveSectionProps {
  plan: UserPlan;
  archived: FittingProfileVersion[];
  onRequireUpgrade: () => void;
}

export function ArchiveSection({ plan, archived, onRequireUpgrade }: ArchiveSectionProps) {
  // Treat anything that is not explicitly "pro" as free for now,
  // so missing plan values default to the skeleton + lock UX.
  const isFree = plan !== "pro";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Saved Base Images for Trying-on</h2>
        {isFree && (
          <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            PRO feature
          </span>
        )}
      </div>

      {isFree ? (
        // Free tier: skeleton cards with PRO lock overlay
        <button
          type="button"
          onClick={onRequireUpgrade}
          className="relative grid w-full cursor-pointer grid-cols-2 gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-6 text-left hover:border-amber-400"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex h-32 flex-col justify-between rounded bg-gray-200/90 p-3 text-xs text-gray-500"
            >
              <div className="h-20 rounded bg-gray-300/90" />
              <div className="h-2 w-20 rounded bg-gray-300/90" />
            </div>
          ))}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/90 text-white">
                🔒
              </span>
              <p className="text-sm font-medium text-white">PRO archive</p>
              <p className="text-xs text-white/70">
                Compare all previous fitting photos across versions. Coming soon.
              </p>
            </div>
          </div>
        </button>
      ) : archived.length === 0 ? (
        <p className="text-sm text-gray-500">
          No previous versions yet. Upload new fitting profiles to build your archive.
        </p>
      ) : (
        // PRO: show each image (front/side) as its own independent card
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {archived.flatMap((v) => {
            const created = new Date(v.created_at).toLocaleDateString();
            return [
              {
                key: `${v.id}-front`,
                label: "Front view",
                url: v.front_image_url,
                versionId: v.id,
                created,
              },
              {
                key: `${v.id}-side`,
                label: "Side view",
                url: v.side_image_url,
                versionId: v.id,
                created,
              },
            ];
          }).map((item) => (
            <div
              key={item.key}
              className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600"
            >
              <div className="mb-2 aspect-[3/4] overflow-hidden rounded bg-gray-100">
                {item.url ? (
                  <img
                    src={item.url}
                    alt={item.label}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    {item.label}
                  </div>
                )}
              </div>
              <p className="font-medium text-gray-800">{item.label}</p>
              <p className="text-[11px] text-gray-500">Version #{item.versionId}</p>
              <p className="text-[11px] text-gray-500">Created {item.created}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

