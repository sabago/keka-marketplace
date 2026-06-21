'use client';

import { useSession, signOut } from 'next-auth/react';
import { Clock, CheckCircle, Mail, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function PendingApprovalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if not authenticated or no agency
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!session.user.agencyId) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96]"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Icon and Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Agency Approval Pending
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Thank you for registering! Your agency application is currently under review by our team.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 mb-6">
          {/* User Information */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#0B4F96] mt-0.5" />
              <div>
                <p className="text-sm text-gray-600 mb-1">Registered Email</p>
                <p className="font-semibold text-gray-900">{session.user.email}</p>
              </div>
            </div>
          </div>

          {/* What Happens Next Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#0B4F96]" />
              What Happens Next
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#0B4F96] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Verification Review
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Our team is verifying your agency license number and registration details to ensure compliance and security.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#0B4F96] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Email Notification
                  </h3>
                  <p className="text-gray-600 text-sm">
                    You&apos;ll receive an email at <strong>{session.user.email}</strong> once your agency has been approved.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-[#48ccbc] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Full Access
                  </h3>
                  <p className="text-gray-600 text-sm">
                    After approval, you&apos;ll have immediate access to your dashboard, referral directory, AI chatbot, and all platform features.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Estimate */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#0B4F96] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Typical Review Time
                </h3>
                <p className="text-sm text-gray-700">
                  Most applications are reviewed within <strong>24-48 hours</strong> during business days.
                  We&apos;ll notify you as soon as your review is complete.
                </p>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Need Help?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              If you have questions about your application or need to update information, please contact our support team:
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold text-gray-900">Email:</span>{' '}
                <a
                  href="mailto:support@example.com"
                  className="text-[#0B4F96] hover:text-[#48ccbc] underline"
                >
                  support@example.com
                </a>
              </p>
              <p className="text-sm">
                <span className="font-semibold text-gray-900">Phone:</span>{' '}
                <a
                  href="tel:+1234567890"
                  className="text-[#0B4F96] hover:text-[#48ccbc]"
                >
                  (123) 456-7890
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="text-center">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            This page will automatically redirect once your agency is approved.
          </p>
        </div>
      </div>
    </div>
  );
}
