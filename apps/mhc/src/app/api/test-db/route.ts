import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getConnectionString } from '@/lib/dbConfig';

/**
 * GET handler for testing database connection
 * This endpoint is useful for verifying that the database connection is working correctly
 * It returns information about the database connection and the number of categories in the database
 */
export async function GET() {
  try {
    // Get the database connection string
    const connectionString = getConnectionString();
    // Sanitize the connection string to hide sensitive information
    const sanitizedUrl = connectionString.replace(/\/\/[^:]+:[^@]+@/, '//[REDACTED]:[REDACTED]@');
    
    // Get environment variables
    const pgHost = process.env.PGHOST;
    const pgUser = process.env.PGUSER;
    const pgDatabase = process.env.PGDATABASE;
    const pgPort = process.env.PGPORT;
    const directDbUrl = process.env.DIRECT_DATABASE_URL ? 'Set' : 'Not set';
    const dbUrl = process.env.DATABASE_URL ? 'Set' : 'Not set';
    
    // Query the database
    const categoriesCount = await prisma.category.count();
    const categories = await prisma.category.findMany({ take: 5 });
    
    // Return the results
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      connectionInfo: {
        connectionString: sanitizedUrl,
        pgHost,
        pgUser,
        pgDatabase,
        pgPort,
        directDbUrl,
        dbUrl,
        nodeEnv: process.env.NODE_ENV,
      },
      data: {
        categoriesCount,
        categories,
      },
    });
  } catch (error) {
    console.error('Error testing database connection:', error);
    
    // Return detailed error information
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
      },
      { status: 500 }
    );
  }
}
