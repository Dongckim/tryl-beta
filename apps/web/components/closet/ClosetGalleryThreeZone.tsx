"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import type { SavedLook } from "@/lib/api/types";

const TRACK_EASE: [number, number, number, number] = [0.77, 0, 0.175, 1];
const IMAGE_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatTitle(look: SavedLook): string {
  return look.product_title?.trim() || look.note?.trim() || "Saved Look";
}

function splitTitle(title: string): { head: string; italic: string | null } {
  const t = title.trim();
  const separators = [" + ", " & ", " — ", " - ", " / "];
  for (const sep of separators) {
    const idx = t.indexOf(sep);
    if (idx > 0) return { head: t.slice(0, idx).trim(), italic: t.slice(idx + sep.length).trim() };
  }
  return { head: t, italic: null };
}

function formatDateEn(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "—";
  }
}

function formatUsd(priceText: string | null | undefined): string {
  if (!priceText) return "—";
  const normalized = priceText.replace(/,/g, "");
  const m = normalized.match(/(\d+(\.\d+)?)/);
  if (!m) return "—";
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

type ViewState =
  | { mode: "gallery" }
  | {
      mode: "lookbook";
      index: number;
    };

export type LooksState = {
  pinnedSlots: Array<SavedLook | null>; // exactly 4 slots
  carouselItems: SavedLook[]; // loaded pages
  carouselOffset: number;
  hasMore: boolean;
  isLoadingMore: boolean;
};

export function ClosetGalleryThreeZone(props: {
  state: LooksState;
  onRetryHero: () => void;
  onLoadMore: () => Promise<void>;
  onPin: (look: SavedLook) => Promise<void>;
  onUnpin: (look: SavedLook) => Promise<void>;
  heroError?: string | null;
  loadMoreError?: string | null;
}) {
  const { state, onRetryHero, onLoadMore, onPin, onUnpin, heroError, loadMoreError } = props;
  const [view, setView] = useState<ViewState>({ mode: "gallery" });
  const [flashOn, setFlashOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const wheelLockRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const pinnedIds = useMemo(
    () => new Set(state.pinnedSlots.flatMap((l) => (l ? [l.id] : []))),
    [state.pinnedSlots]
  );
  const pinLimitReached = state.pinnedSlots.every((s) => s !== null);

  const sliderItems = useMemo(() => {
    // Slider list = All Looks only. Pinned is a subset; avoid duplicating slides.
    return [...state.carouselItems];
  }, [state.carouselItems]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return sliderItems
      .map((look, index) => ({ look, index }))
      .filter(({ look }) => formatTitle(look).toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, sliderItems]);

  const sliderTotal = sliderItems.length;
  const activeIndex = view.mode === "lookbook" ? view.index : 0;

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const target = loadMoreRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (!state.hasMore || state.isLoadingMore) return;
        void onLoadMore();
      },
      {
        root: null,
        rootMargin: "0px 0px 200px 0px",
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [onLoadMore, state.hasMore, state.isLoadingMore]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  function openLookbook(index: number) {
    if (view.mode === "lookbook") return;
    setFlashOn(true);
    window.setTimeout(() => {
      setView({ mode: "lookbook", index: clamp(index, 0, Math.max(0, sliderTotal - 1)) });
      setFlashOn(false);
    }, 250);
  }

  function closeLookbook() {
    if (view.mode !== "lookbook") return;
    setFlashOn(true);
    window.setTimeout(() => {
      setView({ mode: "gallery" });
      setFlashOn(false);
    }, 250);
  }

  function goTo(index: number) {
    if (view.mode !== "lookbook") return;
    setView({ mode: "lookbook", index: clamp(index, 0, Math.max(0, sliderTotal - 1)) });
  }

  function navigate(dir: -1 | 1) {
    goTo(activeIndex + dir);
  }

  useEffect(() => {
    if (view.mode !== "lookbook") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "Escape") closeLookbook();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.mode, activeIndex, sliderTotal]);

  useEffect(() => {
    if (view.mode === "lookbook") {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [view.mode]);

  // Prefetch next batch when user hits last loaded slide.
  useEffect(() => {
    if (view.mode !== "lookbook") return;
    if (!state.hasMore) return;
    if (state.isLoadingMore) return;
    if (activeIndex !== sliderTotal - 1) return;
    void onLoadMore();
  }, [view.mode, activeIndex, sliderTotal, state.hasMore, state.isLoadingMore, onLoadMore]);

  async function handlePin(look: SavedLook) {
    if (pinLimitReached) return;
    try {
      await onPin(look);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to pin look");
    }
  }

  async function handleUnpin(look: SavedLook) {
    try {
      await onUnpin(look);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to unpin look");
    }
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {flashOn && (
          <motion.div
            className="fixed inset-0 z-[150] bg-neutral-950"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.25, ease: "easeOut" } }}
            exit={{ opacity: 0, transition: { duration: 0.25, ease: "easeIn" } }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed left-1/2 top-6 z-[300] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl bg-neutral-950 px-4 py-3 text-sm text-neutral-100 shadow-lg ring-1 ring-white/10"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery wrapper (fixed/opacity toggle like reference) */}
      <div
        className={[
          "transition-[opacity,visibility] duration-500 ease-out",
          view.mode === "lookbook"
            ? "fixed inset-0 pointer-events-none opacity-0 invisible"
            : "relative opacity-100 visible",
        ].join(" ")}
      >
        <header className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-gray-900">Closet</h1>
            <p className="mt-1 text-xs text-gray-500 hidden sm:block">
              Your try-on archive and saved results.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-2 sm:items-end">
            <div className="flex items-center gap-8 text-[10px] font-medium tracking-[0.18em] uppercase text-gray-500">
              <span className="hidden sm:inline">Saved Looks</span>
              <span>{pinnedIds.size + state.carouselItems.length} items</span>
            </div>
          </div>
        </header>

        {heroError ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{heroError}</p>
            <button
              type="button"
              onClick={onRetryHero}
              className="mt-3 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-800 shadow-sm ring-1 ring-red-200 transition hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="mt-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search saved looks by title…"
                  className="w-full border-0 border-b border-gray-300 bg-transparent pb-2 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-0"
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-end pb-2 pr-1 text-gray-400">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
                    />
                  </svg>
                </span>
              </div>
            </div>

            {/* Search results — larger preview cards */}
            {searchQuery.trim() && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white/90 p-4 text-sm text-gray-800 shadow-sm">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-gray-500">No saved looks found for “{searchQuery.trim()}”.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {searchResults.map(({ look, index }) => {
                      const title = formatTitle(look);
                      return (
                        <button
                          key={look.id}
                          type="button"
                          onClick={() => {
                            openLookbook(index);
                            setSearchQuery("");
                          }}
                          className="flex w-full items-center gap-3 rounded-lg bg-white/60 p-2 text-left ring-1 ring-gray-200 transition hover:bg-gray-50 hover:ring-black/20"
                        >
                          <div className="aspect-square w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-black/5 sm:w-28">
                            <img
                              src={look.result_image_url}
                              alt={title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{title}</p>
                            <p className="mt-1 text-[11px] text-gray-500">{formatDateEn(look.created_at)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Zone 1 — Pinned Looks hero (4 slots, asymmetric grid) */}
            <p className="mt-4 font-serif text-sm italic text-gray-500">
              — Tap a look to preview details
            </p>

            <div className="mt-5 grid grid-cols-12 gap-4 pb-8 [grid-auto-rows:58px] sm:gap-5">
              {Array.from({ length: 4 }).map((_, idx) => {
                const look = state.pinnedSlots[idx] ?? null;
                const slot =
                  idx === 0
                    ? "col-[1/8] row-[1/10]"
                    : idx === 1
                      ? "col-[8/13] row-[1/6]"
                      : idx === 2
                        ? "col-[8/11] row-[6/10]"
                        : "col-[11/13] row-[6/10]";

                if (!look) {
                  return (
                    <div
                      key={`pin-hero-skel-${idx}`}
                      className={["rounded-xl bg-gray-100 ring-1 ring-black/5", slot].join(" ")}
                    >
                      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-black/15">
                        <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-gray-500">
                          Pin a look
                        </span>
                      </div>
                    </div>
                  );
                }

                const title = formatTitle(look);
                const sliderIndex = sliderItems.findIndex((l) => l.id === look.id);

                return (
                  <div
                    key={look.id}
                    className={[
                      "group relative overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-black/5",
                      slot,
                    ].join(" ")}
                  >
                    {idx === 0 && (
                      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium tracking-wide text-white backdrop-blur-sm">
                        Pinned
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (sliderIndex >= 0) openLookbook(sliderIndex);
                      }}
                      className="absolute inset-0"
                      aria-label="Open preview"
                    >
                      <img
                        src={look.result_image_url}
                        alt={title}
                        className="h-full w-full object-cover transition duration-700 [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.05]"
                      />
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-br from-black/0 to-black/70 p-5 opacity-100 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="text-left">
                          <div className="font-serif text-base font-medium leading-snug text-white">{title}</div>
                          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-gold">
                            <span className="h-px w-6 bg-gold/80" aria-hidden />
                            <span>View Look</span>
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleUnpin(look)}
                      className="absolute right-3 top-3 z-10 rounded-full bg-black/45 px-3 py-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-white backdrop-blur-sm transition hover:bg-black/60"
                      aria-label="Unpin"
                      title="Unpin"
                    >
                      Unpin
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Zone 2 — All Looks grid (Instagram-style) */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between text-[11px] font-medium tracking-[0.18em] uppercase text-gray-500">
                <span>All Looks</span>
                <span className="hidden sm:inline">Scroll to browse · Tap to open lookbook</span>
              </div>
              <div className="grid grid-cols-3 gap-px sm:gap-px md:gap-[2px]">
                {sliderItems.map((look, index) => {
                  const title = formatTitle(look);
                  const isPinned = pinnedIds.has(look.id);
                  return (
                    <button
                      key={look.id}
                      type="button"
                      onClick={() => openLookbook(index)}
                      className="group relative aspect-square overflow-hidden bg-gray-100"
                      aria-label={title}
                    >
                      <img
                        src={look.result_image_url}
                        alt={title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      {isPinned && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.18em] text-white">
                          PINNED
                        </span>
                      )}
                    </button>
                  );
                })}
                {state.isLoadingMore && (
                  <div className="flex aspect-square items-center justify-center bg-gray-50 text-[11px] text-gray-500">
                    Loading…
                  </div>
                )}
              </div>
              <div ref={loadMoreRef} className="h-10 w-full" />
              {loadMoreError && (
                <div className="mt-3 text-center text-xs text-red-500">
                  Failed to load more looks.{" "}
                  <button
                    type="button"
                    onClick={() => void onLoadMore()}
                    className="underline underline-offset-2 hover:text-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lookbook View */}
      <div
        className={[
          "fixed inset-0 z-[200] bg-neutral-950 transition-[opacity,visibility] duration-500 ease-out",
          view.mode === "lookbook" ? "opacity-100 visible" : "opacity-0 invisible",
        ].join(" ")}
        aria-hidden={view.mode !== "lookbook"}
        onWheel={(e) => {
          if (view.mode !== "lookbook") return;
          if (wheelLockRef.current) return;
          wheelLockRef.current = true;
          if (e.deltaY > 30 || e.deltaX > 30) navigate(1);
          if (e.deltaY < -30 || e.deltaX < -30) navigate(-1);
          window.setTimeout(() => {
            wheelLockRef.current = false;
          }, 900);
        }}
        onTouchStart={(e) => {
          if (view.mode !== "lookbook") return;
          touchStartXRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (view.mode !== "lookbook") return;
          const startX = touchStartXRef.current;
          const endX = e.changedTouches[0]?.clientX ?? null;
          touchStartXRef.current = null;
          if (startX === null || endX === null) return;
          const dx = startX - endX;
          if (Math.abs(dx) > 50) navigate(dx > 0 ? 1 : -1);
        }}
      >
        {view.mode === "lookbook" && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-neutral-950/80 to-transparent" />
            <nav className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-6 sm:px-10">
              <div className="font-serif text-sm font-semibold text-neutral-100">
                Closet
              </div>
              <div className="flex items-center gap-6">
                <div className="text-[11px] font-medium tracking-[0.2em] uppercase text-neutral-400">
                  Item <span className="text-neutral-100">{pad2(activeIndex + 1)}</span> /{" "}
                  <span className="text-neutral-100">{pad2(sliderTotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={closeLookbook}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-neutral-200 transition hover:border-gold/60 hover:text-gold"
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>
            </nav>

            <div className="h-full w-full overflow-hidden">
              <motion.div
                className="flex h-full"
                animate={{ x: `-${activeIndex * 100}vw` }}
                transition={{ duration: 0.9, ease: TRACK_EASE }}
              >
                {sliderItems.map((look, i) => {
                  const isActive = i === activeIndex;
                  const title = formatTitle(look);
                  const { head, italic } = splitTitle(title);
                  const href = look.product_url ?? null;
                  return (
                    <section key={look.id} className="grid h-full min-w-[100vw] grid-cols-1 sm:grid-cols-2">
                      <div className="relative overflow-hidden bg-neutral-900">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0"
                            aria-label="Open product link"
                            title="Open product link"
                          >
                            <motion.img
                              src={look.result_image_url}
                              alt={title}
                              className="h-full w-full cursor-pointer object-cover"
                              animate={
                                isActive
                                  ? { scale: 1, filter: "saturate(1)" }
                                  : { scale: 1.08, filter: "saturate(0.85)" }
                              }
                              transition={{ duration: 1.4, ease: IMAGE_EASE }}
                            />
                          </a>
                        ) : (
                          <motion.img
                            src={look.result_image_url}
                            alt={title}
                            className="h-full w-full object-cover"
                            animate={
                              isActive
                                ? { scale: 1, filter: "saturate(1)" }
                                : { scale: 1.08, filter: "saturate(0.85)" }
                            }
                            transition={{ duration: 1.4, ease: IMAGE_EASE }}
                          />
                        )}
                        <div className="pointer-events-none absolute bottom-6 left-6 select-none font-serif text-[96px] italic leading-none text-white/5 sm:text-[140px]">
                          {pad2(i + 1)}
                        </div>
                        {href && (
                          <div className="pointer-events-none absolute right-6 top-6 rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium tracking-[0.18em] uppercase text-white/80 backdrop-blur-sm">
                            Open link
                          </div>
                        )}
                      </div>

                      <div className="relative flex items-center overflow-hidden bg-neutral-950 px-6 py-14 sm:px-12">
                        <div className="absolute left-0 top-[18%] h-[64%] w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent opacity-50" />
                        <div className="max-w-md">
                          <motion.div
                            initial={false}
                            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                            className="text-[11px] font-semibold tracking-[0.28em] uppercase text-gold"
                          >
                            Saved look · {formatDateEn(look.created_at)}
                          </motion.div>

                          <motion.h2
                            initial={false}
                            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                            className="mt-6 font-serif text-4xl font-medium leading-[1.05] text-neutral-100 sm:text-5xl"
                          >
                            {head}
                            {italic ? (
                              <>
                                <br />
                                <em className="italic text-gold">{italic}</em>
                              </>
                            ) : null}
                          </motion.h2>

                          <motion.p
                            initial={false}
                            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.46 }}
                            className="mt-6 text-sm leading-8 text-neutral-300/70"
                          >
                            {look.note?.trim() || "A saved try-on from your archive."}
                          </motion.p>

                          <motion.div
                            initial={false}
                            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                            transition={{ duration: 0.7, ease: "easeOut", delay: 0.62 }}
                            className="mt-10 flex flex-col gap-3"
                          >
                            <MetaRow label="Date" value={formatDateEn(look.created_at)} />
                            <MetaRow label="Price" value={formatUsd(look.product_price)} />
                            <MetaRow label="Link" href={look.product_url ?? undefined} />
                            <MetaRow label="Brand" value={guessBrand(look.product_url) ?? "—"} />

                            <div className="pt-6">
                              <div className="text-xs font-medium leading-6 text-neutral-400">
                                Sizes are not guaranteed. Use as a visual reference only.
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </motion.div>
            </div>

            <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
              {sliderItems.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={[
                    "h-2 w-2 rounded-full transition",
                    i === activeIndex ? "bg-gold scale-125" : "bg-neutral-200/25 hover:bg-neutral-200/40",
                  ].join(" ")}
                  aria-label={`Go to look ${i + 1}`}
                />
              ))}
            </div>

            <div className="absolute bottom-8 right-6 z-20 flex gap-3 sm:right-10">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={activeIndex === 0}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-neutral-200/80 transition hover:border-gold/60 hover:bg-gold/10 hover:text-gold disabled:cursor-not-allowed disabled:opacity-20"
                aria-label="Previous look"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                disabled={activeIndex === sliderTotal - 1}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-neutral-200/80 transition hover:border-gold/60 hover:bg-gold/10 hover:text-gold disabled:cursor-not-allowed disabled:opacity-20"
                aria-label="Next look"
              >
                →
              </button>
            </div>

          </>
        )}
      </div>
    </div>
  );
}

function SectionDivider({ label, className }: { label: string; className?: string }) {
  return (
    <div className={["flex items-center gap-3", className ?? ""].join(" ")}>
      <div className="h-px flex-1 bg-black/10" />
      <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-gray-500">
        {label}
      </span>
      <div className="h-px flex-1 bg-black/10" />
    </div>
  );
}

function PinSkeleton() {
  return (
    <div className="aspect-[3/4] rounded-xl bg-gray-100 ring-1 ring-black/5">
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-black/15">
        <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-gray-500">
          Pin a look
        </span>
      </div>
    </div>
  );
}

function PinnedCard(props: { look: SavedLook; onOpen: () => void; onUnpin: () => void }) {
  const { look, onOpen, onUnpin } = props;
  const title = formatTitle(look);
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-black/5">
      <button type="button" onClick={onOpen} className="absolute inset-0">
        <img src={look.result_image_url} alt={title} className="h-full w-full object-cover" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnpin();
        }}
        className="absolute right-3 top-3 z-10 rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] uppercase text-white backdrop-blur-sm transition hover:bg-black/60"
        aria-label="Unpin look"
        title="Unpin"
      >
        ✦
      </button>
    </div>
  );
}

function Carousel(props: {
  items: SavedLook[];
  pinnedIds: Set<number>;
  pinLimitReached: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMoreError?: string | null;
  onOpen: (index: number) => void;
  onPin: (look: SavedLook) => void;
  onUnpin: (look: SavedLook) => void;
  onLoadMore: () => void;
}) {
  const {
    items,
    pinnedIds,
    pinLimitReached,
    isLoadingMore,
    hasMore,
    loadMoreError,
    onOpen,
    onPin,
    onUnpin,
    onLoadMore,
  } = props;

  const [page, setPage] = useState(0);
  const perPage = 3;
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const pageItems = items.slice(page * perPage, page * perPage + perPage);

  const canLeft = page > 0;
  const canRight = page < pageCount - 1 || hasMore;

  return (
    <div className="relative">
      <div className="relative">
        {/* Track (full width; arrows overlay on top) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {pageItems.map((look, i) => (
            <CarouselCard
              key={look.id}
              look={look}
              pinned={pinnedIds.has(look.id)}
              pinDisabled={!pinnedIds.has(look.id) && pinLimitReached}
              pinDisabledReason={pinLimitReached ? "Unpin a look to add a new one." : null}
              onOpen={() => onOpen(page * perPage + i)}
              onPin={() => onPin(look)}
              onUnpin={() => onUnpin(look)}
            />
          ))}
        </div>

        {/* Left arrow (overlay) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!canLeft) return;
            setPage((p) => Math.max(0, p - 1));
          }}
          aria-disabled={!canLeft}
          className={[
            "absolute left-0 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2",
            "flex h-12 w-12 items-center justify-center rounded-full",
            "bg-white/90 shadow-lg ring-1 ring-black/10 backdrop-blur-sm",
            "text-lg font-semibold text-gray-900 transition hover:bg-white hover:ring-gold/40",
            !canLeft ? "cursor-not-allowed opacity-30" : "",
          ].join(" ")}
          aria-label="Previous page"
        >
          ←
        </button>

        {/* Right arrow (overlay) */}
        {canRight ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isLoadingMore && page >= pageCount - 1 && hasMore) return;
              const nextPage = page + 1;
              const needMore = nextPage * perPage >= items.length;
              if (needMore && hasMore) onLoadMore();
              setPage((p) => p + 1);
            }}
            aria-disabled={isLoadingMore && page >= pageCount - 1 && hasMore}
            className={[
              "absolute right-0 top-1/2 z-20 translate-x-1/2 -translate-y-1/2",
              "flex h-12 w-12 items-center justify-center rounded-full",
              "bg-white/90 shadow-lg ring-1 ring-black/10 backdrop-blur-sm",
              "text-lg font-semibold text-gray-900 transition hover:bg-white hover:ring-gold/40",
              isLoadingMore && page >= pageCount - 1 && hasMore ? "cursor-not-allowed opacity-50" : "",
            ].join(" ")}
            aria-label="Next page"
            title={loadMoreError ? "Failed to load more. Click to retry." : undefined}
          >
            <span className={isLoadingMore ? "opacity-70" : ""}>→</span>
            {isLoadingMore && (
              <span className="absolute -right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border border-gray-500 border-t-transparent" />
            )}
          </button>
        ) : null}
      </div>

      {loadMoreError && (
        <div className="mt-3 text-center text-xs text-red-600">{loadMoreError}</div>
      )}
    </div>
  );
}

function CarouselCard(props: {
  look: SavedLook;
  pinned: boolean;
  pinDisabled: boolean;
  pinDisabledReason: string | null;
  onOpen: () => void;
  onPin: () => void;
  onUnpin: () => void;
}) {
  const { look, pinned, pinDisabled, pinDisabledReason, onOpen, onPin, onUnpin } = props;
  const title = formatTitle(look);

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <button type="button" onClick={onOpen} className="absolute inset-0">
        <img src={look.result_image_url} alt={title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </button>

      <div className="pointer-events-none absolute bottom-3 left-3 right-12 z-10 text-left opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="font-serif text-sm font-medium leading-snug text-white drop-shadow">{title}</div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (pinDisabled) return;
          pinned ? onUnpin() : onPin();
        }}
        disabled={pinDisabled}
        className={[
          "absolute right-3 top-3 z-10 rounded-full px-3 py-2 text-[11px] font-semibold tracking-[0.22em] uppercase backdrop-blur-sm transition",
          pinned ? "bg-black/55 text-white hover:bg-black/65" : "bg-white/80 text-gray-900 hover:bg-white",
          pinDisabled ? "opacity-40 cursor-not-allowed" : "",
          "opacity-0 group-hover:opacity-100",
        ].join(" ")}
        aria-label={pinned ? "Unpin look" : "Pin look"}
        title={pinDisabled && pinDisabledReason ? pinDisabledReason : pinned ? "Unpin" : "Pin"}
      >
        {pinned ? "Unpin" : "Pin"}
      </button>
    </div>
  );
}

function guessBrand(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("zara.")) return "Zara";
    if (host.includes("hm.")) return "H&M";
    if (host.includes("uniqlo.")) return "Uniqlo";
    return host;
  } catch {
    return null;
  }
}

function MetaRow({ label, value, href }: { label: string; value?: string; href?: string }) {
  const v = value ?? (href ? "Open" : "—");
  return (
    <div className="flex items-center gap-4">
      <span className="w-16 text-[11px] font-semibold tracking-[0.28em] uppercase text-neutral-200/35">
        {label}
      </span>
      <span className="h-px w-10 bg-gold/40" aria-hidden />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-neutral-200/80 underline decoration-neutral-200/40 underline-offset-4 transition hover:text-gold hover:decoration-gold/70"
        >
          {v}
        </a>
      ) : (
        <span className="text-sm font-medium text-neutral-200/80">{v}</span>
      )}
    </div>
  );
}

