"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type WardrobeItem = {
  id: number;
  imageUrl: string;
  title: string;
  date: string;
  category: string;
  description: string;
  linkUrl?: string | null;
  brand: string;
  isCover: boolean;
};

const TRACK_EASE: [number, number, number, number] = [0.77, 0, 0.175, 1];
const IMAGE_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function splitTitle(title: string): { head: string; italic: string | null } {
  const t = title.trim();
  const separators = [" + ", " & ", " — ", " - ", " / "];
  for (const sep of separators) {
    const idx = t.indexOf(sep);
    if (idx > 0) {
      return { head: t.slice(0, idx).trim(), italic: t.slice(idx + sep.length).trim() };
    }
  }
  return { head: t, italic: null };
}

type ViewState =
  | { mode: "gallery" }
  | {
      mode: "lookbook";
      index: number;
    };

export function WardrobeArchive({ items }: { items: WardrobeItem[] }) {
  const [view, setView] = useState<ViewState>({ mode: "gallery" });
  const [flashOn, setFlashOn] = useState(false);
  const wheelLockRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);

  const ordered = useMemo(() => {
    const cover = items.find((i) => i.isCover) ?? items[0];
    const rest = items.filter((i) => i.id !== cover?.id);
    return cover ? [cover, ...rest] : rest;
  }, [items]);

  const total = ordered.length;
  const activeIndex = view.mode === "lookbook" ? view.index : 0;

  function openLookbook(index: number) {
    if (view.mode === "lookbook") return;
    setFlashOn(true);
    window.setTimeout(() => {
      setView({ mode: "lookbook", index: clamp(index, 0, total - 1) });
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
    setView({ mode: "lookbook", index: clamp(index, 0, total - 1) });
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
  }, [view.mode, activeIndex, total]);

  useEffect(() => {
    if (view.mode === "lookbook") {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [view.mode]);

  const firstSeven = ordered.slice(0, 7);
  const overflow = ordered.slice(7);

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

      {/* Gallery View */}
      <div
        className={[
          "transition-[opacity,visibility] duration-500 ease-out",
          view.mode === "lookbook"
            ? "fixed inset-0 pointer-events-none opacity-0 invisible"
            : "relative opacity-100 visible",
        ].join(" ")}
      >
        <header className="flex items-end justify-between border-b border-black/10 pb-4">
          <div className="font-serif text-xl font-medium tracking-[0.22em] uppercase text-gray-900">
            Wardrobe
          </div>
          <div className="hidden items-center gap-8 text-[10px] font-medium tracking-[0.18em] uppercase text-gray-500 sm:flex">
            <span>My Archive</span>
            <span>{total} Looks</span>
          </div>
        </header>

        <p className="mt-4 font-serif text-sm italic text-gray-500">
          — Click any look to enter the lookbook
        </p>

        <div className="mt-5 grid grid-cols-12 gap-4 [grid-auto-rows:58px] sm:gap-5">
          {firstSeven.map((item, idx) => {
            const slot =
              idx === 0
                ? "col-[1/8] row-[1/10]"
                : idx === 1
                  ? "col-[8/13] row-[1/6]"
                  : idx === 2
                    ? "col-[8/11] row-[6/10]"
                    : idx === 3
                      ? "col-[11/13] row-[6/10]"
                      : idx === 4
                        ? "col-[1/5] row-[10/16]"
                        : idx === 5
                          ? "col-[5/9] row-[10/16]"
                          : "col-[9/13] row-[10/16]";

            const isCover = idx === 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openLookbook(idx)}
                className={[
                  "group relative overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-black/5",
                  slot,
                ].join(" ")}
              >
                {isCover && (
                  <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium tracking-wide text-white backdrop-blur-sm">
                    Cover Story · {item.date}
                  </div>
                )}

                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-700 [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.05]"
                />

                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-br from-black/0 to-black/70 p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="text-left">
                    <div className="font-serif text-base font-medium leading-snug text-white">
                      {item.title}
                    </div>
                    <div className="mt-1 text-[11px] font-medium tracking-[0.18em] uppercase text-white/60">
                      {item.date} · {item.category}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-gold">
                      <span className="h-px w-6 bg-gold/80" aria-hidden />
                      <span>View Look</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {overflow.length > 0 && (
            <div className="col-[1/-1] row-auto mt-2 border-t border-black/5 pt-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-black/10" />
                <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-gray-500">
                  More Looks
                </span>
                <div className="h-px flex-1 bg-black/10" />
              </div>

              <div className="grid grid-cols-12 gap-4 sm:gap-5">
                {overflow.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openLookbook(7 + i)}
                    className="group relative col-span-12 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-black/5 sm:col-span-4"
                  >
                    <div className="aspect-[4/5]">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-700 [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.05]"
                      />
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-br from-black/0 to-black/70 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="text-left">
                        <div className="font-serif text-sm font-medium leading-snug text-white">
                          {item.title}
                        </div>
                        <div className="mt-1 text-[10px] font-medium tracking-[0.18em] uppercase text-white/60">
                          {item.date} · {item.category}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="mt-10 flex items-center justify-between border-t border-black/10 pt-4">
          <div className="text-[10px] font-medium tracking-[0.2em] uppercase text-gray-500">
            Wardrobe Archive — Personal Collection
          </div>
          <div className="font-serif text-2xl font-medium text-gray-900">{pad2(total)}</div>
        </footer>
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
              <div className="font-serif text-sm font-medium tracking-[0.22em] uppercase text-neutral-100">
                Wardrobe
              </div>
              <div className="flex items-center gap-6">
                <div className="text-[11px] font-medium tracking-[0.2em] uppercase text-neutral-400">
                  Look <span className="text-neutral-100">{pad2(activeIndex + 1)}</span> /{" "}
                  <span className="text-neutral-100">{pad2(total)}</span>
                </div>
                <button
                  type="button"
                  onClick={closeLookbook}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-neutral-200 transition hover:border-gold/60 hover:text-gold"
                  aria-label="Close lookbook"
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
                {ordered.map((item, i) => {
                  const isActive = i === activeIndex;
                  const { head, italic } = splitTitle(item.title);

                  return (
                    <section key={item.id} className="grid h-full min-w-[100vw] grid-cols-1 sm:grid-cols-2">
                      <div className="relative overflow-hidden bg-neutral-900">
                        <motion.img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          animate={
                            isActive
                              ? { scale: 1, filter: "saturate(1)" }
                              : { scale: 1.08, filter: "saturate(0.85)" }
                          }
                          transition={{ duration: 1.4, ease: IMAGE_EASE }}
                        />
                        <div className="pointer-events-none absolute bottom-6 left-6 select-none font-serif text-[96px] italic leading-none text-white/5 sm:text-[140px]">
                          {pad2(i + 1)}
                        </div>
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
                            {item.category} · {item.date}
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
                            {item.description}
                          </motion.p>

                          <motion.div
                            initial={false}
                            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                            transition={{ duration: 0.7, ease: "easeOut", delay: 0.62 }}
                            className="mt-10 flex flex-col gap-3"
                          >
                            <MetaRow label="Date" value={item.date} />
                            <MetaRow
                              label="Link"
                              value={item.linkUrl ? "Open" : "—"}
                              href={item.linkUrl ?? undefined}
                            />
                            <MetaRow label="Brand" value={item.brand} />
                          </motion.div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </motion.div>
            </div>

            <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
              {ordered.map((_, i) => (
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
                disabled={activeIndex === total - 1}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-neutral-200/80 transition hover:border-gold/60 hover:bg-gold/10 hover:text-gold disabled:cursor-not-allowed disabled:opacity-20"
                aria-label="Next look"
              >
                →
              </button>
            </div>

            <div className="absolute bottom-10 left-6 z-20 hidden items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase text-neutral-400 sm:flex">
              <span className="h-px w-8 bg-neutral-200/20" aria-hidden />
              <span>Scroll or arrow key to navigate</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
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
          {value}
        </a>
      ) : (
        <span className="text-sm font-medium text-neutral-200/80">{value}</span>
      )}
    </div>
  );
}

