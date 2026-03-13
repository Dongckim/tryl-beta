-- Add product_image_url to tryon_results (uploaded to S3 when user saves to closet).
ALTER TABLE tryon_results ADD COLUMN IF NOT EXISTS product_image_url TEXT;
