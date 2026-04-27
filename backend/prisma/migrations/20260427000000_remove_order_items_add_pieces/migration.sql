ALTER TABLE "Order" ADD COLUMN "numberOfPieces" INTEGER NOT NULL DEFAULT 1;

UPDATE "Order"
SET "numberOfPieces" = GREATEST(
  1,
  COALESCE(NULLIF(regexp_replace(COALESCE("items", ''), '\D', '', 'g'), '')::INTEGER, 1)
);

ALTER TABLE "Order" DROP COLUMN "items";
