-- Tryl PostgreSQL schema
-- Run with: psql $DATABASE_URL -f schema.sql

-- Users (auth identity)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User fitting profiles (one user can have multiple)
CREATE TABLE user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    height_cm NUMERIC(5, 2) NOT NULL,
    weight_kg NUMERIC(5, 2),
    fit_preference VARCHAR(50) NOT NULL,
    default_profile_version_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);

-- Fitting profile versions (images, masks, pose data per version)
CREATE TABLE fitting_profile_versions (
    id BIGSERIAL PRIMARY KEY,
    user_profile_id BIGINT NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    front_image_url TEXT NOT NULL,
    side_image_url TEXT NOT NULL,
    back_image_url TEXT,
    front_mask_url TEXT,
    side_mask_url TEXT,
    front_pose_json JSONB,
    side_pose_json JSONB,
    quality_score NUMERIC(5, 4),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles
    ADD CONSTRAINT fk_user_profiles_default_version
    FOREIGN KEY (default_profile_version_id) REFERENCES fitting_profile_versions (id) ON DELETE SET NULL;

CREATE INDEX idx_fitting_profile_versions_user_profile_id ON fitting_profile_versions (user_profile_id);
CREATE INDEX idx_fitting_profile_versions_is_active ON fitting_profile_versions (user_profile_id, is_active) WHERE is_active = true;

-- Products (from supported stores)
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    source_site VARCHAR(50) NOT NULL,
    source_url TEXT NOT NULL,
    title TEXT NOT NULL,
    brand VARCHAR(100),
    category VARCHAR(100),
    price_text VARCHAR(50),
    image_url TEXT NOT NULL,
    canonical_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_site, source_url)
);

CREATE INDEX idx_products_source_site ON products (source_site);
CREATE INDEX idx_products_canonical_hash ON products (canonical_hash) WHERE canonical_hash IS NOT NULL;

-- Try-on jobs (async, stateful)
CREATE TABLE tryon_jobs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    fitting_profile_version_id BIGINT NOT NULL REFERENCES fitting_profile_versions (id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    provider VARCHAR(50),
    cache_key VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    override_product_image_url TEXT,
    CONSTRAINT chk_tryon_jobs_status CHECK (status IN ('queued', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_tryon_jobs_user_id ON tryon_jobs (user_id);
CREATE INDEX idx_tryon_jobs_status ON tryon_jobs (status);
CREATE INDEX idx_tryon_jobs_created_at ON tryon_jobs (created_at DESC);

-- Try-on results (one per job when completed)
CREATE TABLE tryon_results (
    id BIGSERIAL PRIMARY KEY,
    tryon_job_id BIGINT NOT NULL REFERENCES tryon_jobs (id) ON DELETE CASCADE UNIQUE,
    result_image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    product_image_url TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tryon_results_tryon_job_id ON tryon_results (tryon_job_id);

-- Saved looks (user bookmarks a result)
CREATE TABLE saved_looks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tryon_result_id BIGINT NOT NULL REFERENCES tryon_results (id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, tryon_result_id)
);

CREATE INDEX idx_saved_looks_user_id ON saved_looks (user_id);

-- Pinned looks (user-curated subset of saved looks, max 4 enforced in service)
CREATE TABLE pinned_looks (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    slot SMALLINT NOT NULL,
    saved_look_id BIGINT NOT NULL REFERENCES saved_looks (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, slot),
    UNIQUE (user_id, saved_look_id),
    CONSTRAINT chk_pinned_looks_slot CHECK (slot IN (0, 1, 2, 3))
);

CREATE INDEX idx_pinned_looks_user_id ON pinned_looks (user_id, slot);
