// This script tests the connection to the Railway PostgreSQL database
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Log the environment variables
console.log('Environment variables loaded:');
console.log('DIRECT_DATABASE_URL exists:', !!process.env.DIRECT_DATABASE_URL);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

// Use the direct connection URL or fall back to DATABASE_URL
const connectionUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

// Create a new Prisma client instance with the connection URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl,
    },
  },
});

// Log the connection URL (without sensitive data)
console.log('Using connection URL:', connectionUrl?.replace(/\/\/[^:]+:[^@]+@/, '//[REDACTED]:[REDACTED]@'));

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/\/\/[^:]+:[^@]+@/, '//[REDACTED]:[REDACTED]@'));
    
    // Try to query the database
    const categoriesCount = await prisma.category.count();
    console.log('Connection successful!');
    console.log('Categories count:', categoriesCount);
    
    // Try to get some categories
    const categories = await prisma.category.findMany({ take: 5 });
    console.log('Categories:', categories);
    
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testConnection()
  .then(success => {
    console.log('Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
