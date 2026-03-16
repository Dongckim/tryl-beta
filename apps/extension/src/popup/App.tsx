import { useCallback, useEffect, useState } from "react";
import { listProfileVersions, signIn, setAuthToken, type ProfileVersion } from "../background/api";
import { TRYL_WEB_BASE_URL } from "../background/config";
import { clearSession, getSession, setSession, type Session } from "../lib/session";
import type { ExtractedProduct } from "../adapters/types";

interface LocalArchiveItem {
  id: string;
  title: string;
  imageUrl: string;
  sourceUrl: string;
  createdAt: string;
}

const ARCHIVE_KEY = "tryl_extension_archive";
const GEMINI_USAGE_KEY = "tryl_gemini_usage";
const GEMINI_USAGE_LIMIT = 20;
/** Server returns this when account has reached beta limit (429). */
const BETA_LIMIT_REACHED_MESSAGE = "Beta limit reached";

/** Usage is stored per account (by user id). Legacy: a single number was stored for the whole browser — we do not assign it to any account. */
function getGeminiUsageForUser(userId: string, raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return 0;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const n = (raw as Record<string, number>)[userId];
    return typeof n === "number" && Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function setGeminiUsageForUser(
  userId: string,
  count: number,
  currentRaw: unknown
): Record<string, number> {
  let obj: Record<string, number>;
  if (typeof currentRaw === "number" && Number.isFinite(currentRaw)) {
    obj = {};
  } else if (currentRaw && typeof currentRaw === "object" && !Array.isArray(currentRaw)) {
    obj = { ...(currentRaw as Record<string, number>) };
  } else {
    obj = {};
  }
  obj[userId] = count;
  return obj;
}
/** User feedback form URL. */
const FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeUhZLhWwQw4oNHrhPKPmUMpt4A-Ae3m2mDa7zZWU8Ouq1onA/viewform?usp=dialog";

/**
 * Inject the content script into the active tab if it's a Zara page, so the popup can
 * run Active Scan (GET_PRODUCT) without reloading the tab. Popup stays open.
 */
async function injectZaraContentScriptIfActive(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.toLowerCase().includes("zara.com")) return;
  const manifest = chrome.runtime.getManifest();
  const scripts = manifest.content_scripts?.[0]?.js;
  const scriptPath = Array.isArray(scripts) ? scripts[0] : undefined;
  if (!scriptPath) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [scriptPath] });
  } catch {
    // Already injected or tab invalid; ignore
  }
}

function Header({
  onSettings,
  onSignOut,
  userEmail,
}: {
  onSettings: () => void;
  onSignOut?: () => void;
  userEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/80 backdrop-blur-md">
      <h1 className="font-serif text-xl font-light italic tracking-[0.15em] text-white">
        TRYL
      </h1>
      <div className="relative flex items-center gap-0.5">
        <a
          href={`${TRYL_WEB_BASE_URL}/profile`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-1.5 px-2 rounded-md text-[11px] text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Profile
        </a>
        <a
          href={`${TRYL_WEB_BASE_URL}/closet`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-1.5 px-2 rounded-md text-[11px] text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Closet
        </a>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Settings"
        >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-white/10 bg-surface/95 backdrop-blur-xl py-1 shadow-xl">
            {userEmail && (
              <p className="px-3 py-2 text-xs text-gray-500 truncate border-b border-white/5">
                {userEmail}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSettings();
              }}
              className="w-full px-3 py-2 text-left text-sm text-white/90 hover:bg-white/5"
            >
              Try-on panel
            </button>
            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-400/90 hover:bg-white/5"
              >
                Sign out
              </button>
            )}
          </div>
        </>
      )}
    </div>
    </header>
  );
}

async function fetchProductFromActiveTab(): Promise<ExtractedProduct | null> {
  // lastFocusedWindow: tab where user clicked extension (more reliable than currentWindow in popup)
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return null;
  try {
    const product = await chrome.tabs.sendMessage(tab.id, { type: "GET_PRODUCT" });
    return product ?? null;
  } catch {
    return null;
  }
}

function ScannerCard({
  product,
  loading,
  onRefresh,
  selectedImageIndex,
  onSelectImage,
}: {
  product: ExtractedProduct | null;
  loading: boolean;
  onRefresh: () => void;
  selectedImageIndex: number;
  onSelectImage: (index: number) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
        <div className="p-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
              Active scan
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-gray-400 text-xs font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              Scanning…
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="p-1 rounded text-gray-500 hover:text-white transition-colors"
            aria-label="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="flex gap-4 p-4">
          <div className="flex-shrink-0 w-28 h-40 rounded-lg bg-white/5 animate-pulse" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
        <div className="p-3 flex items-center justify-between border-b border-white/5">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
            Active scan
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="p-1 rounded text-gray-500 hover:text-white transition-colors"
            aria-label="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500">
            Open a supported product page
          </p>
          <p className="text-xs text-gray-600 mt-1">
            e.g. Zara product detail
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
            Active scan
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-gray-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            Ready
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Refresh"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      <div className="flex gap-3 p-3">
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <div className="relative w-28 h-40 rounded-lg bg-white/5 overflow-hidden border border-white/10">
            <img
              src={
                product.imageUrls?.[selectedImageIndex] ??
                product.imageUrl
              }
              alt={product.title}
              className="w-full h-full object-cover"
            />
            {product.imageUrls && product.imageUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onSelectImage(
                      selectedImageIndex === 0
                        ? product.imageUrls!.length - 1
                        : selectedImageIndex - 1
                    )
                  }
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Previous image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSelectImage(
                      selectedImageIndex === product.imageUrls!.length - 1
                        ? 0
                        : selectedImageIndex + 1
                    )
                  }
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Next image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
          {product.imageUrls && product.imageUrls.length > 1 && (
            <span className="text-[10px] text-gray-500">
              {selectedImageIndex + 1} / {product.imageUrls.length}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
            {product.brand ?? "—"}
          </p>
          <h3 className="font-medium text-white truncate mt-0.5 leading-tight">
            {product.title}
          </h3>
          {product.priceText && (
            <p className="text-accent font-semibold mt-1 text-sm">{product.priceText}</p>
          )}
          <div className="pt-2.5 mt-2 border-t border-white/5">
            <p className="text-[10px] leading-relaxed text-gray-500">
              Use a photo where the garment’s shape is clearly visible. Sizes are not guaranteed—use as visual reference only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButtons({
  onTryOn,
  onArchive,
  hasProduct,
}: {
  onTryOn: () => void;
  onArchive: () => void;
  hasProduct: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onTryOn}
        disabled={!hasProduct}
        className="w-full py-3 px-4 rounded-xl font-semibold text-black bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-black transition-all"
      >
        Virtual Try-On
      </button>
      <button
        type="button"
        onClick={onArchive}
        disabled={!hasProduct}
        className="w-full py-2.5 px-4 rounded-xl font-medium text-white/90 border border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm transition-all"
      >
        Temporary Save Product
      </button>
    </div>
  );
}

function ProfileVersionSelector({
  versions,
  selectedId,
  selectedPhotoIndex,
  onSelect,
  onSelectPhoto,
  onRequireUpgrade,
}: {
  versions: ProfileVersion[];
  selectedId: number | null;
  selectedPhotoIndex: 1 | 2 | null;
  onSelect: (id: number) => void;
  onSelectPhoto: (photoIndex: 1 | 2) => void;
  onRequireUpgrade: () => void;
}) {
  if (!versions.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          Fitting profiles
        </p>
        <p className="text-xs text-gray-500">
          No fitting profile images yet. Create one on the web app to use virtual try-on.
        </p>
      </div>
    );
  }

  const primary = versions[0];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">
        Choose fitting photos
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {/* 1st photo card */}
        <button
          type="button"
          onClick={() => {
            onSelect(primary.id);
            onSelectPhoto(1);
          }}
          className={`relative flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden border ${
            selectedId === primary.id && selectedPhotoIndex === 1
              ? "border-accent shadow-[0_0_0_1px_rgba(255,215,128,0.7)]"
              : "border-white/10"
          } bg-white/5 hover:border-white/30 transition-colors relative`}
        >
          {primary.front_image_url ? (
            <img
              src={primary.front_image_url}
              alt="1st photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-gray-500">
              1st photo
            </div>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[10px] text-white/90">
            1st photo
          </span>
          {selectedId === primary.id && selectedPhotoIndex === 1 && (
            <span className="absolute left-1 top-1 inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-medium text-black">
              Selected
            </span>
          )}
        </button>

        {/* 2nd photo card */}
        <button
          type="button"
          onClick={() => {
            onSelect(primary.id);
            onSelectPhoto(2);
          }}
          className={`relative flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden border ${
            selectedId === primary.id && selectedPhotoIndex === 2
              ? "border-accent shadow-[0_0_0_1px_rgba(255,215,128,0.7)]"
              : "border-white/10"
          } bg-white/5 hover:border-white/30 transition-colors relative`}
        >
          {primary.side_image_url ? (
            <img
              src={primary.side_image_url}
              alt="2nd photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-gray-500">
              2nd photo
            </div>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[10px] text-white/90">
            2nd photo
          </span>
          {selectedId === primary.id && selectedPhotoIndex === 2 && (
            <span className="absolute left-1 top-1 inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-medium text-black">
              Selected
            </span>
          )}
        </button>

        {/* PRO archive lock skeleton */}
        <button
          type="button"
          onClick={onRequireUpgrade}
          className="relative flex-shrink-0 w-24 h-28 rounded-lg border border-dashed border-white/20 bg-white/5 px-1.5 py-1.5 text-left hover:border-accent/70"
        >
          <div className="flex h-full flex-col justify-between rounded bg-white/10 p-1.5 text-[10px] text-gray-400">
            <div className="h-16 rounded bg-white/15" />
            <div className="space-y-1">
              <div className="h-1.5 w-16 rounded bg-white/15" />
              <div className="h-1.5 w-10 rounded bg-white/15" />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/90 text-[10px] text-white">
                🔒
              </span>
              <p className="px-1 text-[9px] font-medium text-white">PRO archive</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function RecentArchives({
  items,
  onOpen,
  onClear,
  onDelete,
}: {
  items: LocalArchiveItem[];
  onOpen: (item: LocalArchiveItem) => void;
  onClear: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Recent Archives
        </h3>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-1 text-[11px] text-gray-500">
          Save links with <span className="font-medium text-white/80">Temporary Save Product</span> and
          they will appear here.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              className="relative flex-shrink-0 w-32 rounded-lg overflow-hidden border border-white/10 bg-white/5 hover:border-accent/70 transition-colors"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="absolute right-1 top-1 z-10 rounded-full bg-black/70 text-[10px] text-gray-300 px-1.5 py-0.5 hover:bg-black hover:text-white"
                aria-label="Remove from Recent Archives"
              >
                ✕
              </button>
              <div className="aspect-[3/4] bg-white/10">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="px-2 py-1.5 text-left">
                <p className="line-clamp-2 text-[11px] font-medium text-white/90">
                  {item.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TryiDashboard({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const [product, setProduct] = useState<ExtractedProduct | null>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [profileVersions, setProfileVersions] = useState<ProfileVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [recentArchive, setRecentArchive] = useState<LocalArchiveItem[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<1 | 2 | null>(null);
  const [selectPhotoModalOpen, setSelectPhotoModalOpen] = useState(false);
  const [geminiUsageCount, setGeminiUsageCount] = useState(0);
  const [betaLimitModalOpen, setBetaLimitModalOpen] = useState(false);
  /** When true, modal is from server 429 (account limit); when false, from local count. */
  const [betaLimitFromAccount, setBetaLimitFromAccount] = useState(false);

  const refreshProduct = useCallback(async () => {
    setProductLoading(true);
    const p = await fetchProductFromActiveTab();
    setProduct(p);
    setSelectedImageIndex(0);
    setProductLoading(false);
  }, []);

  useEffect(() => {
    // Load available fitting profile versions for the signed-in user.
    listProfileVersions()
      .then((res) => {
        setProfileVersions(res.versions ?? []);
        if (res.versions && res.versions.length > 0) {
          setSelectedVersionId(res.versions[0].id);
        }
      })
      .catch(() => {
        setProfileVersions([]);
        setSelectedVersionId(null);
      });
  }, []);

  // Load recent archive items from extension storage
  useEffect(() => {
    chrome.storage.local.get(ARCHIVE_KEY, (data) => {
      const raw = (data?.[ARCHIVE_KEY] as LocalArchiveItem[] | undefined) ?? [];
      setRecentArchive(raw);
    });
  }, []);

  // Load Gemini usage count from extension storage (per account)
  useEffect(() => {
    const userId = session.user?.id;
    if (!userId) {
      setGeminiUsageCount(0);
      return;
    }
    chrome.storage.local.get(GEMINI_USAGE_KEY, (data) => {
      const raw = data?.[GEMINI_USAGE_KEY];
      setGeminiUsageCount(getGeminiUsageForUser(userId, raw));
    });
  }, [session.user?.id]);

  useEffect(() => {
    refreshProduct();
  }, [refreshProduct]);

  async function handleTryOn() {
    const userId = session.user?.id;
    if (!userId) return;

    const { currentUsage } = await new Promise<{ currentUsage: number; raw: unknown }>((resolve) => {
      chrome.storage.local.get(GEMINI_USAGE_KEY, (data) => {
        const raw = data?.[GEMINI_USAGE_KEY];
        resolve({ currentUsage: getGeminiUsageForUser(userId, raw), raw });
      });
    });

    if (currentUsage >= GEMINI_USAGE_LIMIT) {
      setGeminiUsageCount(currentUsage);
      setBetaLimitFromAccount(false);
      setBetaLimitModalOpen(true);
      return;
    }

    if (product) {
      // Require user to explicitly choose which fitting photo set to use.
      if (!selectedVersionId || !selectedPhotoIndex) {
        setSelectPhotoModalOpen(true);
        return;
      }
      const imageUrl =
        product.imageUrls?.[selectedImageIndex] ?? product.imageUrl;
      try {
        const res = await chrome.runtime.sendMessage({
          type: "TRY_ON_FROM_POPUP",
          product: {
            sourceSite: product.sourceSite,
            sourceUrl: product.sourceUrl,
            title: product.title,
            imageUrl,
            priceText: product.priceText ?? undefined,
          },
          fittingProfileVersionId: selectedVersionId ?? undefined,
          profilePhotoIndex: selectedPhotoIndex ?? 1,
        });
        if (res?.ok && res.jobId) {
          const nextUsage = currentUsage + 1;
          setGeminiUsageCount(nextUsage);
          const nextRaw = await new Promise<unknown>((resolve) => {
            chrome.storage.local.get(GEMINI_USAGE_KEY, (data) => resolve(data?.[GEMINI_USAGE_KEY]));
          });
          chrome.storage.local.set({
            [GEMINI_USAGE_KEY]: setGeminiUsageForUser(userId, nextUsage, nextRaw),
          });
          chrome.windows.getCurrent((win) => {
            if (win?.id != null) chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
          });
        } else if (res?.error === BETA_LIMIT_REACHED_MESSAGE) {
          setGeminiUsageCount(GEMINI_USAGE_LIMIT);
          chrome.storage.local.get(GEMINI_USAGE_KEY, (data) => {
            const raw = data?.[GEMINI_USAGE_KEY];
            chrome.storage.local.set({
              [GEMINI_USAGE_KEY]: setGeminiUsageForUser(userId, GEMINI_USAGE_LIMIT, raw),
            });
          });
          setBetaLimitFromAccount(true);
          setBetaLimitModalOpen(true);
        }
      } catch {
        // Fallback: just open panel
        chrome.windows.getCurrent((win) => {
          if (win?.id != null) chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
        });
      }
    } else {
      chrome.windows.getCurrent((win) => {
        if (win?.id != null) chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
      });
    }
  }

  function handleArchive() {
    if (!product) return;
    const imageUrl =
      product.imageUrls?.[selectedImageIndex] ?? product.imageUrl;
    const item: LocalArchiveItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: product.title,
      imageUrl,
      sourceUrl: product.sourceUrl,
      createdAt: new Date().toISOString(),
    };
    setRecentArchive((prev) => {
      // De-dupe by sourceUrl (same product page). If it already exists, move it to the front.
      const existing = prev.find((p) => p.sourceUrl === item.sourceUrl);
      const rest = prev.filter((p) => p.sourceUrl !== item.sourceUrl);
      const next = [(existing ? { ...existing, ...item } : item), ...rest].slice(0, 20);
      chrome.storage.local.set({ [ARCHIVE_KEY]: next });
      return next;
    });
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[600px] bg-black">
      <Header
        onSettings={() => {
          chrome.windows.getCurrent((win) => {
            if (win?.id != null) chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
          });
        }}
        onSignOut={onSignOut}
        userEmail={session.user.email}
      />
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <section>
          <ScannerCard
            product={product}
            loading={productLoading}
            onRefresh={refreshProduct}
            selectedImageIndex={selectedImageIndex}
            onSelectImage={setSelectedImageIndex}
          />
        </section>
        <section>
          <ActionButtons
            onTryOn={handleTryOn}
            onArchive={handleArchive}
            hasProduct={!!product}
          />
        </section>
        <section>
          <ProfileVersionSelector
            versions={profileVersions}
            selectedId={selectedVersionId}
            selectedPhotoIndex={selectedPhotoIndex}
            onSelect={setSelectedVersionId}
            onSelectPhoto={setSelectedPhotoIndex}
            onRequireUpgrade={() => setUpgradeOpen(true)}
          />
        </section>
        <section>
          <RecentArchives
            items={recentArchive}
            onOpen={(item) => {
              chrome.tabs.create({ url: item.sourceUrl }).catch(() => {});
            }}
            onClear={() => {
              chrome.storage.local.remove(ARCHIVE_KEY, () => {});
              setRecentArchive([]);
            }}
            onDelete={(id) => {
              setRecentArchive((prev) => {
                const next = prev.filter((item) => item.id !== id);
                chrome.storage.local.set({ [ARCHIVE_KEY]: next });
                return next;
              });
            }}
          />
        </section>
      </main>

      {/* Beta usage badge (always visible) */}
      <div className="border-t border-white/10 bg-black/90 px-4 py-2 text-[11px] text-gray-400 flex items-center justify-between">
        <span className="uppercase tracking-wider text-[10px] text-gray-500">
          Beta
        </span>
        <span>
          Try-on usage{" "}
          <span className="font-semibold text-white">
            {Math.min(geminiUsageCount, GEMINI_USAGE_LIMIT)}
          </span>
          {" / "}
          {GEMINI_USAGE_LIMIT}
        </span>
      </div>

      {/* PRO upsell modal for archive lock in profile selector */}
      {upgradeOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-xs rounded-xl bg-surface/95 p-4 shadow-xl border border-white/10">
            <h2 className="mb-1 text-sm font-semibold text-white">Upgrade to PRO</h2>
            <p className="mb-3 text-xs text-gray-300">
              PRO lets you keep and browse multiple fitting profile images and archive looks across
              sessions.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUpgradeOpen(false)}
                className="rounded border border-white/20 px-2 py-1 text-xs text-gray-200 hover:bg-white/5"
              >
                Close
              </button>
              <button
                type="button"
                className="rounded bg-accent px-3 py-1 text-xs font-medium text-black hover:bg-accent/90"
              >
                Upgrade (web)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal when user tries Try-on without choosing a fitting photo */}
      {selectPhotoModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-xs rounded-xl bg-surface/95 p-4 shadow-xl border border-white/10">
            <h2 className="mb-1 text-sm font-semibold text-white">Choose a fitting photo</h2>
            <p className="mb-3 text-xs text-gray-300">
              Before starting virtual try-on, select which fitting photo set you want to use in{" "}
              <span className="font-medium text-white/90">Choose fitting photos</span>.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectPhotoModalOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/5"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beta Gemini usage limit modal */}
      {betaLimitModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-xs rounded-xl bg-surface/95 p-4 shadow-xl border border-white/10">
            <h2 className="mb-1 text-sm font-semibold text-white">Beta limit reached</h2>
            {betaLimitFromAccount ? (
              <p className="mb-3 text-xs text-gray-300">
                This account has reached the beta limit ({GEMINI_USAGE_LIMIT} tries).
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs text-gray-300">
                  This beta uses Gemini for virtual try-on and is currently limited to{" "}
                  <span className="font-semibold text-white">{GEMINI_USAGE_LIMIT}</span> runs.
                </p>
                <p className="mb-3 text-xs text-gray-400">
                  You&apos;ve used{" "}
                  <span className="font-semibold text-white">
                    {Math.min(geminiUsageCount, GEMINI_USAGE_LIMIT)}
                  </span>{" "}
                  / {GEMINI_USAGE_LIMIT} attempts on this browser.
                </p>
              </>
            )}
            <p className="mb-2 text-xs text-gray-400">
              Help us improve — share your feedback:
            </p>
            <button
              type="button"
              onClick={() => chrome.tabs.create({ url: FEEDBACK_FORM_URL }).catch(() => {})}
              className="mb-3 w-full rounded-lg px-3 py-2 text-xs font-medium text-accent border border-accent/50 bg-accent/10 hover:bg-accent/20"
            >
              Open feedback form
            </button>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setBetaLimitModalOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-200 bg-white/5 hover:bg-white/10"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SignInView({
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
  emailNotVerified,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string;
  loading: boolean;
  emailNotVerified: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const verifyUrl = `${TRYL_WEB_BASE_URL}/auth/verify${email ? `?email=${encodeURIComponent(email)}` : ""}`;
  const signUpUrl = `${TRYL_WEB_BASE_URL}/auth/sign-up`;

  if (emailNotVerified) {
    return (
      <div className="flex flex-col h-[600px] max-h-[600px] bg-black">
        <Header onSettings={() => {}} />
        <main className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">
          <h2 className="font-serif text-2xl font-bold text-white mb-1">
            Email verification required
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Your email is not verified yet. Please verify your email first on the Tryl website.
          </p>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl font-semibold text-center text-black bg-accent hover:bg-accent/90 transition-all block"
          >
            Open Tryl website
          </a>
          <p className="mt-4 text-center text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <a href={signUpUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Sign up
            </a>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[600px] bg-black">
      <Header onSettings={() => {}} />
      <main className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">
        <h2 className="font-serif text-2xl font-bold text-white mb-1">
          Welcome back
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Sign in to scan items and try on clothes.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-accent/50 focus:ring-1 focus:ring-accent/50 outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-accent/50 focus:ring-1 focus:ring-accent/50 outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-black bg-accent hover:bg-accent/90 disabled:opacity-50 transition-all"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">
          Don&apos;t have an account?{" "}
          <a href={signUpUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Sign up
          </a>
        </p>
      </main>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-col h-[600px] max-h-[600px] bg-black items-center justify-center p-6">
      <div className="animate-pulse text-gray-500 text-sm">Loading…</div>
    </div>
  );
}

export function App() {
  const [session, setSessionState] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);

  useEffect(() => {
    getSession().then(async (s) => {
      if (s?.accessToken) {
        setAuthToken(s.accessToken);
        // Inject content script into Zara tab if active so Active Scan works without reload
        await injectZaraContentScriptIfActive();
      }
      setSessionState(s ?? null);
    });
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEmailNotVerified(false);
    setLoading(true);
    try {
      const res = await signIn({ email, password });
      await setSession({ accessToken: res.access_token, user: res.user });
      setAuthToken(res.access_token);
      await injectZaraContentScriptIfActive();
      setSessionState(await getSession());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      if (msg === "email_not_verified") {
        setEmailNotVerified(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (session === undefined) {
    return <LoadingView />;
  }

  if (session === null) {
    return (
      <SignInView
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        error={error}
        loading={loading}
        emailNotVerified={emailNotVerified}
        onSubmit={handleSignIn}
      />
    );
  }

  return (
    <TryiDashboard
      session={session}
      onSignOut={async () => {
        await clearSession();
        setSessionState(null);
      }}
    />
  );
}
