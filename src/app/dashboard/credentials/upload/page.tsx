'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import DocumentUpload from '@/components/documents/DocumentUpload';

export default function UploadCredentialPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === 'AGENCY_ADMIN' ||
    session?.user?.role === 'PLATFORM_ADMIN' ||
    session?.user?.role === 'SUPERADMIN';
  const isPlatformOrSuper = session?.user?.role === 'PLATFORM_ADMIN' || session?.user?.role === 'SUPERADMIN';
  const agencyId = (session?.user as any)?.agencyId as string | null | undefined;

  const [liveApprovalStatus, setLiveApprovalStatus] = useState<string | null>(null);
  const [liveIsActive, setLiveIsActive] = useState<boolean | null>(null);
  const [liveHasAgency, setLiveHasAgency] = useState<boolean | null>(null);
  const isSuspended = liveApprovalStatus === 'SUSPENDED' || liveApprovalStatus === 'REJECTED';
  const isDeactivated = liveIsActive === false;
  const effectiveHasAgency = liveHasAgency ?? !!agencyId;
  const hasNoAgency = isPlatformOrSuper && !effectiveHasAgency;
  const blocked = isSuspended || hasNoAgency || (isDeactivated && !isAdmin);

  const [staffRecordId, setStaffRecordId] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/agency/status').then((r) => {
          const header = r.headers.get("X-Agency-Status");
          if (header) return { approvalStatus: header };
          return r.ok ? r.json() : null;
        }),
      fetch('/api/account/status').then((r) => r.ok ? r.json() : null),
      fetch('/api/employee/document-types').then((r) => r.json()),
    ])
      .then(([statusResult, accountResult, typesResult]) => {
        if (statusResult.status === "fulfilled" && statusResult.value?.approvalStatus) {
          setLiveApprovalStatus(statusResult.value.approvalStatus);
          setLiveHasAgency(true);
        } else if (isPlatformOrSuper) {
          setLiveHasAgency(false);
        }
        if (accountResult.status === "fulfilled" && accountResult.value?.isActive === false)
          setLiveIsActive(false);
        if (typesResult.status === "rejected") { setError(typesResult.reason?.message || 'Failed to load'); return; }
        const typesData = typesResult.value;
        if (typesData.error) { setError(typesData.error); return; }
        setStaffRecordId(typesData.staffRecordId);
        setDocumentTypes(typesData.documentTypes ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#0B4F96] animate-spin" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-amber-200 p-8 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access restricted</h2>
          <p className="text-gray-600 mb-6">{isDeactivated ? "Your account has been deactivated. Please contact your agency admin." : "Credential uploads are disabled while your agency account is suspended. Please contact support."}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-red-200 p-8 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-800 font-medium mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-green-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Credential Uploaded</h2>
          <p className="text-gray-600 mb-6">Your document has been submitted for review.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setDone(false); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Upload Another
            </button>
            <button
              onClick={() => router.push('/dashboard/credentials')}
              className="px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75]"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Upload Credential</h1>
        <p className="text-gray-600 mb-8">Upload your professional licenses and certifications</p>

        {staffRecordId && (
          <DocumentUpload
            staffRecordId={staffRecordId}
            documentTypes={documentTypes}
            onSuccess={() => setDone(true)}
            onClose={() => router.back()}
            inline
          />
        )}
      </div>
    </div>
  );
}
