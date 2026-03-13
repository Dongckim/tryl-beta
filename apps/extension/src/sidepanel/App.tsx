import { useCallback, useEffect, useRef, useState } from "react";

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
          result?: { id: number; result_image_url: string };
        }>({ type: "GET_JOB_STATUS", jobId });
        if (res.status === "completed" && res.result) {
          stopPolling();
          setState({
            view: "completed",
            jobId,
            productTitle,
            resultImageUrl: res.result.result_image_url,
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
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                {state.view === "processing" ? "Try-on in progress…" : "Queued…"}
              </span>
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
              <p className="px-4 pt-2 text-xs text-gray-500 truncate">{state.productTitle}</p>
              <div className="p-4">
                <img
                  src={state.resultImageUrl}
                  alt="Try-on result"
                  className="w-full rounded-lg border border-white/10 object-cover"
                />
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
          </div>
        )}
      </main>
    </div>
  );
}
