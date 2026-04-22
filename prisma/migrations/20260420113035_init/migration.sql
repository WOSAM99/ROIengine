-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('water', 'mold', 'fire', 'recon', 'cleaning', 'other');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('active', 'in_progress', 'on_hold', 'delayed', 'waiting', 'completed', 'cancelled', 'unknown');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColumnMapping" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColumnMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "status" "UploadStatus" NOT NULL DEFAULT 'PROCESSING',
    "targetMargin" DECIMAL(5,4) NOT NULL DEFAULT 0.30,
    "mappingId" TEXT,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "errorMessage" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "clientName" TEXT,
    "projectType" "JobType",
    "status" "JobStatus",
    "projectManager" TEXT,
    "invoiceAmount" DECIMAL(14,2) NOT NULL,
    "jobCost" DECIMAL(14,2) NOT NULL,
    "cashReceived" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "laborHours" DECIMAL(10,2),
    "arBucket" TEXT,
    "startDate" TIMESTAMP(3),
    "finishDate" TIMESTAMP(3),
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "uploadId" TEXT,
    "question" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "sqlRan" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheCreationTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "Membership_companyId_idx" ON "Membership"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_profileId_companyId_key" ON "Membership"("profileId", "companyId");

-- CreateIndex
CREATE INDEX "ColumnMapping_companyId_idx" ON "ColumnMapping"("companyId");

-- CreateIndex
CREATE INDEX "Upload_companyId_uploadedAt_idx" ON "Upload"("companyId", "uploadedAt");

-- CreateIndex
CREATE INDEX "Job_companyId_uploadId_idx" ON "Job"("companyId", "uploadId");

-- CreateIndex
CREATE INDEX "Job_companyId_projectType_idx" ON "Job"("companyId", "projectType");

-- CreateIndex
CREATE INDEX "Job_companyId_projectManager_idx" ON "Job"("companyId", "projectManager");

-- CreateIndex
CREATE INDEX "Job_companyId_arBucket_idx" ON "Job"("companyId", "arBucket");

-- CreateIndex
CREATE INDEX "ChatMessage_companyId_createdAt_idx" ON "ChatMessage"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColumnMapping" ADD CONSTRAINT "ColumnMapping_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
