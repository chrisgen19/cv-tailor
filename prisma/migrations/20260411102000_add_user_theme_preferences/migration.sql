-- AlterTable
ALTER TABLE "User"
ADD COLUMN "themeMode" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN "themeAccent" TEXT NOT NULL DEFAULT 'teal';
