// Script to apply the migration to the production database
const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function applyMigration() {
  const client = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to the database...');
    await client.connect();
    console.log('Connected to the database');

    console.log('Applying migration: Add description and icon columns to Category table');
    
    // Apply the migration
    await client.query('ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "description" TEXT;');
    await client.query('ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "icon" TEXT;');
    
    console.log('Migration applied successfully');

    // Update the _prisma_migrations table to record this migration
    const migrationName = '20250406_add_description_and_icon_to_category';
    const migrationId = '20250406000000_add_desc_icon'; // Shorter ID
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
        'add_description_and_icon_to_category',
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
