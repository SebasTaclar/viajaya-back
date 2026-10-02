-- AlterTable
ALTER TABLE "clients" ADD COLUMN "user_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_clients_user_id" ON "clients"("user_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
