'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingWizard from '@/components/OnboardingWizard';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAgency, setHasAgency] = useState(false);

  useEffect(() => {
    checkAgencyStatus();
  }, []);

  const checkAgencyStatus = async () => {
    try {
      // Check if user is authenticated and already has an agency
      const response = await fetch('/api/agency/check');

      if (response.ok) {
        const data = await response.json();
        if (data.hasAgency) {
          // User already has an agency, redirect to dashboard
          router.push('/dashboard');
          setHasAgency(true);
        }
      } else if (response.status === 401) {
        // User not authenticated, redirect to signin
        router.push('/auth/signin?callbackUrl=/onboarding');
      }
    } catch (error) {
      console.error('Error checking agency status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#0B4F96] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (hasAgency) {
    return null; // Will redirect to dashboard
  }

  return <OnboardingWizard />;
}
