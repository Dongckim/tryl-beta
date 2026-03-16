/** Backend API base URL. 기본값은 배포 도메인 https://api.tryl.me */
export const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  "https://api.tryl.me";
