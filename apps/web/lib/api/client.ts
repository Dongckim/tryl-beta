import { getAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "./config";
import type {
  CreateProfileRequest,
  CreateProfileVersionRequest,
  FittingProfileVersion,
  MyProfileResponse,
  Profile,
  ProfileVersionsResponse,
  ResolveProductRequest,
  ResolveProductResponse,
  SavedLook,
  UpdateProfileRequest,
} from "./types";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: { ...getHeaders(), ...(options.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** GET /profiles/me — current user's profile with default version */
export async function getMyProfile(): Promise<MyProfileResponse> {
  return apiFetch<MyProfileResponse>("/profiles/me");
}

/** GET /profiles/me/versions — all fitting profile versions for archive UI */
export async function getMyProfileVersions(): Promise<ProfileVersionsResponse> {
  return apiFetch<ProfileVersionsResponse>("/profiles/me/versions");
}

/** POST /profiles — create profile if missing */
export async function createProfile(
  body: CreateProfileRequest
): Promise<Profile> {
  return apiFetch<Profile>("/profiles", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** PATCH /profiles/me — update profile */
export async function updateProfile(
  body: UpdateProfileRequest
): Promise<Profile> {
  return apiFetch<Profile>("/profiles/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** POST /profiles/me/versions/upload — upload front & side images, returns URLs */
export async function uploadProfileImages(
  frontImage: File,
  sideImage: File
): Promise<{ front_image_url: string; side_image_url: string }> {
  const formData = new FormData();
  formData.append("front_image", frontImage);
  formData.append("side_image", sideImage);

  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/profiles/me/versions/upload`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? `Upload failed ${res.status}`);
  }
  return res.json();
}

/** POST /profiles/me/versions — create fitting profile version */
export async function createProfileVersion(
  body: CreateProfileVersionRequest
): Promise<FittingProfileVersion> {
  return apiFetch<FittingProfileVersion>("/profiles/me/versions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** PATCH /profiles/me/default-version — set default fitting version */
export async function setDefaultVersion(versionId: number): Promise<{ default_version_id: number }> {
  return apiFetch<{ default_version_id: number }>("/profiles/me/default-version", {
    method: "PATCH",
    body: JSON.stringify({ version_id: versionId }),
  });
}

/** GET /looks/me — list saved looks (newest first) */
export async function listSavedLooks(): Promise<SavedLook[]> {
  return apiFetch<SavedLook[]>("/looks/me");
}

/** GET /looks/me?limit=&offset= — paginated saved looks (newest first) */
export async function listSavedLooksPage(params: {
  limit: number;
  offset: number;
}): Promise<SavedLook[]> {
  const { limit, offset } = params;
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiFetch<SavedLook[]>(`/looks/me?${qs.toString()}`);
}

/** POST /looks/{id}/pin — pin a saved look */
export async function pinSavedLook(id: number): Promise<{ ok: boolean; slot: number }> {
  return apiFetch<{ ok: boolean; slot: number }>(`/looks/${id}/pin`, { method: "POST" });
}

/** DELETE /looks/{id}/pin — unpin a saved look */
export async function unpinSavedLook(id: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/looks/${id}/pin`, { method: "DELETE" });
}

/** GET /looks/pins — pinned looks ordered by slot */
export async function listPinnedLooks(): Promise<SavedLook[]> {
  return apiFetch<SavedLook[]>("/looks/pins");
}

/** POST /products/resolve — resolve product from store page (extension use) */
export async function resolveProduct(
  body: ResolveProductRequest
): Promise<ResolveProductResponse> {
  return apiFetch<ResolveProductResponse>("/products/resolve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
