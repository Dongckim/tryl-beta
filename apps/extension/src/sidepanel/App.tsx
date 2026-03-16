import { useCallback, useEffect, useRef, useState } from "react";
import { TRYL_WEB_BASE_URL } from "../background/config";

const POLL_INTERVAL_MS = 2000;

type ViewState =
  | { view: "idle" }
  | { view: "queued"; jobId: number; productTitle: string }
  | { view: "processing"; jobId: number; productTitle: string }
  | {
      view: "completed";
      jobId: number;
      productTitle: string;
      resultImageUrl: string;
      completedAt: string;
      jobCreatedAt: string;
    }
  | { view: "failed"; errorMessage: string };

function send<T>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response);
    });
  });
}

function formatCompletedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

function formatDurationMs(completedAt: string, jobCreatedAt: string): string {
  try {
    const end = new Date(completedAt).getTime();
    const start = new Date(jobCreatedAt).getTime();
    if (Number.isNaN(end) || Number.isNaN(start) || end < start) return "";
    const sec = Math.round((end - start) / 1000);
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  } catch {
    return "";
  }
}

export function App() {
  const [state, setState] = useState<ViewState>({ view: "idle" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(
    async (jobId: number, productTitle: string) => {
      try {
        const res = await send<{
          status: string;
          error_message?: string;
          result?: {
            id: number;
            result_image_url: string;
            created_at: string;
            job_created_at?: string;
          };
        }>({ type: "GET_JOB_STATUS", jobId });
        if (res.status === "completed" && res.result) {
          stopPolling();
          const jobCreatedAt = res.result.job_created_at ?? res.result.created_at;
          setState({
            view: "completed",
            jobId,
            productTitle,
            resultImageUrl: res.result.result_image_url,
            completedAt: res.result.created_at ?? new Date().toISOString(),
            jobCreatedAt,
          });
        } else if (res.status === "failed") {
          stopPolling();
          setState({
            view: "failed",
            errorMessage: res.error_message ?? "Job failed",
          });
        } else {
          setState(
            res.status === "processing"
              ? { view: "processing", jobId, productTitle }
              : { view: "queued", jobId, productTitle }
          );
        }
      } catch {
        stopPolling();
        setState({ view: "failed", errorMessage: "Could not reach server. Check connection." });
      }
    },
    [stopPolling]
  );

  useEffect(() => {
    send<{ tabId: number; state: { jobId: number; status: string; resolvedProduct?: { title: string } } } | null>({
      type: "GET_JOB_STATE",
    })
      .then((result) => {
        if (!result?.state) {
          setState({ view: "idle" });
          return;
        }
        const { jobId, status, resolvedProduct } = result.state;
        const productTitle = resolvedProduct?.title ?? "Product";
        if (status === "completed") {
          pollJobStatus(jobId, productTitle);
          return;
        }
        if (status === "failed") {
          setState({ view: "failed", errorMessage: "Job failed" });
          return;
        }
        setState(
          status === "processing"
            ? { view: "processing", jobId, productTitle }
            : { view: "queued", jobId, productTitle }
        );
        pollRef.current = setInterval(() => pollJobStatus(jobId, productTitle), POLL_INTERVAL_MS);
      })
      .catch(() => setState({ view: "idle" }));
    return stopPolling;
  }, [pollJobStatus, stopPolling]);

  // Listen for new jobs started from the background script so we can
  // reset any previous error/completed state and start polling fresh.
  useEffect(() => {
    function handleMessage(message: {
      type?: string;
      jobId?: number;
      productTitle?: string;
    }) {
      if (message.type === "JOB_STARTED" && typeof message.jobId === "number") {
        const jobId = message.jobId;
        const productTitle = message.productTitle ?? "Product";
        // Clear any previous polling loop
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        // Reset save state for the new job so the Save button is enabled again
        setSaved(false);
        setSaving(false);
        // Reset view to queued for the new job
        setState({ view: "queued", jobId, productTitle });
        // Start polling this new job
        pollRef.current = setInterval(
          () => pollJobStatus(jobId, productTitle),
          POLL_INTERVAL_MS
        );
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [pollJobStatus]);

  async function handleSaveLook() {
    if (state.view !== "completed") return;
    setSaving(true);
    try {
      await send<{ ok: boolean }>({ type: "SAVE_LOOK", jobId: state.jobId });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-black/90 backdrop-blur-md px-4 py-3">
        <h1 className="font-serif text-lg font-light italic tracking-[0.15em] text-white">TRYL</h1>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">Virtual Try-On</p>
      </header>

      <main className="p-4 max-w-md mx-auto">
        {state.view === "idle" && (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-center">
            <p className="text-sm text-gray-400">
              Open a product page and click Virtual Try-On to start.
            </p>
          </div>
        )}

        {(state.view === "queued" || state.view === "processing") && (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
            <div className="p-3 border-b border-white/5 flex items-center gap-2">
              {state.view === "queued" ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 text-xs font-medium animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Queued…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Try-on in progress…
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="text-sm text-white/90 truncate">{state.productTitle}</p>
            </div>
          </div>
        )}

        {state.view === "failed" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 backdrop-blur-xl p-4">
            <p className="text-xs uppercase tracking-wider text-red-400/90 font-medium mb-1">Error</p>
            <p className="text-sm text-white/90">{state.errorMessage}</p>
          </div>
        )}

        {state.view === "completed" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
              <div className="p-3 border-b border-white/5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium">
                  Completed
                </span>
              </div>
              <div className="px-4 pt-3">
                <h2 className="text-base font-bold text-white leading-tight line-clamp-2">
                  {state.productTitle}
                </h2>
                <p className="text-[11px] text-gray-500 mt-1">
                  {formatCompletedAt(state.completedAt)}
                  {formatDurationMs(state.completedAt, state.jobCreatedAt) && (
                    <span className="ml-1.5 text-gray-400">
                      · {formatDurationMs(state.completedAt, state.jobCreatedAt)}
                    </span>
                  )}
                </p>
              </div>
              <div className="p-4 pt-2">
                <img
                  src={state.resultImageUrl}
                  alt="Try-on result"
                  className="w-full rounded-lg border border-white/10 object-cover"
                />
                <p className="text-xs text-gray-400 mt-2.5 pt-2.5 border-t border-white/5 leading-snug">
                  Sizes are not guaranteed—use as visual reference only.
                </p>
              </div>
            </div>
            {saved ? (
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-center">
                <p className="text-sm text-accent font-medium">Saved to Closet.</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSaveLook}
                disabled={saving}
                className="w-full py-3 px-4 rounded-xl font-semibold text-black bg-accent hover:bg-accent/90 disabled:opacity-50 transition-all"
              >
                {saving ? "Saving…" : "Save Look"}
              </button>
            )}
            <div className="flex gap-2">
              <a
                href={`${TRYL_WEB_BASE_URL}/profile`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl font-medium text-sm text-white/90 border border-white/20 bg-white/5 hover:bg-white/10 text-center transition-all"
              >
                Profile
              </a>
              <a
                href={`${TRYL_WEB_BASE_URL}/closet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl font-medium text-sm text-white/90 border border-white/20 bg-white/5 hover:bg-white/10 text-center transition-all"
              >
                Closet
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
