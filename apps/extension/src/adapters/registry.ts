import type { SiteAdapter } from "./types";

const adapters: SiteAdapter[] = [];

export function registerAdapter(adapter: SiteAdapter): void {
  adapters.push(adapter);
}

/** Returns the first adapter that can handle the URL, or null. */
export function getAdapterForUrl(url: string): SiteAdapter | null {
  return adapters.find((a) => a.canHandle(url)) ?? null;
}
