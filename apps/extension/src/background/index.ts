import {
  createTryOnJob,
  getTryOnJob,
  getTryOnResult,
  listProfileVersions,
  resolveProduct,
  saveLook,
  setAuthToken,
  type ResolveProductPayload,
  type ProfileVersion,
} from "./api";
import { clearJobForTab, getJobForActiveTab, setJobForTab } from "./jobState";
import { getSession } from "../lib/session";

function syncAuthFromStorage(): void {
  getSession().then((s) => {
    setAuthToken(s?.accessToken ?? null);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Tryl] Extension installed");
  syncAuthFromStorage();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "tryl_session" in changes) {
    syncAuthFromStorage();
  }
});

syncAuthFromStorage();

chrome.tabs.onRemoved.addListener((tabId) => {
  clearJobForTab(tabId);
});

chrome.runtime.onMessage.addListener(
  (
    message: {
      type?: string;
      product?: ResolveProductPayload;
      jobId?: number;
      fittingProfileVersionId?: number;
      note?: string | null;
    },
    sender,
    sendResponse
  ) => {
    if (message.type === "TRY_ON") {
      handleTryOn(message.product, sender.tab, message.fittingProfileVersionId, sendResponse);
      return true;
    }
    if (message.type === "TRY_ON_FROM_POPUP" && message.product) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        handleTryOn(message.product, tab, message.fittingProfileVersionId, sendResponse);
      });
      return true;
    }
    if (message.type === "GET_JOB_STATE") {
      getJobForActiveTab().then((result) => sendResponse(result ?? null));
      return true;
    }
    if (message.type === "GET_JOB_STATUS" && typeof message.jobId === "number") {
      handleGetJobStatus(message.jobId, sendResponse);
      return true;
    }
    if (message.type === "SAVE_LOOK" && typeof message.jobId === "number") {
      handleSaveLook(message.jobId, message.note, sendResponse);
      return true;
    }
    return false;
  }
);

/** Poll GET /tryon/jobs/{id}; if completed, fetch GET /tryon/jobs/{id}/result. */
async function handleGetJobStatus(
  jobId: number,
  sendResponse: (r: unknown) => void
): Promise<void> {
  try {
    const job = await getTryOnJob(jobId);
    const payload: { status: string; error_message?: string | null; result?: unknown } = {
      status: job.status,
      error_message: job.error_message ?? undefined,
    };
    if (job.status === "completed") {
      const result = await getTryOnResult(jobId);
      payload.result = result;
    }
    sendResponse(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    sendResponse({ status: "failed", error_message: msg });
  }
}

async function handleSaveLook(
  jobId: number,
  note: string | null | undefined,
  sendResponse: (r: unknown) => void
): Promise<void> {
  try {
    const look = await saveLook({ jobId, note: note ?? undefined });
    sendResponse({ ok: true, look });
  } catch (err) {
    sendResponse({ ok: false, error: err instanceof Error ? err.message : "Save failed" });
  }
}

async function handleTryOn(
  product: ResolveProductPayload | undefined,
  tab: chrome.tabs.Tab | undefined,
  fittingProfileVersionId: number | undefined,
  sendResponse: (r: unknown) => void
): Promise<void> {
  if (!product?.sourceSite || !product.sourceUrl || !product.title || !product.imageUrl) {
    sendResponse({ ok: false, error: "Invalid product" });
    return;
  }
  if (tab?.id == null) {
    sendResponse({ ok: false, error: "No tab" });
    return;
  }

  const tabId = tab.id;

  try {
    // 1. Resolve product
    const resolved = await resolveProduct(product);
    const productId = resolved.productId ?? resolved.product_id;
    if (typeof productId !== "number") {
      sendResponse({ ok: false, error: "Invalid product" });
      return;
    }

    // 2. Create try-on job (product image: worker uses product.image_url from DB, e.g. Zara CDN).
    // Product image is uploaded to S3 only when user clicks "Saved to Closet".
    const job = await createTryOnJob(productId, fittingProfileVersionId);
    const jobId = job.jobId ?? job.job_id;
    if (typeof jobId !== "number" || !Number.isInteger(jobId)) {
      sendResponse({ ok: false, error: "Invalid job" });
      return;
    }
    setJobForTab(tabId, job, productId, resolved);
    console.log("[Tryl] Job created", { tabId, jobId, status: job.status });

    // Notify side panel so it can reset any previous error/completed state
    chrome.runtime.sendMessage({
      type: "JOB_STARTED",
      jobId,
      productTitle: resolved.title ?? product.title,
    });

    sendResponse({ ok: true, jobId, status: job.status });

    if (tab.windowId != null) {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.warn("[Tryl] Try On failed", message);
    sendResponse({ ok: false, error: message });
  }
}
