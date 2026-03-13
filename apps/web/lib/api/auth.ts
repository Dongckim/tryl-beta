import { API_BASE_URL } from "./config";

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

async function authFetch<T>(
  path: string,
  body: SignInRequest | SignUpRequest
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { detail?: string };
  if (!res.ok) throw new Error(data.detail ?? `Auth failed ${res.status}`);
  return data as T;
}

export async function signIn(body: SignInRequest): Promise<AuthResponse> {
  return authFetch<AuthResponse>("/auth/sign-in", body);
}

export async function signUp(body: SignUpRequest): Promise<AuthResponse> {
  return authFetch<AuthResponse>("/auth/sign-up", body);
}
