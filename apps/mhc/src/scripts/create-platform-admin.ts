/**
 * Interactive CLI Script to Create a Platform Admin User
 *
 * This script provides a safe, interactive way to bootstrap platform admin accounts.
 * Platform admins have elevated privileges to manage agencies, users, and system settings.
 *
 * Features:
 * - Interactive prompts for email, name, and password
 * - Email format validation
 * - Password confirmation to prevent typos
 * - Duplicate email checking
 * - Secure password hashing using bcryptjs (12 rounds)
 * - Auto-verification of email address
 *
 * Usage:
 *   npm run create-admin
 *   or
 *   npx tsx src/scripts/create-platform-admin.ts
 */

import * as readline from 'readline';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Create readline interface for interactive prompts
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Promisified question wrapper for readline
 */
function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Validate email format using regex
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 8 characters for basic security
 */
function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Display welcome banner
 */
function displayBanner() {
  console.log('\n' + colors.cyan + colors.bright + '='.repeat(60));
  console.log('   PLATFORM ADMIN CREATION WIZARD');
  console.log('='.repeat(60) + colors.reset);
  console.log('\nThis script will create a new platform administrator account.');
  console.log('Platform admins can manage agencies, users, and system settings.\n');
}

/**
 * Main script execution
 */
async function createPlatformAdmin() {
  try {
    displayBanner();

    // Step 1: Get and validate email
    let email = '';
    while (!email) {
      const input = await question(colors.blue + 'Email address: ' + colors.reset);

      if (!input) {
        console.log(colors.red + 'Error: Email is required.' + colors.reset);
        continue;
      }

      if (!isValidEmail(input)) {
        console.log(colors.red + 'Error: Invalid email format. Please enter a valid email address.' + colors.reset);
        continue;
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.toLowerCase() },
      });

      if (existingUser) {
        console.log(colors.red + 'Error: A user with this email already exists.' + colors.reset);
        console.log(`  User ID: ${existingUser.id}`);
        console.log(`  Role: ${existingUser.role}`);
        console.log(`  Created: ${existingUser.createdAt.toLocaleDateString()}\n`);

        const continuePrompt = await question(colors.yellow + 'Try a different email? (y/n): ' + colors.reset);
        if (continuePrompt.toLowerCase() !== 'y') {
          console.log('\nOperation cancelled.');
          process.exit(0);
        }
        continue;
      }

      email = input.toLowerCase();
    }

    console.log(colors.green + '✓ Email validated' + colors.reset + '\n');

    // Step 2: Get name
    let name = '';
    while (!name) {
      const input = await question(colors.blue + 'Full name: ' + colors.reset);

      if (!input) {
        console.log(colors.red + 'Error: Name is required.' + colors.reset);
        continue;
      }

      name = input;
    }

    console.log(colors.green + '✓ Name confirmed' + colors.reset + '\n');

    // Step 3: Get and validate password
    let password = '';
    while (!password) {
      const input = await question(colors.blue + 'Password (minimum 8 characters): ' + colors.reset);

      if (!input) {
        console.log(colors.red + 'Error: Password is required.' + colors.reset);
        continue;
      }

      if (!isValidPassword(input)) {
        console.log(colors.red + 'Error: Password must be at least 8 characters long.' + colors.reset);
        continue;
      }

      // Step 4: Confirm password
      const confirmation = await question(colors.blue + 'Confirm password: ' + colors.reset);

      if (input !== confirmation) {
        console.log(colors.red + 'Error: Passwords do not match. Please try again.' + colors.reset);
        continue;
      }

      password = input;
    }

    console.log(colors.green + '✓ Password confirmed' + colors.reset + '\n');

    // Step 5: Display summary and confirm
    console.log(colors.cyan + colors.bright + 'Summary:' + colors.reset);
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name}`);
    console.log(`  Role: ${UserRole.PLATFORM_ADMIN}`);
    console.log(`  Agency: None (platform admins are not associated with agencies)`);
    console.log(`  Email Verified: Yes (auto-verified)\n`);

    const confirm = await question(colors.yellow + 'Create this admin account? (y/n): ' + colors.reset);

    if (confirm.toLowerCase() !== 'y') {
      console.log('\nOperation cancelled.');
      process.exit(0);
    }

    // Step 6: Hash password and create user
    console.log('\n' + colors.cyan + 'Creating admin account...' + colors.reset);

    // Hash password with 12 rounds (consistent with auth.ts)
    const hashedPassword = await hash(password, 12);

    // Create the platform admin user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: UserRole.PLATFORM_ADMIN,
        agencyId: null, // Platform admins don't belong to agencies
        emailVerified: new Date(), // Mark as verified
      },
    });

    // Step 7: Display success message
    console.log('\n' + colors.green + colors.bright + '✅ SUCCESS!' + colors.reset);
    console.log('\n' + colors.cyan + 'Platform admin account created successfully:' + colors.reset);
    console.log('  ' + colors.bright + 'User ID:' + colors.reset + ' ' + user.id);
    console.log('  ' + colors.bright + 'Email:' + colors.reset + ' ' + user.email);
    console.log('  ' + colors.bright + 'Name:' + colors.reset + ' ' + user.name);
    console.log('  ' + colors.bright + 'Role:' + colors.reset + ' ' + user.role);
    console.log('  ' + colors.bright + 'Created:' + colors.reset + ' ' + user.createdAt.toLocaleString());
    console.log('  ' + colors.bright + 'Email Verified:' + colors.reset + ' ' + (user.emailVerified ? 'Yes' : 'No'));

    console.log('\n' + colors.cyan + 'Next steps:' + colors.reset);
    console.log('  1. Sign in at: ' + colors.blue + process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' + '/auth/signin' + colors.reset);
    console.log('  2. Use the email and password you just created');
    console.log('  3. Access the platform admin dashboard to manage agencies and users');

    console.log('\n' + colors.yellow + 'Security Note:' + colors.reset);
    console.log('  - Store your credentials securely');
    console.log('  - Do not share your admin password');
    console.log('  - Consider using a password manager');
    console.log('  - Enable 2FA if available\n');

  } catch (error) {
    console.error('\n' + colors.red + colors.bright + '❌ ERROR:' + colors.reset);

    if (error instanceof Error) {
      console.error(colors.red + error.message + colors.reset);

      // Provide helpful error messages for common issues
      if (error.message.includes('Unique constraint')) {
        console.error('\nThis email address is already registered in the system.');
      } else if (error.message.includes('connect')) {
        console.error('\nUnable to connect to the database. Please check your DATABASE_URL environment variable.');
      }
    } else {
      console.error(colors.red + 'An unexpected error occurred.' + colors.reset);
      console.error(error);
    }

    throw error;
  } finally {
    // Close readline interface
    rl.close();

    // Disconnect from database
    await prisma.$disconnect();
  }
}

// Execute the script
createPlatformAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n' + colors.red + '✗ Script failed' + colors.reset);
    process.exit(1);
  });
