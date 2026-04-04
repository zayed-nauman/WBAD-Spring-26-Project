-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PREPAID', 'COD');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('RETURN_INITIATED', 'RETURN_IN_TRANSIT', 'RETURNED_RECEIVED', 'INSPECTION_DECISION', 'REFUND_PROCESS', 'REFUND_REQUESTED', 'REFUNDED', 'RESTOCKED');

-- CreateEnum
CREATE TYPE "InspectionDecision" AS ENUM ('PENDING', 'DAMAGED', 'RESELLABLE');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NOT_APPLICABLE', 'REQUESTED', 'REFUNDED');

-- CreateTable
CREATE TABLE "ReturnCase" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "returnStatus" "ReturnStatus" NOT NULL DEFAULT 'RETURN_INITIATED',
    "inspectionDecision" "InspectionDecision" NOT NULL DEFAULT 'PENDING',
    "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "refundAmount" DECIMAL(10,2),
    "adminApprovedForCod" BOOLEAN NOT NULL DEFAULT false,
    "restocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnCase_orderId_key" ON "ReturnCase"("orderId");
