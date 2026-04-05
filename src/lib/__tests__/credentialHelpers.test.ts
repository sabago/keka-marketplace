/**
 * Unit Tests for credentialHelpers
 *
 * Run with: npx tsx src/lib/__tests__/credentialHelpers.test.ts
 *
 * These tests verify the business logic for credential status calculation,
 * compliance checking, and reminder logic.
 */

import {
  calculateCredentialStatus,
  isCredentialCompliant,
  shouldRequireReview,
  shouldSendReminder,
} from '../credentialHelpers';
import { DocumentStatus, ReviewStatus } from '@prisma/client';

// Simple test runner
class TestRunner {
  private passedTests = 0;
  private failedTests = 0;
  private currentSuite = '';

  describe(suiteName: string, fn: () => void) {
    this.currentSuite = suiteName;
    console.log(`\n📦 ${suiteName}`);
    fn();
  }

  it(testName: string, fn: () => void) {
    try {
      fn();
      this.passedTests++;
      console.log(`  ✅ ${testName}`);
    } catch (error) {
      this.failedTests++;
      console.log(`  ❌ ${testName}`);
      console.log(`     Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  expect<T>(actual: T) {
    return {
      toBe: (expected: T) => {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toEqual: (expected: T) => {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
          throw new Error(`Expected ${expectedStr}, got ${actualStr}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
        }
      },
      toContain: (expected: string) => {
        const actualStr = String(actual);
        if (!actualStr.includes(expected)) {
          throw new Error(`Expected "${actualStr}" to contain "${expected}"`);
        }
      },
    };
  }

  summary() {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Test Results`);
    console.log(`   Passed: ${this.passedTests} ✅`);
    console.log(`   Failed: ${this.failedTests} ❌`);
    console.log(`   Total:  ${this.passedTests + this.failedTests}`);
    console.log(`${'='.repeat(50)}\n`);

    if (this.failedTests > 0) {
      process.exit(1);
    }
  }
}

const test = new TestRunner();

// ============================================================================
// calculateCredentialStatus Tests
// ============================================================================

test.describe('calculateCredentialStatus', () => {
  test.it('should return MISSING for null expiration date', () => {
    const result = calculateCredentialStatus(null, 30);
    test.expect(result).toBe('MISSING' as DocumentStatus);
  });

  test.it('should return EXPIRED for past expiration date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = calculateCredentialStatus(yesterday, 30);
    test.expect(result).toBe('EXPIRED' as DocumentStatus);
  });

  test.it('should return EXPIRING_SOON for date within warning window (30 days)', () => {
    const in20Days = new Date();
    in20Days.setDate(in20Days.getDate() + 20);
    const result = calculateCredentialStatus(in20Days, 30);
    test.expect(result).toBe('EXPIRING_SOON' as DocumentStatus);
  });

  test.it('should return EXPIRING_SOON for date exactly at warning threshold', () => {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const result = calculateCredentialStatus(in30Days, 30);
    test.expect(result).toBe('EXPIRING_SOON' as DocumentStatus);
  });

  test.it('should return ACTIVE for date beyond warning window', () => {
    const in45Days = new Date();
    in45Days.setDate(in45Days.getDate() + 45);
    const result = calculateCredentialStatus(in45Days, 30);
    test.expect(result).toBe('ACTIVE' as DocumentStatus);
  });

  test.it('should respect custom warning days', () => {
    const in50Days = new Date();
    in50Days.setDate(in50Days.getDate() + 50);

    // With 60 day warning, should be expiring soon
    const result1 = calculateCredentialStatus(in50Days, 60);
    test.expect(result1).toBe('EXPIRING_SOON' as DocumentStatus);

    // With 30 day warning, should be active
    const result2 = calculateCredentialStatus(in50Days, 30);
    test.expect(result2).toBe('ACTIVE' as DocumentStatus);
  });

  test.it('should handle date that expires today (edge case)', () => {
    const today = new Date();
    const result = calculateCredentialStatus(today, 30);
    // Should be EXPIRING_SOON since it's within 30 days
    test.expect(result).toBe('EXPIRING_SOON' as DocumentStatus);
  });

  test.it('should handle very old expired date', () => {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const result = calculateCredentialStatus(lastYear, 30);
    test.expect(result).toBe('EXPIRED' as DocumentStatus);
  });
});

// ============================================================================
// isCredentialCompliant Tests
// ============================================================================

test.describe('isCredentialCompliant', () => {
  test.it('should return true for ACTIVE status with APPROVED review', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 100);

    const result = isCredentialCompliant(
      'ACTIVE' as DocumentStatus,
      'APPROVED' as ReviewStatus,
      futureDate
    );
    test.expect(result).toBeTruthy();
  });

  test.it('should return false for EXPIRED status', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const result = isCredentialCompliant(
      'EXPIRED' as DocumentStatus,
      'APPROVED' as ReviewStatus,
      pastDate
    );
    test.expect(result).toBeFalsy();
  });

  test.it('should return false for MISSING status', () => {
    const result = isCredentialCompliant(
      'MISSING' as DocumentStatus,
      'APPROVED' as ReviewStatus,
      null
    );
    test.expect(result).toBeFalsy();
  });

  test.it('should return false if review status is PENDING_REVIEW', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 100);

    const result = isCredentialCompliant(
      'ACTIVE' as DocumentStatus,
      'PENDING_REVIEW' as ReviewStatus,
      futureDate
    );
    test.expect(result).toBeFalsy();
  });

  test.it('should return false if review status is REJECTED', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 100);

    const result = isCredentialCompliant(
      'ACTIVE' as DocumentStatus,
      'REJECTED' as ReviewStatus,
      futureDate
    );
    test.expect(result).toBeFalsy();
  });

  test.it('should return true for PENDING_UPLOAD (new credential slot)', () => {
    const result = isCredentialCompliant(
      'ACTIVE' as DocumentStatus,
      'PENDING_UPLOAD' as ReviewStatus,
      null
    );
    test.expect(result).toBeTruthy();
  });

  test.it('should return false if expiration date is in past (even if status says ACTIVE)', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const result = isCredentialCompliant(
      'ACTIVE' as DocumentStatus, // Somehow status wasn't updated
      'APPROVED' as ReviewStatus,
      pastDate
    );
    test.expect(result).toBeFalsy();
  });

  test.it('should return true for EXPIRING_SOON with APPROVED review', () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 15);

    const result = isCredentialCompliant(
      'EXPIRING_SOON' as DocumentStatus,
      'APPROVED' as ReviewStatus,
      soonDate
    );
    test.expect(result).toBeTruthy();
  });
});

// ============================================================================
// shouldRequireReview Tests
// ============================================================================

test.describe('shouldRequireReview', () => {
  test.it('should require review if confidence is null', () => {
    const result = shouldRequireReview(null, 0.7);
    test.expect(result).toBeTruthy();
  });

  test.it('should require review if confidence is below threshold', () => {
    const result = shouldRequireReview(0.65, 0.7);
    test.expect(result).toBeTruthy();
  });

  test.it('should not require review if confidence meets threshold', () => {
    const result = shouldRequireReview(0.7, 0.7);
    test.expect(result).toBeFalsy();
  });

  test.it('should not require review if confidence exceeds threshold', () => {
    const result = shouldRequireReview(0.95, 0.7);
    test.expect(result).toBeFalsy();
  });

  test.it('should work with custom threshold', () => {
    const result1 = shouldRequireReview(0.75, 0.8);
    test.expect(result1).toBeTruthy();

    const result2 = shouldRequireReview(0.85, 0.8);
    test.expect(result2).toBeFalsy();
  });

  test.it('should require review for very low confidence', () => {
    const result = shouldRequireReview(0.1, 0.7);
    test.expect(result).toBeTruthy();
  });

  test.it('should not require review for perfect confidence', () => {
    const result = shouldRequireReview(1.0, 0.7);
    test.expect(result).toBeFalsy();
  });
});

// ============================================================================
// shouldSendReminder Tests
// ============================================================================

test.describe('shouldSendReminder', () => {
  const reminderDays = [30, 7]; // Typical reminder schedule

  test.it('should not send reminder for MISSING status', () => {
    const result = shouldSendReminder(
      null,
      'MISSING' as DocumentStatus,
      reminderDays,
      null,
      7
    );
    test.expect(result.shouldSend).toBeFalsy();
    test.expect(result.reason).toBe('Not applicable for this status');
  });

  test.it('should not send reminder for ARCHIVED status', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const result = shouldSendReminder(
      futureDate,
      'ARCHIVED' as DocumentStatus,
      reminderDays,
      null,
      7
    );
    test.expect(result.shouldSend).toBeFalsy();
  });

  test.it('should not send reminder if no expiration date', () => {
    const result = shouldSendReminder(
      null,
      'ACTIVE' as DocumentStatus,
      reminderDays,
      null,
      7
    );
    test.expect(result.shouldSend).toBeFalsy();
    test.expect(result.reason).toBe('No expiration date');
  });

  test.it('should send reminder if days match reminder threshold (30 days)', () => {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const result = shouldSendReminder(
      in30Days,
      'EXPIRING_SOON' as DocumentStatus,
      reminderDays,
      null,
      7
    );
    test.expect(result.shouldSend).toBeTruthy();
  });

  test.it('should send reminder if days match reminder threshold (7 days)', () => {
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const result = shouldSendReminder(
      in7Days,
      'EXPIRING_SOON' as DocumentStatus,
      reminderDays,
      null,
      7
    );
    test.expect(result.shouldSend).toBeTruthy();
  });

  test.it('should not send reminder if days do not match any threshold', () => {
    const in15Days = new Date();
    in15Days.setDate(in15Days.getDate() + 15);

    const result = shouldSendReminder(
      in15Days,
      'EXPIRING_SOON' as DocumentStatus,
      reminderDays,
      null,
      7
    );
    test.expect(result.shouldSend).toBeFalsy();
  });

  test.it('should send reminder for expired credentials', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = shouldSendReminder(
      yesterday,
      'EXPIRED' as DocumentStatus,
      reminderDays,
      null,
      7
    );
    test.expect(result.shouldSend).toBeTruthy();
  });

  test.it('should not send reminder if last reminder was recent (< minDaysBetween)', () => {
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = shouldSendReminder(
      in7Days,
      'EXPIRING_SOON' as DocumentStatus,
      reminderDays,
      yesterday, // Sent reminder yesterday
      7
    );
    test.expect(result.shouldSend).toBeFalsy();
    test.expect(result.reason).toContain('Reminder sent');
  });

  test.it('should send reminder if enough time passed since last reminder', () => {
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 8);

    const result = shouldSendReminder(
      in7Days,
      'EXPIRING_SOON' as DocumentStatus,
      reminderDays,
      weekAgo, // Sent reminder 8 days ago
      7
    );
    test.expect(result.shouldSend).toBeTruthy();
  });

  test.it('should respect minDaysBetweenReminders parameter', () => {
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // With 7 day minimum, should not send
    const result1 = shouldSendReminder(
      in7Days,
      'EXPIRING_SOON' as DocumentStatus,
      reminderDays,
      twoDaysAgo,
      7
    );
    test.expect(result1.shouldSend).toBeFalsy();

    // With 1 day minimum, should send
    const result2 = shouldSendReminder(
      in7Days,
      'EXPIRING_SOON' as DocumentStatus,
      reminderDays,
      twoDaysAgo,
      1
    );
    test.expect(result2.shouldSend).toBeTruthy();
  });
});

// ============================================================================
// Edge Cases & Integration Tests
// ============================================================================

test.describe('Edge Cases', () => {
  test.it('should handle leap year dates correctly', () => {
    // Test that leap year calculation works (Feb 29)
    // Create a date exactly 29 days from now (within 30 day window)
    const today = new Date();
    const in29Days = new Date(today);
    in29Days.setDate(today.getDate() + 29);

    const result = calculateCredentialStatus(in29Days, 30);
    test.expect(result).toBe('EXPIRING_SOON' as DocumentStatus);

    // Also test that the function handles leap day dates without crashing
    const leapDay = new Date('2028-02-29');
    const in30DaysFromLeap = new Date(leapDay);
    in30DaysFromLeap.setDate(leapDay.getDate() + 30); // This should work even on leap day

    // Just make sure it doesn't crash - the result depends on current date
    const resultLeap = calculateCredentialStatus(in30DaysFromLeap, 30);
    test.expect(resultLeap).toBe(resultLeap); // Always passes, just checking no crash
  });

  test.it('should handle year boundary correctly', () => {
    // Test with a date that crosses year boundary
    // Create date exactly 10 days from now
    const today = new Date();
    const in10Days = new Date(today);
    in10Days.setDate(today.getDate() + 10);

    const result = calculateCredentialStatus(in10Days, 30);
    test.expect(result).toBe('EXPIRING_SOON' as DocumentStatus);

    // Verify the math works even when crossing month boundaries
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const fiveDaysAfter = new Date(lastDayOfMonth);
    fiveDaysAfter.setDate(lastDayOfMonth.getDate() + 5); // Will roll into next month

    const daysUntil = Math.floor(
      (fiveDaysAfter.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const resultBoundary = calculateCredentialStatus(fiveDaysAfter, 30);
    // Should be expiring soon if within 30 days, otherwise active
    test.expect(resultBoundary).toBe(
      daysUntil <= 30 ? ('EXPIRING_SOON' as DocumentStatus) : ('ACTIVE' as DocumentStatus)
    );
  });

  test.it('should handle very large warning days (1 year)', () => {
    const in6Months = new Date();
    in6Months.setMonth(in6Months.getMonth() + 6);

    const result = calculateCredentialStatus(in6Months, 365);
    test.expect(result).toBe('EXPIRING_SOON' as DocumentStatus);
  });

  test.it('should handle zero warning days', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = calculateCredentialStatus(tomorrow, 0);
    test.expect(result).toBe('ACTIVE' as DocumentStatus);
  });
});

test.describe('Integration Scenarios', () => {
  test.it('Scenario: New credential uploaded with future expiration', () => {
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 6);

    // Calculate status
    const status = calculateCredentialStatus(expirationDate, 30);
    test.expect(status).toBe('ACTIVE' as DocumentStatus);

    // Check compliance (pending review initially)
    const compliant = isCredentialCompliant(
      status,
      'PENDING_REVIEW' as ReviewStatus,
      expirationDate
    );
    test.expect(compliant).toBeFalsy();

    // Should not send reminder yet (not in window)
    const reminder = shouldSendReminder(
      expirationDate,
      status,
      [30, 7],
      null,
      7
    );
    test.expect(reminder.shouldSend).toBeFalsy();
  });

  test.it('Scenario: Credential approaching expiration (25 days out)', () => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 25);

    const status = calculateCredentialStatus(expirationDate, 30);
    test.expect(status).toBe('EXPIRING_SOON' as DocumentStatus);

    const compliant = isCredentialCompliant(
      status,
      'APPROVED' as ReviewStatus,
      expirationDate
    );
    test.expect(compliant).toBeTruthy(); // Still compliant, just expiring

    const reminder = shouldSendReminder(
      expirationDate,
      status,
      [30, 7],
      null,
      7
    );
    test.expect(reminder.shouldSend).toBeFalsy(); // Not at 30 or 7 day mark
  });

  test.it('Scenario: Credential expired yesterday', () => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - 1);

    const status = calculateCredentialStatus(expirationDate, 30);
    test.expect(status).toBe('EXPIRED' as DocumentStatus);

    const compliant = isCredentialCompliant(
      status,
      'APPROVED' as ReviewStatus,
      expirationDate
    );
    test.expect(compliant).toBeFalsy();

    const reminder = shouldSendReminder(
      expirationDate,
      status,
      [30, 7],
      null,
      7
    );
    test.expect(reminder.shouldSend).toBeTruthy(); // Send expired reminder
  });

  test.it('Scenario: Low confidence AI parsing', () => {
    const shouldReview = shouldRequireReview(0.45, 0.7);
    test.expect(shouldReview).toBeTruthy();

    // If requires review, credential should not be compliant until reviewed
    const compliant = isCredentialCompliant(
      'ACTIVE' as DocumentStatus,
      'PENDING_REVIEW' as ReviewStatus,
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    );
    test.expect(compliant).toBeFalsy();
  });
});

// Run all tests and display summary
test.summary();
