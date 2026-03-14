/** Backend API base URL. Set NEXT_PUBLIC_API_BASE_URL (배포 시 API 서버 IP:8000 또는 도메인) */
export const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  "http://localhost:8000";
