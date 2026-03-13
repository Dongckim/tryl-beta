/** Backend API base URL. Set NEXT_PUBLIC_API_BASE_URL in .env.local */
export const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  "http://localhost:8001";
