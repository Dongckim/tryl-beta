import { API_BASE_URL } from "./config";

/** Auth token for API requests. Set when user signs in; cleared on sign out. */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers as Record<string, string>) },
  });
  const data = (await res.json().catch(() => ({}))) as { detail?: string };
  if (!res.ok) throw new Error(data.detail ?? `API ${res.status}`);
  return data as T;
}

// --- Request/response types (match backend) ---

export interface ResolveProductPayload {
  sourceSite: string;
  sourceUrl: string;
  title: string;
  imageUrl: string;
  priceText?: string | null;
  brand?: string | null;
  categoryHint?: string | null;
}

export interface ResolveProductResponse {
  /** API returns camelCase (productId); extension accepts both. */
  productId?: number;
  product_id?: number;
  source_site: string;
  title: string;
  category: string | null;
  canonical_image_url: string;
}

export interface CreateTryOnJobResponse {
  /** API returns camelCase (jobId); extension accepts both. */
  jobId?: number;
  job_id?: number;
  status: string;
}

export interface ProfileVersion {
  id: number;
  user_profile_id: number;
  front_image_url: string;
  side_image_url: string;
  back_image_url: string | null;
  front_mask_url: string | null;
  side_mask_url: string | null;
  created_at: string;
}

export interface ListProfileVersionsResponse {
  versions: ProfileVersion[];
}

export interface TryOnJobStatusResponse {
  id: number;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TryOnResultResponse {
  id: number;
  tryon_job_id: number;
  result_image_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

export interface UploadProductImageResponse {
  url: string;
}

export interface SaveLookPayload {
  // Legacy path: save an existing try-on result row.
  tryonResultId?: number;
  // New path: save directly from a completed job id (uses Redis temp cache).
  jobId?: number;
  note?: string | null;
}

export interface SaveLookResponse {
  id: number;
  tryon_result_id: number;
  note: string | null;
  created_at: string;
  result_image_url: string;
  thumbnail_url: string | null;
}

// --- Auth ---

export interface SignInPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: { id: string; email: string };
}

export async function signIn(payload: SignInPayload): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>("/auth/sign-in", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res;
}

// --- API functions ---

export async function resolveProduct(
  payload: ResolveProductPayload
): Promise<ResolveProductResponse> {
  const body = {
    sourceSite: payload.sourceSite,
    sourceUrl: payload.sourceUrl,
    title: payload.title,
    imageUrl: payload.imageUrl,
    priceText: payload.priceText ?? null,
    brand: payload.brand ?? null,
    categoryHint: payload.categoryHint ?? null,
  };
  return apiFetch<ResolveProductResponse>("/products/resolve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createTryOnJob(
  productId: number,
  fittingProfileVersionId?: number | null,
  productImageUrlOverride?: string | null,
  profilePhotoIndex?: 1 | 2
): Promise<CreateTryOnJobResponse> {
  if (typeof productId !== "number" || !Number.isInteger(productId)) {
    throw new Error("Invalid productId");
  }
  const body: Record<string, unknown> = { productId };
  if (typeof fittingProfileVersionId === "number" && Number.isInteger(fittingProfileVersionId)) {
    body.fittingProfileVersionId = fittingProfileVersionId;
  }
  if (productImageUrlOverride) {
    body.productImageUrlOverride = productImageUrlOverride;
  }
  if (profilePhotoIndex === 1 || profilePhotoIndex === 2) {
    body.profilePhotoIndex = profilePhotoIndex;
  }
  return apiFetch<CreateTryOnJobResponse>("/tryon/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function uploadProductImage(
  file: Blob,
  filename = "product.jpg"
): Promise<UploadProductImageResponse> {
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch(`${API_BASE_URL}/uploads/product-image`, {
    method: "POST",
    // Auth header only; let browser set multipart boundary.
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as { detail?: string };
  if (!res.ok) throw new Error(data.detail ?? `API ${res.status}`);
  return data as UploadProductImageResponse;
}

export async function getTryOnJob(jobId: number): Promise<TryOnJobStatusResponse> {
  return apiFetch<TryOnJobStatusResponse>(`/tryon/jobs/${jobId}`);
}

export async function getTryOnResult(jobId: number): Promise<TryonResultResponse> {
  return apiFetch<TryOnResultResponse>(`/tryon/jobs/${jobId}/result`);
}

/** DEV: Mark job completed with mock result. Only when API app_env is development. */
export async function mockCompleteJob(jobId: number): Promise<TryOnResultResponse> {
  return apiFetch<TryOnResultResponse>(`/tryon/jobs/${jobId}/mock-complete`, {
    method: "POST",
  });
}

export async function saveLook(payload: SaveLookPayload): Promise<SaveLookResponse> {
  return apiFetch<SaveLookResponse>("/looks/save", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listProfileVersions(): Promise<ListProfileVersionsResponse> {
  return apiFetch<ListProfileVersionsResponse>("/profiles/me/versions");
}
