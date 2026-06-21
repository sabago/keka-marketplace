import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Import SiteSettings interface from useSettings
import { SiteSettings } from '@/lib/useSettings';

// Default settings
const defaultSettings: SiteSettings = {
  siteName: "Digital Marketplace",
  siteDescription: "Your one-stop shop for digital products",
  contactEmail: "contact@example.com",
  currency: "USD",
  downloadExpiryDays: 30,
  maxDownloadsPerPurchase: 5,
  allowGuestCheckout: true,
  requireEmailVerification: false,
  enableReviews: true,
  enableRatings: true,
  enableWishlist: false,
  enableNewsletter: false,
  maintenanceMode: false,
  memberDiscountPercentage: 10, // Default 10% discount for members
};

// Settings file path
const settingsFilePath = path.join(process.cwd(), 'data', 'settings.json');

// Helper function to ensure the data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Helper function to read settings from file
async function readSettings(): Promise<SiteSettings> {
  try {
    await ensureDataDirectory();
    
    try {
      const data = await fs.readFile(settingsFilePath, 'utf8');
      return JSON.parse(data);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // If file doesn't exist or is invalid, create it with default settings
      await fs.writeFile(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error reading settings:', error);
    return defaultSettings;
  }
}

// Helper function to write settings to file
async function writeSettings(settings: SiteSettings): Promise<void> {
  try {
    await ensureDataDirectory();
    await fs.writeFile(settingsFilePath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error writing settings:', error);
    throw new Error('Failed to save settings');
  }
}

// GET /api/admin/settings - Get site settings
export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update site settings
export async function PUT(request: Request) {
  try {
    const newSettings = await request.json();
    
    // Validate settings
    if (!newSettings.siteName || !newSettings.contactEmail) {
      return NextResponse.json(
        { error: 'Site name and contact email are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newSettings.contactEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Ensure numeric values are valid
    if (
      newSettings.downloadExpiryDays < 1 ||
      newSettings.downloadExpiryDays > 365 ||
      newSettings.maxDownloadsPerPurchase < 1 ||
      newSettings.maxDownloadsPerPurchase > 100 ||
      newSettings.memberDiscountPercentage < 0 ||
      newSettings.memberDiscountPercentage > 100
    ) {
      return NextResponse.json(
        { error: 'Invalid numeric values' },
        { status: 400 }
      );
    }
    
    // Save settings
    await writeSettings(newSettings);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
