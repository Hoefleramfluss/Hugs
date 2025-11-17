-- PROD hotfix: add missing ProductVariant.attributes column
ALTER TABLE "ProductVariant"
  ADD COLUMN IF NOT EXISTS "attributes" JSONB;
