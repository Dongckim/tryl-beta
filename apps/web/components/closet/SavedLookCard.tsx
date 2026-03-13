"use client";

import type { SavedLook } from "@/lib/api/types";

interface SavedLookCardProps {
  look: SavedLook;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function SavedLookCard({ look }: SavedLookCardProps) {
  const imageUrl = look.thumbnail_url ?? look.result_image_url;
  const productTitle = look.product_title?.trim() || null;
  const productUrl = look.product_url?.trim() || null;
  const hasProductLink = Boolean(productUrl);

  return (
    <article className="overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="aspect-[3/4] bg-gray-100">
        <img
          src={imageUrl}
          alt="Try-on result"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-3">
        {productTitle && (
          <p className="text-sm font-medium text-gray-900">
            {hasProductLink ? (
              <a
                href={productUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-gray-400 underline-offset-2 transition hover:decoration-gray-600"
              >
                {productTitle}
              </a>
            ) : (
              productTitle
            )}
          </p>
        )}
        <p className="mt-0.5 text-sm text-gray-600">
          {look.product_price?.trim() || "—"}
        </p>
        {look.created_at && (
          <p className="mt-1 text-xs text-gray-500">
            {formatDate(look.created_at)}
          </p>
        )}
        {look.note && (
          <p className="mt-1 text-sm text-gray-600">{look.note}</p>
        )}
      </div>
    </article>
  );
}
