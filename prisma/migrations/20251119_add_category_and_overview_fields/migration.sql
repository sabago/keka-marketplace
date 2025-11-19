-- AlterTable
ALTER TABLE "KnowledgeBaseArticle" ADD COLUMN "category" TEXT,
ADD COLUMN "isOverview" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_category_idx" ON "KnowledgeBaseArticle"("category");
