// Script to apply the product images and video migration to the database
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  const client = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('Connecting to the database...');
    await client.connect();
    console.log('Connected to the database');

    console.log('Checking if migration has been applied...');
    
    // Check if tables exist
    const checkTableSql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ProductImage'
      );
    `;
    
    const tableExists = await client.query(checkTableSql);
    
    if (tableExists.rows[0].exists) {
      console.log('Tables already exist, skipping table creation');
    } else {
      console.log('Applying migration: Add ProductImage and ProductVideo tables');
      
      // Create ProductImage table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "ProductImage" (
          "id" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "imageUrl" TEXT NOT NULL,
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
        );
      `);

      // Create ProductVideo table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "ProductVideo" (
          "id" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "videoUrl" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProductVideo_pkey" PRIMARY KEY ("id")
        );
      `);

      // Create unique index on ProductVideo.productId
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "ProductVideo_productId_key" ON "ProductVideo"("productId");
      `);

      // Add foreign key constraints
      await client.query(`
        ALTER TABLE "ProductImage" 
        ADD CONSTRAINT IF NOT EXISTS "ProductImage_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "Product"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);

      await client.query(`
        ALTER TABLE "ProductVideo" 
        ADD CONSTRAINT IF NOT EXISTS "ProductVideo_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "Product"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      
      console.log('Migration applied successfully');
    }

    // Update the _prisma_migrations table to record this migration
    const migrationName = '20250413131358_add_product_images_and_video';
    const migrationId = '20250413_product_images'; // Shorter ID
    const checkMigrationSql = 'SELECT id FROM "_prisma_migrations" WHERE migration_name = $1';
    const result = await client.query(checkMigrationSql, [migrationName]);
    
    if (result.rows.length === 0) {
      console.log('Recording migration in _prisma_migrations table');
      const insertMigrationSql = `
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      const now = new Date();
      await client.query(insertMigrationSql, [
        migrationId,
        'add_product_images_and_video',
        now,
        migrationName,
        null,
        null,
        now,
        1
      ]);
      console.log('Migration recorded successfully');
    } else {
      console.log('Migration already recorded in _prisma_migrations table');
    }

  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

applyMigration();
