 -- Create ProductTag table
CREATE TABLE "ProductTag" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for faster lookups
CREATE INDEX "ProductTag_productId_idx" ON "ProductTag"("productId");
CREATE INDEX "ProductTag_tag_idx" ON "ProductTag"("tag");
