/** Fit preference for profile. */
export type FitPreference = "slim" | "regular" | "relaxed" | "oversized";

/** Subscription tier for a user. */
export type UserPlan = "free" | "pro";

/** User profile (user_profiles row). */
export interface Profile {
  id: number;
  user_id: number;
  height_cm: number;
  weight_kg: number | null;
  fit_preference: string;
  default_profile_version_id: number | null;
  created_at: string;
}

/** Fitting profile version (fitting_profile_versions row). */
export interface FittingProfileVersion {
  id: number;
  user_profile_id: number;
  front_image_url: string;
  side_image_url: string;
  back_image_url: string | null;
  front_mask_url: string | null;
  side_mask_url: string | null;
  created_at: string;
}

/** Response from GET /profiles/me */
export interface MyProfileResponse {
  profile: Profile;
  default_version: FittingProfileVersion | null;
  /** User subscription tier (backend defaults to 'free'). */
  plan: UserPlan;
}

/** Response from GET /profiles/me/versions */
export interface ProfileVersionsResponse {
  versions: FittingProfileVersion[];
}

/** Request for POST /profiles */
export interface CreateProfileRequest {
  height_cm: number;
  weight_kg?: number | null;
  fit_preference: FitPreference;
}

/** Request for PATCH /profiles/me */
export interface UpdateProfileRequest {
  height_cm?: number | null;
  weight_kg?: number | null;
  fit_preference?: FitPreference | null;
  default_profile_version_id?: number | null;
}

/** Request for POST /profiles/me/versions */
export interface CreateProfileVersionRequest {
  front_image_url: string;
  side_image_url: string;
  back_image_url?: string | null;
  front_mask_url?: string | null;
  side_mask_url?: string | null;
}

/** Saved look (archive item). */
export interface SavedLook {
  id: number;
  tryon_result_id: number;
  note: string | null;
  created_at: string;
  result_image_url: string;
  thumbnail_url: string | null;
  product_image_url?: string | null;
  product_title?: string | null;
  product_url?: string | null;
  product_price?: string | null;
  pinned?: boolean;
  pinned_slot?: number | null;
}

/** Request for POST /products/resolve (extension use). */
export interface ResolveProductRequest {
  sourceSite: string;
  sourceUrl: string;
  title: string;
  imageUrl: string;
  priceText?: string | null;
  brand?: string | null;
  categoryHint?: string | null;
}

/** Response from POST /products/resolve */
export interface ResolveProductResponse {
  productId: number;
  sourceSite: string;
  title: string;
  category: string | null;
  canonicalImageUrl: string;
}
