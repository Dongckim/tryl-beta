"use client";

import { useRef, useState, useEffect } from "react";
import type { SavedLook } from "@/lib/api/types";
import { SavedLookCard } from "./SavedLookCard";

interface ClosetCarouselProps {
  looks: SavedLook[];
}

const CARD_WIDTH = 280;
const GAP = 20;

export function ClosetCarousel({ looks }: ClosetCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [looks.length]);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === "left" ? -(CARD_WIDTH + GAP) : CARD_WIDTH + GAP,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-amber-900/20" aria-hidden />
      <div className="relative flex items-end pb-2">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 shadow-lg ring-1 ring-gray-200 transition hover:bg-white"
            aria-label="Previous"
          >
            <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 shadow-lg ring-1 ring-gray-200 transition hover:bg-white"
            aria-label="Next"
          >
            <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex w-full snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-1 pb-1 pt-1 [scrollbar-gutter:stable]"
          style={{ gap: GAP }}
        >
          {looks.map((look) => (
            <div
              key={look.id}
              className="shrink-0 snap-center"
              style={{ width: CARD_WIDTH }}
            >
              <SavedLookCard look={look} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
