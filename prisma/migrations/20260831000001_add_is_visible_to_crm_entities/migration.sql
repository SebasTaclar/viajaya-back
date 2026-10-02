-- AlterTable
ALTER TABLE "clients" ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenders" ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "events" ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "idx_clients_is_visible" ON "clients"("is_visible");

-- CreateIndex
CREATE INDEX "idx_projects_is_visible" ON "projects"("is_visible");

-- CreateIndex
CREATE INDEX "idx_quotes_is_visible" ON "quotes"("is_visible");

-- CreateIndex
CREATE INDEX "idx_tenders_is_visible" ON "tenders"("is_visible");

-- CreateIndex
CREATE INDEX "idx_events_is_visible" ON "events"("is_visible");

-- CreateIndex
CREATE INDEX "idx_documents_is_visible" ON "documents"("is_visible");
