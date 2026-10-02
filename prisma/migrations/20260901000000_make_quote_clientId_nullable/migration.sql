-- AlterTable: Make clientId nullable and change onDelete to SetNull
ALTER TABLE "quotes" ALTER COLUMN "client_id" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_client_id_fkey";

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
