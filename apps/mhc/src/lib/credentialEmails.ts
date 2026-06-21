/**
 * Re-exports credential email functions from @mhc/credential-core.
 * All existing MHC call sites continue to work unchanged — MHC_BRAND is the default.
 */
export {
  sendCredentialExpiringReminder,
  sendCredentialExpiredNotification,
  sendCredentialApprovedNotification,
  sendCredentialRejectedNotification,
  sendWeeklyComplianceDigest,
} from '@mhc/credential-core';

export type { EmailBrandContext } from '@mhc/credential-core';
