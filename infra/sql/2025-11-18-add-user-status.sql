-- Stellt sicher, dass die Spalte "status" zur Tabelle "User" passt
-- zum Prisma-Schema: status String @default("ACTIVE")

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
