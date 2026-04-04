-- AlterTable
ALTER TABLE "ReturnCase"
ADD COLUMN "customerId" INTEGER,
ADD COLUMN "orderTerminalStatus" TEXT,
ADD COLUMN "inventoryAdjustedAt" TIMESTAMP(3),
ADD COLUMN "lossRecordedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ReturnCaseHistory" (
    "id" SERIAL NOT NULL,
    "returnCaseId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "ReturnStatus",
    "toStatus" "ReturnStatus",
    "actorRole" TEXT,
    "actorId" INTEGER,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnCaseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" SERIAL NOT NULL,
    "returnCaseId" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LossRecord" (
    "id" SERIAL NOT NULL,
    "returnCaseId" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LossRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReturnCaseHistory_returnCaseId_createdAt_idx" ON "ReturnCaseHistory"("returnCaseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAdjustment_returnCaseId_key" ON "InventoryAdjustment"("returnCaseId");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_orderId_idx" ON "InventoryAdjustment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "LossRecord_returnCaseId_key" ON "LossRecord"("returnCaseId");

-- CreateIndex
CREATE INDEX "LossRecord_orderId_idx" ON "LossRecord"("orderId");

-- AddForeignKey
ALTER TABLE "ReturnCaseHistory" ADD CONSTRAINT "ReturnCaseHistory_returnCaseId_fkey"
FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_returnCaseId_fkey"
FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LossRecord" ADD CONSTRAINT "LossRecord_returnCaseId_fkey"
FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;