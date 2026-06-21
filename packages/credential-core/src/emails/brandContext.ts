/**
 * Email brand context for credential notification emails.
 * Pass the appropriate brand when calling email functions so both
 * MHC and CredTrack can share the same templates with distinct branding.
 */

export interface EmailBrandContext {
  /** Base URL of the sending app, e.g. 'https://app.masteringhomecare.com' */
  siteUrl: string;
  /** Product display name shown in email footers */
  productName: string;
  /** SES "From" address, must be verified in AWS SES */
  fromEmail: string;
  /** Primary hex color for header gradients and CTA buttons */
  primaryColor: string;
  /** Secondary hex color for header gradient end */
  secondaryColor: string;
  /** Signature line at the bottom of each email */
  teamSignature: string;
  /** Path to the credentials dashboard, appended to siteUrl */
  credentialsDashboardPath: string;
}

/** MHC brand defaults — used when no brand is passed, preserving backward compatibility. */
export const MHC_BRAND: EmailBrandContext = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  productName: 'Mastering HomeCare',
  fromEmail: process.env.SES_SENDER_EMAIL || 'noreply@masteringhomecare.com',
  primaryColor: '#0B4F96',
  secondaryColor: '#48ccbc',
  teamSignature: 'Your Agency HR Team',
  credentialsDashboardPath: '/dashboard',
};

/** CredTrack brand — used by the standalone CredTrack app. */
export const CREDTRACK_BRAND: EmailBrandContext = {
  siteUrl: process.env.CREDTRACK_SITE_URL || 'http://localhost:3001',
  productName: 'CredTrack by Mastering HomeCare',
  fromEmail: process.env.CT_SES_SENDER_EMAIL || 'noreply@credtrack.masteringhomecare.com',
  primaryColor: '#0B4F96',
  secondaryColor: '#48ccbc',
  teamSignature: 'The CredTrack Team',
  credentialsDashboardPath: '/credentials',
};
