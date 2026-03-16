import { getAdapterForUrl } from "../adapters";
import type { ExtractedProduct } from "../adapters";

const DEBUG = import.meta.env.DEV;

/** In-memory product for the current page session. Cleared on nav or when extraction fails. */
let currentProduct: ExtractedProduct | null = null;

export function getCurrentProduct(): ExtractedProduct | null {
  return currentProduct;
}

/** Run product detection for the current URL. Updates currentProduct. */
export async function runProductDetection(): Promise<ExtractedProduct | null> {
  const url = window.location.href;
  const adapter = getAdapterForUrl(url);

  if (DEBUG) {
    console.log("[Tryl] Content script", { url, hasAdapter: !!adapter });
  }

  if (!adapter) {
    currentProduct = null;
    if (DEBUG) console.log("[Tryl] No adapter for this URL");
    return null;
  }

  try {
    const product = await adapter.extractProduct();
    if (product) {
      currentProduct = product;
    } else {
      // Extraction failed: in production, do NOT proceed with placeholder.
      // In dev, use placeholder so FAB can still be tested.
      currentProduct = DEBUG
        ? {
            sourceSite: "zara",
            sourceUrl: url,
            title: "Product",
            imageUrl: "https://placehold.co/400x600?text=Product",
          }
        : null;
    }

    if (DEBUG) {
      if (product) {
        console.log("[Tryl] Product extracted", {
          sourceSite: currentProduct.sourceSite,
          title: currentProduct.title,
          imageUrl: currentProduct.imageUrl ? `${currentProduct.imageUrl.slice(0, 50)}…` : null,
        });
      } else {
        console.log("[Tryl] Extraction returned null; using placeholder?", DEBUG);
      }
    }

    return currentProduct;
  } catch (err) {
    currentProduct = null;
    if (DEBUG) console.warn("[Tryl] Extraction error", err);
    return null;
  }
}

runProductDetection();

// Popup requests current product via messaging.
chrome.runtime.onMessage.addListener(
  (msg: { type?: string }, _sender, sendResponse) => {
    if (msg.type !== "GET_PRODUCT") return false;
    // Zara loads product data via JS; retry after delay if extraction fails or returns placeholder.
    const RETRY_DELAY_MS = 500;
    const MAX_ATTEMPTS = 3;

    const tryExtract = (attempt: number): void => {
      runProductDetection().then((product) => {
        const hasRealImage =
          product?.imageUrl &&
          !product.imageUrl.includes("placehold") &&
          !product.imageUrl.includes("transparent");
        if (product && hasRealImage) {
          sendResponse(product);
          return;
        }
        if (attempt < MAX_ATTEMPTS - 1) {
          setTimeout(() => tryExtract(attempt + 1), RETRY_DELAY_MS);
        } else {
          // In prod, placeholder is not allowed; return null on failure.
          const isPlaceholder = Boolean(product?.imageUrl?.includes("placehold"));
          sendResponse(!DEBUG && isPlaceholder ? null : product ?? null);
        }
      });
    };
    tryExtract(0);
    return true; // async response
  }
);
