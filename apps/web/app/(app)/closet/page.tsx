"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listPinnedLooks, listSavedLooksPage, pinSavedLook, unpinSavedLook } from "@/lib/api";
import type { SavedLook } from "@/lib/api/types";
import { ClosetSkeleton } from "@/components/closet/ClosetSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ClosetGalleryThreeZone, type LooksState } from "@/components/closet/ClosetGalleryThreeZone";

export default function ClosetPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [heroError, setHeroError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [state, setState] = useState<LooksState | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadInitial() {
    setHeroError(null);
    setLoadMoreError(null);
    try {
      const pins = await listPinnedLooks();
      const firstCarousel = await listSavedLooksPage({ limit: 9, offset: 0 });
      const pinnedSlots: Array<SavedLook | null> = [null, null, null, null];
      for (const p of pins) {
        const slot = typeof p.pinned_slot === "number" ? p.pinned_slot : null;
        if (slot !== null && slot >= 0 && slot <= 3) pinnedSlots[slot] = p;
      }
      setState({
        pinnedSlots,
        carouselItems: firstCarousel,
        carouselOffset: firstCarousel.length,
        hasMore: firstCarousel.length === 9,
        isLoadingMore: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setHeroError(msg);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/sign-in");
      return;
    }
    if (!user) return;
    void loadInitial().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router]);

  if (error) {
    return (
      <div>
        <h1 className="font-serif text-3xl font-semibold text-gray-900">Closet</h1>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  if (state === null) {
    return (
      <div>
        <h1 className="font-serif text-3xl font-semibold text-gray-900">Closet</h1>
        <p className="mt-2 text-gray-600">Your try-on archive and saved results.</p>
        <ClosetSkeleton />
      </div>
    );
  }

  async function loadMore() {
    // If we somehow get called before initial state is ready, just no-op.
    if (!state) return;

    setLoadMoreError(null);

    const offset = state.carouselOffset;

    setState((s) => (s ? { ...s, isLoadingMore: true } : s));
    try {
      const next = await listSavedLooksPage({ limit: 9, offset });
      setState((s) => {
        if (!s) return s;
        const merged = [...s.carouselItems, ...next];
        return {
          ...s,
          carouselItems: merged,
          carouselOffset: s.carouselOffset + next.length,
          hasMore: next.length === 9,
          isLoadingMore: false,
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load more";
      setLoadMoreError(msg);
      setState((s) => (s ? { ...s, isLoadingMore: false } : s));
    }
  }

  async function pin(look: SavedLook) {
    let optimisticSlot: number | null = null;
    setState((s) => {
      if (!s) return s;
      const slots = [...s.pinnedSlots];
      const firstEmpty = slots.findIndex((x) => x === null);
      if (firstEmpty === -1) return s;
      optimisticSlot = firstEmpty;
      slots[firstEmpty] = { ...look, pinned: true, pinned_slot: firstEmpty };
      return {
        ...s,
        pinnedSlots: slots,
        carouselItems: s.carouselItems.map((l) => (l.id === look.id ? { ...l, pinned: true } : l)),
      };
    });
    try {
      const res = await pinSavedLook(look.id);
      const slot = typeof res.slot === "number" ? res.slot : null;
      if (slot !== null && slot >= 0 && slot <= 3) {
        setState((s) => {
          if (!s) return s;
          // Ensure the server slot wins (handles races/multi-tab).
          const nextSlots = s.pinnedSlots.map((p) => (p?.id === look.id ? null : p));
          nextSlots[slot] = { ...look, pinned: true, pinned_slot: slot };
          return {
            ...s,
            pinnedSlots: nextSlots,
            carouselItems: s.carouselItems.map((l) => (l.id === look.id ? { ...l, pinned: true } : l)),
          };
        });
      }
    } catch (err) {
      setState((s) => {
        if (!s) return s;
        return {
          ...s,
          pinnedSlots: s.pinnedSlots.map((p) => (p?.id === look.id ? null : p)),
          carouselItems: s.carouselItems.map((l) => (l.id === look.id ? { ...l, pinned: false } : l)),
        };
      });
      throw err;
    }
  }

  async function unpin(look: SavedLook) {
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        pinnedSlots: s.pinnedSlots.map((p) => (p?.id === look.id ? null : p)),
        carouselItems: s.carouselItems.map((l) => (l.id === look.id ? { ...l, pinned: false } : l)),
      };
    });
    try {
      await unpinSavedLook(look.id);
    } catch (err) {
      setState((s) => {
        if (!s) return s;
        const slots = [...s.pinnedSlots];
        const firstEmpty = slots.findIndex((x) => x === null);
        if (firstEmpty !== -1) slots[firstEmpty] = { ...look, pinned: true, pinned_slot: firstEmpty };
        return {
          ...s,
          pinnedSlots: slots,
          carouselItems: s.carouselItems.map((l) => (l.id === look.id ? { ...l, pinned: true } : l)),
        };
      });
      throw err;
    }
  }

  return (
    <div className="relative">
      {state.carouselItems.length === 0 ? (
        <div>
          <h1 className="font-serif text-3xl font-semibold text-gray-900">Closet</h1>
          <p className="mt-2 text-gray-600">Your try-on archive and saved results.</p>
          <p className="mt-8 text-center text-sm text-gray-500">No saved looks yet.</p>
        </div>
      ) : (
        <div className="sm:-mx-2">
          <ClosetGalleryThreeZone
            state={state}
            heroError={heroError}
            loadMoreError={loadMoreError}
            onRetryHero={() => void loadInitial()}
            onLoadMore={loadMore}
            onPin={pin}
            onUnpin={unpin}
          />
        </div>
      )}
    </div>
  );
}
