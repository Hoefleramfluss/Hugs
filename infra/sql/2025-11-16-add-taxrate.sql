-- PROD hotfix: add missing Product.taxRate column
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "taxRate" INTEGER NOT NULL DEFAULT 20;
