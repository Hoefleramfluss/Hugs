-- PROD hotfix: add missing Product.featured column
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
