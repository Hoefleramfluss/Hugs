-- PROD hotfix: add missing ProductImage.priority column
ALTER TABLE "ProductImage"
  ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;
