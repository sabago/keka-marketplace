-- CreateTable
CREATE TABLE "KnowledgeBaseArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "tags" TEXT[],
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBaseArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBaseArticle_slug_key" ON "KnowledgeBaseArticle"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_state_idx" ON "KnowledgeBaseArticle"("state");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_published_idx" ON "KnowledgeBaseArticle"("published");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_slug_idx" ON "KnowledgeBaseArticle"("slug");
