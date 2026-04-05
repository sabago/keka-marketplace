'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Mail,
  Clock,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Info,
} from 'lucide-react';

interface NotificationPreferences {
  id: string;
  emailEnabled: boolean;
  emailExpiringReminders: boolean;
  emailExpiredReminders: boolean;
  emailApprovalNotifications: boolean;
  emailRejectionNotifications: boolean;
  reminderFrequency: 'MINIMAL' | 'STANDARD' | 'FREQUENT';
  quietHoursEnabled: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  weeklyDigestEnabled: boolean;
  weeklyDigestDay: number | null;
}

export default function NotificationPreferencesPage() {
  const router = useRouter();

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/employee/notification-preferences');

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching preferences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/employee/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setSuccessMessage('Preferences saved successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error saving preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  const handleBack = () => {
    router.push('/dashboard/credentials');
  };

  const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-[#0B4F96]" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Notification Preferences
              </h1>
              <p className="text-gray-600 mt-1">
                Manage how and when you receive notifications
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#0B4F96] animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <p className="text-sm text-green-900">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Preferences Form */}
        {!isLoading && preferences && (
          <div className="space-y-6">
            {/* Email Notifications Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Mail className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Email Notifications
                </h2>
              </div>

              <div className="space-y-4">
                {/* Master Toggle */}
                <div className="flex items-start justify-between pb-4 border-b border-gray-200">
                  <div className="flex-1">
                    <label className="font-medium text-gray-900 block">
                      Enable Email Notifications
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      Receive all email notifications
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailEnabled}
                      onChange={(e) =>
                        updatePreference('emailEnabled', e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B4F96]"></div>
                  </label>
                </div>

                {/* Individual Toggles */}
                {preferences.emailEnabled && (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-gray-900 block">
                          Expiring Credentials
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          Notifications when credentials are expiring soon
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.emailExpiringReminders}
                          onChange={(e) =>
                            updatePreference(
                              'emailExpiringReminders',
                              e.target.checked
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B4F96]"></div>
                      </label>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-gray-900 block">
                          Expired Credentials
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          Notifications when credentials have expired
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.emailExpiredReminders}
                          onChange={(e) =>
                            updatePreference(
                              'emailExpiredReminders',
                              e.target.checked
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B4F96]"></div>
                      </label>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-gray-900 block">
                          Approval Notifications
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          When your credentials are approved by admin
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.emailApprovalNotifications}
                          onChange={(e) =>
                            updatePreference(
                              'emailApprovalNotifications',
                              e.target.checked
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B4F96]"></div>
                      </label>
                    </div>

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-gray-900 block">
                          Rejection Notifications
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          When your credentials are rejected by admin
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.emailRejectionNotifications}
                          onChange={(e) =>
                            updatePreference(
                              'emailRejectionNotifications',
                              e.target.checked
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B4F96]"></div>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Reminder Frequency Section */}
            {preferences.emailEnabled && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Reminder Frequency
                  </h2>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-[#0B4F96] has-[:checked]:bg-blue-50">
                    <input
                      type="radio"
                      name="frequency"
                      value="MINIMAL"
                      checked={preferences.reminderFrequency === 'MINIMAL'}
                      onChange={() => updatePreference('reminderFrequency', 'MINIMAL')}
                      className="mt-1 h-4 w-4 text-[#0B4F96]"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-900">Minimal</span>
                      <p className="text-sm text-gray-600 mt-1">
                        Only critical notifications (expired, rejected)
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-[#0B4F96] has-[:checked]:bg-blue-50">
                    <input
                      type="radio"
                      name="frequency"
                      value="STANDARD"
                      checked={preferences.reminderFrequency === 'STANDARD'}
                      onChange={() => updatePreference('reminderFrequency', 'STANDARD')}
                      className="mt-1 h-4 w-4 text-[#0B4F96]"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-900">
                        Standard (Recommended)
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Regular reminders at 30 and 7 days before expiration
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-[#0B4F96] has-[:checked]:bg-blue-50">
                    <input
                      type="radio"
                      name="frequency"
                      value="FREQUENT"
                      checked={preferences.reminderFrequency === 'FREQUENT'}
                      onChange={() => updatePreference('reminderFrequency', 'FREQUENT')}
                      className="mt-1 h-4 w-4 text-[#0B4F96]"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-900">Frequent</span>
                      <p className="text-sm text-gray-600 mt-1">
                        More frequent reminders at 30, 14, 7, 3, and 1 day before expiration
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Quiet Hours Section */}
            {preferences.emailEnabled && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Quiet Hours
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="font-medium text-gray-900 block">
                        Enable Quiet Hours
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Pause non-urgent notifications during specific hours
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.quietHoursEnabled}
                        onChange={(e) =>
                          updatePreference('quietHoursEnabled', e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B4F96]"></div>
                    </label>
                  </div>

                  {preferences.quietHoursEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Time
                        </label>
                        <select
                          value={preferences.quietHoursStart ?? 22}
                          onChange={(e) =>
                            updatePreference('quietHoursStart', parseInt(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Time
                        </label>
                        <select
                          value={preferences.quietHoursEnd ?? 8}
                          onChange={(e) =>
                            updatePreference('quietHoursEnd', parseInt(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Weekly Digest Section */}
            {preferences.emailEnabled && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Weekly Digest
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="font-medium text-gray-900 block">
                        Enable Weekly Digest
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Receive a weekly summary of your credential status
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.weeklyDigestEnabled}
                        onChange={(e) =>
                          updatePreference('weeklyDigestEnabled', e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B4F96]"></div>
                    </label>
                  </div>

                  {preferences.weeklyDigestEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Day
                      </label>
                      <select
                        value={preferences.weeklyDigestDay ?? 1}
                        onChange={(e) =>
                          updatePreference('weeklyDigestDay', parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-2">About Notifications</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Changes take effect immediately</li>
                    <li>Critical alerts (expired credentials) may override quiet hours</li>
                    <li>You can update these preferences at any time</li>
                    <li>Approvals and rejections are always sent</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Save Preferences
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
