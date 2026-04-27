-- AlterTable
ALTER TABLE "MasterCV" ADD COLUMN     "geminiCacheExpiresAt" TIMESTAMP(3),
ADD COLUMN     "geminiCacheName" TEXT;
