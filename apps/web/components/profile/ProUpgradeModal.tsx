"use client";

interface ProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProUpgradeModal({ open, onClose }: ProUpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Beta limit reached</h2>
        <p className="mt-2 text-sm text-gray-600">
          The current beta supports one fitting profile (2 photos) per user.
          We&apos;ll unlock more versions and a deeper archive with TRYL PRO soon.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
          >
            Not now
          </button>
          <button
            type="button"
            className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white"
          >
            PRO (coming soon)
          </button>
        </div>
      </div>
    </div>
  );
}

