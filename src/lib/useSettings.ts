"use client";

import { useState, useEffect } from "react";

// Define settings type
export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  currency: string;
  downloadExpiryDays: number;
  maxDownloadsPerPurchase: number;
  allowGuestCheckout: boolean;
  requireEmailVerification: boolean;
  enableReviews: boolean;
  enableRatings: boolean;
  enableWishlist: boolean;
  enableNewsletter: boolean;
  maintenanceMode: boolean;
  memberDiscountPercentage: number; // Discount percentage for logged-in WordPress users
}

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

export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/admin/settings");
        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }
        const data = await response.json();
        setSettings(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching settings:", err);
        setError("Failed to load settings. Using defaults.");
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading, error };
}

// Helper function to format currency based on settings
export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}
