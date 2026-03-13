"use client";

export function DesktopOnlyOverlay() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black lg:hidden"
      aria-hidden="false"
    >
      <div className="mx-auto max-w-sm px-8 text-center">
        <p className="font-serif text-2xl font-light italic text-white">
          Desktop only
        </p>
        <p className="mt-4 text-sm text-white/60">
          TRYL is optimized for desktop. Please use a larger screen.
        </p>
        <p className="mt-8 text-xs uppercase tracking-widest text-white/40">
          tryl.me
        </p>
      </div>
    </div>
  );
}
