/** Backend API base URL. Vite replaces import.meta.env.VITE_* at build time from .env. 로컬: VITE_API_BASE_URL=http://localhost:8001 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.tryl.me";

/** Web app base URL for sign-up and email verification. */
export const TRYL_WEB_BASE_URL =
  import.meta.env.VITE_TRYL_WEB_BASE_URL || "https://tryl.me";
