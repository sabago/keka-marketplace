import { promises as fs } from 'fs';
import path from 'path';

// Import SiteSettings interface from useSettings
import { SiteSettings } from './useSettings';

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

/**
 * Read settings from file
 * @returns Site settings
 */
export async function getSettings(): Promise<SiteSettings> {
  try {
    const data = await fs.readFile(settingsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading settings:', error);
    return defaultSettings;
  }
}
