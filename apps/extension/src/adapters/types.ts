/** Size option parsed from product page (e.g. Zara Add dropdown). */
export interface ExtractedSize {
  label: string;
  soldOut: boolean;
}

/** Product data extracted from a store page. Matches API resolve payload. */
export interface ExtractedProduct {
  sourceSite: string;
  sourceUrl: string;
  title: string;
  imageUrl: string;
  /** All product images from the page (e.g. gallery). User picks one for try-on. */
  imageUrls?: string[];
  /** Size options from the page (e.g. Add button dropdown). Sold out = disabled. */
  sizes?: ExtractedSize[];
  priceText?: string | null;
  brand?: string | null;
  categoryHint?: string | null;
}

export interface SiteAdapter {
  /** Whether this adapter can handle the given page URL. */
  canHandle(url: string): boolean;
  /** Extract product from the current page. Returns null if extraction fails. */
  extractProduct(): Promise<ExtractedProduct | null>;
}
