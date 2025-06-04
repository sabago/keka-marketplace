// Script to apply the SEO tags migration to the database
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
        AND table_name = 'ProductTag'
      );
    `;
    
    const tableExists = await client.query(checkTableSql);
    
    if (tableExists.rows[0].exists) {
      console.log('ProductTag table already exists, skipping table creation');
    } else {
      console.log('Applying migration: Add ProductTag table');
      
      // Create ProductTag table
      await client.query(`
        CREATE TABLE "ProductTag" (
          "id" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "tag" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("id")
        );
      `);

      // Add foreign key constraint
      await client.query(`
        ALTER TABLE "ProductTag" 
        ADD CONSTRAINT "ProductTag_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "Product"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);

      // Create indexes for faster lookups
      await client.query(`
        CREATE INDEX "ProductTag_productId_idx" ON "ProductTag"("productId");
      `);
      
      await client.query(`
        CREATE INDEX "ProductTag_tag_idx" ON "ProductTag"("tag");
      `);
      
      console.log('Migration applied successfully');
    }

    // Update the _prisma_migrations table to record this migration
    const migrationName = '20250414_add_seo_tags';
    const migrationId = '20250414_seo_tags'; // Shorter ID
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
        'add_seo_tags',
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
