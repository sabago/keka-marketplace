'use client';

import { useSession, signOut } from 'next-auth/react';
import { XCircle, ShieldOff, Mail, AlertTriangle, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApprovalStatus } from '@prisma/client';


export default function AccountSuspendedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [agencyData, setAgencyData] = useState<{
    approvalStatus: ApprovalStatus;
    rejectionReason: string | null;
    agencyName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch agency data
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

    // Fetch agency approval status and rejection reason
    const fetchAgencyData = async () => {
      try {
        const response = await fetch(`/api/agency/${session.user.agencyId}`);
        if (response.ok) {
          const data = await response.json();
          setAgencyData({
            approvalStatus: data.approvalStatus,
            rejectionReason: data.rejectionReason,
            agencyName: data.agencyName,
          });
        }
      } catch (error) {
        console.error('Error fetching agency data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgencyData();
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96]"></div>
      </div>
    );
  }

  if (!session || !agencyData) {
    return null;
  }

  const isRejected = agencyData.approvalStatus === ApprovalStatus.REJECTED;
  const isSuspended = agencyData.approvalStatus === ApprovalStatus.SUSPENDED;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Icon and Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            {isRejected ? (
              <XCircle className="w-10 h-10 text-red-600" />
            ) : (
              <ShieldOff className="w-10 h-10 text-red-600" />
            )}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {isRejected ? 'Agency Application Not Approved' : 'Account Suspended'}
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            {isRejected
              ? 'We were unable to approve your agency registration at this time.'
              : 'Your agency account has been suspended and access to platform features is currently restricted.'}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 mb-6">
          {/* User Information */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#0B4F96] mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="font-semibold text-gray-900">{session.user.email}</p>
                </div>
              </div>
              {agencyData.agencyName && (
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-[#0B4F96] mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Agency Name</p>
                    <p className="font-semibold text-gray-900">{agencyData.agencyName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rejection/Suspension Reason */}
          {agencyData.rejectionReason && (
            <div className="mb-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {isRejected ? 'Reason for Rejection' : 'Reason for Suspension'}
                    </h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {agencyData.rejectionReason}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* What You Can Do Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              What You Can Do
            </h2>
            <div className="space-y-4">
              {isRejected ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#0B4F96] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Review the Feedback
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Carefully review the reason provided above to understand why your application was not approved.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#0B4F96] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Contact Support
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Reach out to our support team to discuss your application, ask questions, or request clarification.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#48ccbc] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Reapply if Eligible
                      </h3>
                      <p className="text-gray-600 text-sm">
                        If you're able to address the concerns raised, you may be eligible to submit a new application with updated information.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#0B4F96] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Understand the Reason
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Review the suspension reason provided above to understand what led to this action.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#0B4F96] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Contact Support Immediately
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Get in touch with our support team to discuss the suspension, provide additional information, or appeal the decision.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#48ccbc] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Resolve Outstanding Issues
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Work with our team to address any compliance, payment, or policy violations that led to the suspension.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Support Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Contact Support
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Our support team is here to help. Please reach out if you have questions or need assistance:
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
              <p className="text-sm text-gray-500 mt-3">
                Support hours: Monday - Friday, 9:00 AM - 5:00 PM EST
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
      </div>
    </div>
  );
}
