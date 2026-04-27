ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "assignedRiderId" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "zone" TEXT;

ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "riderNumber" TEXT;
ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "vehicle" TEXT;
ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "depotName" TEXT;
ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "joiningDate" TIMESTAMP(3);
ALTER TABLE "Rider" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Rider" SET "phoneNumber" = "phone" WHERE "phoneNumber" IS NULL;
UPDATE "Rider" SET "city" = "zone" WHERE "city" IS NULL;
UPDATE "Rider" SET "location" = "zone" WHERE "location" IS NULL;
UPDATE "Rider" SET "vehicle" = 'Bike' WHERE "vehicle" IS NULL;
UPDATE "Rider" SET "depotName" = COALESCE("location", "zone") WHERE "depotName" IS NULL;
UPDATE "Rider" SET "riderNumber" = 'RDR-' || LPAD("id"::text, 5, '0') WHERE "riderNumber" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Rider_riderNumber_key" ON "Rider"("riderNumber");
