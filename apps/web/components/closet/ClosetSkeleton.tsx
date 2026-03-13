"use client";

const CARD_COUNT = 5;
const CARD_WIDTH = 280;
const GAP = 20;

export function ClosetSkeleton() {
  return (
    <div className="relative mt-8">
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-amber-900/10" aria-hidden />
      <div className="flex gap-5 overflow-hidden pb-2" style={{ gap: GAP }}>
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <article
            key={i}
            className="shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            style={{ width: CARD_WIDTH }}
          >
            <div className="aspect-[3/4] animate-pulse bg-gray-200" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
