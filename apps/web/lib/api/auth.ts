import { getAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "./config";

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  invite_code: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  age?: number | null;
  sex?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  invite_code?: string | null;
  referral_count?: number;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

export interface SignUpResponse {
  verification_required: boolean;
  email: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendVerificationRequest {
  email: string;
}

/** Error detail from API (string or { code } for structured errors). */
export function getAuthErrorCode(res: Response, data: { detail?: string | { code?: string } }): string {
  const d = data?.detail;
  if (typeof d === "string") return d;
  if (d && typeof d === "object" && typeof (d as { code?: string }).code === "string") return (d as { code: string }).code;
  return res.status === 403 ? "email_not_verified" : res.status === 401 ? "invalid_credentials" : "unknown";
}

async function authFetch<T>(
  path: string,
  body: object
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { detail?: string };
  if (!res.ok) {
    const code = typeof data.detail === "string" ? data.detail : "unknown";
    throw new AuthError(code, res.status);
  }
  return data as T;
}

export class AuthError extends Error {
  constructor(
    public code: string,
    public status: number
  ) {
    super(code);
    this.name = "AuthError";
  }
}

export async function signIn(body: SignInRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { detail?: string };
  if (!res.ok) {
    const code = typeof data.detail === "string" ? data.detail : "invalid_credentials";
    throw new AuthError(code, res.status);
  }
  return data as AuthResponse;
}

export async function signUp(body: SignUpRequest): Promise<SignUpResponse> {
  return authFetch<SignUpResponse>("/auth/sign-up", body);
}

export async function verifyEmailCode(body: VerifyEmailRequest): Promise<AuthResponse> {
  return authFetch<AuthResponse>("/auth/verify-email-code", body);
}

export async function resendVerification(body: ResendVerificationRequest): Promise<void> {
  await authFetch<{ sent: boolean }>("/auth/resend-verification", body);
}

/** GET /auth/me — current user with invite_code and referral_count. Requires Bearer token. */
export async function getMe(): Promise<AuthUser> {
  const token = getAccessToken();
  if (!token) throw new AuthError("Not authenticated", 401);
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as { detail?: string };
  if (!res.ok) throw new AuthError(typeof data.detail === "string" ? data.detail : "unknown", res.status);
  return data as AuthUser;
}
