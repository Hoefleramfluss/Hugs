-- Add taxRate column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Product'
      AND column_name = 'taxRate'
  ) THEN
    ALTER TABLE "Product"
      ADD COLUMN "taxRate" INTEGER NOT NULL DEFAULT 20;
  END IF;
END;
$$;
