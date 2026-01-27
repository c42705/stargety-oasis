-- AlterTable
ALTER TABLE "users" ADD COLUMN "ntfy_topic_id" TEXT UNIQUE,
ADD COLUMN "two_fa_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "two_fa_code_hash" TEXT,
ADD COLUMN "two_fa_code_expires_at" TIMESTAMP(3),
ADD COLUMN "two_fa_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "password_reset_token" TEXT UNIQUE,
ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);

