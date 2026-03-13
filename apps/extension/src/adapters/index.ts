export type { ExtractedProduct, SiteAdapter } from "./types";
export { getAdapterForUrl, registerAdapter } from "./registry";
export { zaraAdapter } from "./zara";

import { registerAdapter } from "./registry";
import { zaraAdapter } from "./zara";

registerAdapter(zaraAdapter);
