import type { ExtractedProduct, ExtractedSize, SiteAdapter } from "./types";

const ZARA_ORIGIN = "https://www.zara.com";

// Product page path: /{locale}/{lang}/{slug}-p{id}.html — update if Zara changes URL pattern.
const PRODUCT_PATH_RE = /^\/[a-z]{2}\/[a-z]{2}\/.+-p\d+\.html$/i;

function getMeta(name: string): string | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
  return el?.getAttribute("content")?.trim() || null;
}

type JsonLdProduct = {
  name?: string;
  image?: string | string[];
  offers?: { price?: string | number; priceCurrency?: string };
};

function getJsonLdProduct(): JsonLdProduct | null {
  if (typeof document === "undefined") return null;
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || "{}");
      const obj = Array.isArray(data) ? data.find((d: unknown) => (d as Record<string, unknown>)?.["@type"] === "Product") : (data as Record<string, unknown>)?.["@type"] === "Product" ? data : null;
      if (obj) return obj as JsonLdProduct;
    } catch {
      continue;
    }
  }
  return null;
}

function getPriceFromJsonLd(jsonLd: JsonLdProduct | null): string | null {
  if (!jsonLd?.offers) return null;
  const offers = jsonLd.offers;
  const price = offers.price;
  if (price == null) return null;
  const num = typeof price === "number" ? price : parseFloat(String(price));
  if (Number.isNaN(num)) return null;
  const currency = offers.priceCurrency?.trim() || "";
  return currency ? `${num} ${currency}` : String(price);
}

/** Normalize image URL to a single string. */
function firstImage(value: string | string[] | null | undefined): string | null {
  if (!value) return null;
  const url = Array.isArray(value) ? value[0] : value;
  return typeof url === "string" && url.startsWith("http") ? url : null;
}

/** Parse first URL from srcset (e.g. "https://... 1x" or "https://..."). */
function firstUrlFromSrcset(srcset: string | null): string | null {
  if (!srcset?.trim()) return null;
  const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
  return first && first.startsWith("http") ? first : null;
}

const BAD_IMAGE_SUBSTRINGS = ["transparent", "placeholder"];

function isGoodImageUrl(url: string): boolean {
  return url.startsWith("http") && !BAD_IMAGE_SUBSTRINGS.some((s) => url.includes(s));
}

/** Collect all product image URLs from DOM (main picture sources, then img fallbacks). */
function getAllImageUrlsFromDom(): string[] {
  if (typeof document === "undefined") return [];
  const seen = new Set<string>();

  const add = (url: string | null) => {
    if (url && isGoodImageUrl(url) && !seen.has(url)) {
      seen.add(url);
      return url;
    }
    return null;
  };

  const urls: string[] = [];

  // Zara product gallery: main > ... > picture > source (srcset)
  const pictureSources = document.querySelectorAll("main picture source");
  for (const source of pictureSources) {
    const url = add(firstUrlFromSrcset(source.getAttribute("srcset")));
    if (url) urls.push(url);
  }

  if (urls.length > 0) return urls;

  const candidates = [
    'img[src*="static.zara.net"]',
    'img[src*="im.zara"]',
    'img.media-image__image',
    '[class*="media-image"] img',
    '[class*="product-detail"] img[src^="http"]',
  ];
  for (const sel of candidates) {
    const imgs = document.querySelectorAll(sel);
    for (const img of imgs) {
      const src = (img as HTMLImageElement).src || (img as HTMLImageElement).getAttribute("data-src");
      const url = add(src);
      if (url) urls.push(url);
    }
  }
  return urls;
}

/** Fallback: first product image from DOM. */
function getImageFromDom(): string | null {
  const all = getAllImageUrlsFromDom();
  return all[0] ?? null;
}

/** Reject text that is clearly not a size. Accept real size labels (e.g. "28 (US 28)", "S", "XL"). */
function isLikelyNotSize(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 80) return true;
  const lower = t.toLowerCase();
  const notSize = [
    "add",
    "add to bag",
    "add to cart",
    "close",
    "select",
    "my size is",
    "product measurements",
    "composition",
    "composition & care",
    "check in-store",
    "in-store availability",
    "shipping",
    "exchanges",
    "returns",
    "view similar",
    "care",
  ];
  if (notSize.some((s) => lower === s || lower.startsWith(s) || lower.includes(" " + s + " "))) return true;
  // Long text that doesn't look like "28 (US 28)" is probably not a size (e.g. "Product Measurements")
  if (t.length > 15 && !/\d+\s*\(\s*US\s*\d+\s*\)/i.test(t)) return true;
  return false;
}

/** Try to find sizes in embedded page data (e.g. __NEXT_DATA__, or other script JSON). */
function getSizesFromEmbeddedData(): ExtractedSize[] {
  if (typeof document === "undefined") return [];

  const seen = new Set<string>();
  const out: ExtractedSize[] = [];

  function addSize(label: string, soldOut: boolean): void {
    const trimmed = label.trim();
    if (!trimmed || isLikelyNotSize(trimmed)) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push({ label: trimmed, soldOut });
  }

  function walk(obj: unknown): boolean {
    if (!obj || typeof obj !== "object") return false;
    const o = obj as Record<string, unknown>;

    // Array of size-like items: { size/sizeName/label, available/soldOut/inStock }
    if (Array.isArray(o)) {
      for (const item of o) {
        if (item && typeof item === "object") {
          const t = item as Record<string, unknown>;
          const label =
            (t.size as string) ??
            (t.sizeName as string) ??
            (t.name as string) ??
            (t.label as string);
          const soldOut =
            t.available === false ||
            t.inStock === false ||
            t.soldOut === true ||
            t.availability === "out_of_stock";
          if (typeof label === "string") addSize(label, !!soldOut);
        }
      }
      return out.length > 0;
    }

    // Single object with sizes / variants / sizeList
    const sizeArrays = ["sizes", "variants", "sizeList", "sizeOptions", "productSizes"];
    for (const key of sizeArrays) {
      const val = o[key];
      if (Array.isArray(val) && val.length > 0) {
        for (const v of val) {
          if (typeof v === "string") addSize(v, false);
          else if (v && typeof v === "object") {
            const t = v as Record<string, unknown>;
            const label =
              (t.size as string) ??
              (t.sizeName as string) ??
              (t.name as string) ??
              (t.label as string);
            const soldOut =
              (t as Record<string, unknown>).available === false ||
              (t as Record<string, unknown>).inStock === false ||
              (t as Record<string, unknown>).soldOut === true;
            if (typeof label === "string") addSize(label, !!soldOut);
          }
        }
        if (out.length > 0) return true;
      }
    }

    for (const v of Object.values(o)) {
      if (v && typeof v === "object" && walk(v)) return true;
    }
    return false;
  }

  // Next.js
  const nextData = document.getElementById("__NEXT_DATA__");
  if (nextData?.textContent) {
    try {
      const data = JSON.parse(nextData.textContent) as Record<string, unknown>;
      if (walk(data)) return out;
    } catch {
      // ignore
    }
  }

  // Other script tags that might contain product state
  const scripts = document.querySelectorAll('script[type="application/json"], script:not([src])');
  for (const script of scripts) {
    const text = script.textContent?.trim();
    if (!text || text.length > 50000) continue;
    if (!text.includes("size") && !text.includes("variant")) continue;
    try {
      const data = JSON.parse(text) as unknown;
      if (walk(data)) return out;
    } catch {
      // not JSON or wrong structure
    }
  }

  return out;
}

const ADD_DROPDOWN_WAIT_MS = 600;

/** Open Add dropdown by clicking the Add button, parse sizes from DOM, then close with Escape. */
async function getSizesByOpeningDropdown(): Promise<ExtractedSize[]> {
  if (typeof document === "undefined") return [];

  // Button that opens the size selector (Zara: "Add" / "Add to bag" that shows size list first)
  const addSelectors = [
    "[data-qa='product-add-to-cart']",
    "[data-qa='product-add-button']",
    "button[data-qa*='add']",
    "main button[class*='add']",
    "main a[class*='add']",
    "main [class*='product-detail'] button",
    "main [class*='product-detail'] a[role='button']",
  ];

  let addButton: HTMLElement | null = null;
  for (const sel of addSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el && (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement)) {
        addButton = el;
        break;
      }
    } catch {
      // :has() not supported in some environments
    }
  }

  if (!addButton) {
    // Fallback: button or link whose text suggests "Add"
    const candidates = document.querySelectorAll("main button, main a[role='button']");
    for (const el of candidates) {
      const text = (el.textContent ?? "").trim().toLowerCase();
      if (text.includes("add") && (text.includes("bag") || text.includes("cart") || text === "add")) {
        addButton = el as HTMLElement;
        break;
      }
    }
  }

  if (!addButton) return [];

  addButton.click();
  await new Promise((r) => setTimeout(r, ADD_DROPDOWN_WAIT_MS));

  const sizes = getSizesFromDom();

  // Close dropdown so we don't add to cart: Escape key
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

  return sizes;
}

/** Collect size options from Zara Add button dropdown. Uses label exactly as written (e.g. "28 (US 28)", "XL"). */
function getSizesFromDom(): ExtractedSize[] {
  if (typeof document === "undefined") return [];

  const sizes: ExtractedSize[] = [];
  const seen = new Set<string>();

  function processButton(btn: HTMLButtonElement): void {
    // Prefer Zara's size label element so we don't pick up "View similar"
    const labelEl =
      btn.querySelector("[data-qa-qualifier='size-selector-sizes-size-label']") ??
      btn.querySelector(".size-selector-sizes-size__label") ??
      btn.querySelector("div") ??
      btn;
    const label = (labelEl.textContent ?? "").trim().replace(/\s+/g, " ");
    if (!label || isLikelyNotSize(label)) return;
    if (seen.has(label)) return;
    seen.add(label);
    const soldOut =
      btn.hasAttribute("disabled") ||
      btn.getAttribute("aria-disabled") === "true" ||
      btn.getAttribute("data-qa-action") === "size-out-of-stock" ||
      btn.closest("[aria-disabled='true']") !== null ||
      btn.className.includes("sold-out") ||
      btn.className.includes("out-of-stock");
    sizes.push({ label, soldOut });
  }

  // Zara's actual markup: button.size-selector-sizes-size__button (sold out = data-qa-action="size-out-of-stock")
  const zaraSel =
    "main button.size-selector-sizes-size__button, main [class*='size-selector-sizes-size'] button";
  const zaraSizeButtons = document.querySelectorAll<HTMLButtonElement>(zaraSel);
  if (zaraSizeButtons.length > 0) {
    zaraSizeButtons.forEach(processButton);
    if (sizes.length > 0) return sizes;
  }

  // Path: main > div > ... > div > ul > li > button (Add dropdown size list)
  const selectors = [
    "main [data-qa*='size'] ul li button",
    "main [data-qa*='Size'] ul li button",
    "main [class*='size-selector'] ul li button",
    "main [class*='size-selector'] li button",
    "main ul[class*='size'] li button",
    "main div[class*='size'] ul li button",
    "main div ul li button", // user path: main/.../div/div[2]/ul/li/button
    "main ul li button",
  ];

  for (const sel of selectors) {
    const buttons = document.querySelectorAll<HTMLButtonElement>(sel);
    for (const btn of buttons) processButton(btn);
    if (sizes.length > 0) break;
  }

  return sizes;
}

export const zaraAdapter: SiteAdapter = {
  canHandle(url: string): boolean {
    try {
      const u = new URL(url);
      if (u.origin !== ZARA_ORIGIN) return false;
      const path = u.pathname.replace(/\/$/, "") || "/";
      return PRODUCT_PATH_RE.test(path);
    } catch {
      return false;
    }
  },

  async extractProduct(): Promise<ExtractedProduct | null> {
    if (typeof window === "undefined" || typeof document === "undefined") return null;

    const sourceUrl = window.location.href;

    // Prefer og:* meta tags (stable). DOM selectors below may need updates if Zara changes markup.
    const ogTitle = getMeta("og:title");
    const ogImage = getMeta("og:image");
    const jsonLd = getJsonLdProduct();
    const title = ogTitle || jsonLd?.name?.trim() || null;
    let imageUrl =
      (ogImage?.startsWith("http") ? ogImage : null) ||
      firstImage(jsonLd?.image) ||
      getImageFromDom();

    // Need at least title and image to be confident this is a product page.
    if (!title || !imageUrl) return null;

    // Skip placeholder URLs (Zara may inject these before real images load)
    if (imageUrl.includes("transparent") || imageUrl.includes("placeholder")) {
      imageUrl = getImageFromDom() || null;
      if (!imageUrl) return null;
    }

    // Collect all gallery images so user can pick one in the extension
    const allUrls = getAllImageUrlsFromDom();
    const imageUrls = allUrls.length > 0 ? allUrls : [imageUrl];
    if (allUrls.length > 0 && !allUrls.includes(imageUrl)) imageUrl = allUrls[0];

    // Price: meta → JSON-LD offers → DOM (Zara may change class names).
    let priceText: string | null =
      getMeta("product:price:amount") || getMeta("product:price");
    if (!priceText) priceText = getPriceFromJsonLd(jsonLd);
    if (!priceText) {
      const priceEl =
        document.querySelector("[data-qa='product-price']") ??
        document.querySelector("[data-testid='price']") ??
        document.querySelector("[class*='price']") ??
        document.querySelector("[data-price]") ??
        document.querySelector("span[class*='money']");
      priceText = priceEl?.textContent?.replace(/\s+/g, " ").trim() || null;
    }

    // Sizes: excluded. No dropdown click or size collection (avoids accidentally triggering Zara UI).

    // Brand is fixed for Zara.
    const brand = "Zara";

    // Category: optional; from breadcrumb or JSON-LD if present. Fragile if DOM changes.
    let categoryHint: string | null = null;
    const breadcrumb = document.querySelector("[class*='breadcrumb'] a:last-of-type");
    if (breadcrumb?.textContent) categoryHint = breadcrumb.textContent.trim();
    if (!categoryHint && (jsonLd as { category?: string })?.category)
      categoryHint = (jsonLd as { category?: string }).category ?? null;

    return {
      sourceSite: "zara",
      sourceUrl,
      title,
      imageUrl,
      imageUrls,
      priceText: priceText || undefined,
      brand,
      categoryHint: categoryHint || undefined,
    };
  },
};
