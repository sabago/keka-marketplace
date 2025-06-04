// Script to manually apply the SEO tags migration
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to run a command and log its output
function runCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return output;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.stdout);
    console.error(error.stderr);
    process.exit(1);
  }
}

// Main function to apply the migration
async function applyMigration() {

  // Read the migration SQL file
  const migrationPath = path.join(__dirname, 'prisma/migrations/20250414_add_seo_tags/migration.sql');
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found at: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
 

  // Create a temporary SQL file to execute
  const tempSQLPath = path.join(__dirname, 'temp-migration.sql');
  
  // Fix any syntax issues in the SQL
  const fixedSQL = migrationSQL.replace(/\r\n/g, '\n').replace(/\n/g, '\n');
  fs.writeFileSync(tempSQLPath, fixedSQL);

  // Get database connection info from .env file
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error(`Environment file not found at: ${envPath}`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const databaseURLMatch = envContent.match(/DATABASE_URL=["']?(.*?)["']?$/m);
  
  if (!databaseURLMatch) {
    console.error('DATABASE_URL not found in .env file');
    process.exit(1);
  }

  const databaseURL = databaseURLMatch[1];


  // Extract database connection details
  const dbMatch = databaseURL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!dbMatch) {
    console.error('Invalid DATABASE_URL format');
    process.exit(1);
  }

  const [, username, password, host, port, dbname] = dbMatch;

  // Set PGPASSWORD environment variable for psql
  process.env.PGPASSWORD = password;

  // Execute the SQL file using psql
  try {
    runCommand(`psql -h ${host} -p ${port} -U ${username} -d ${dbname} -f ${tempSQLPath}`);
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    // Clean up temporary file
    fs.unlinkSync(tempSQLPath);
  }
}

// Run the migration
applyMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
