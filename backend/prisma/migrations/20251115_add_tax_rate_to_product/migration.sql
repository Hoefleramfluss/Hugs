-- Add Product.taxRate column to align production DB with Prisma schema
ALTER TABLE "Product"
  ADD COLUMN "taxRate" INTEGER NOT NULL DEFAULT 20;
