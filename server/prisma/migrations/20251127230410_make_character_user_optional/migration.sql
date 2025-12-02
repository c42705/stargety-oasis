-- DropForeignKey
ALTER TABLE "characters" DROP CONSTRAINT "characters_userId_fkey";

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "userFk" TEXT;

-- CreateIndex
CREATE INDEX "characters_userFk_idx" ON "characters"("userFk");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_userFk_fkey" FOREIGN KEY ("userFk") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
