'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  Phone,
  Settings,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react';

interface AgencyFormData {
  // Step 1: Agency Info
  agencyName: string;
  licenseNumber: string;
  agencySize: string;

  // Step 2: Services
  servicesOffered: string[];
  serviceAreas: string;

  // Step 3: Contact
  contactName: string;
  contactRole: string;
  contactPhone: string;

  // Step 4: Operations (optional)
  referralsPerMonth: string;
  intakeMethod: string;

  // Step 5: Consent
  analyticsConsent: boolean;
  privacyAccepted: boolean;
}

const steps = [
  { id: 1, name: 'Agency Info', icon: Building2 },
  { id: 2, name: 'Services', icon: Users },
  { id: 3, name: 'Contact', icon: Phone },
  { id: 4, name: 'Operations', icon: Settings },
  { id: 5, name: 'Consent', icon: FileText },
];

const serviceOptions = [
  'Personal Care',
  'Companionship',
  'Home Health',
  'Skilled Nursing',
  'Physical Therapy',
  'Occupational Therapy',
  'Speech Therapy',
  'Respite Care',
  'Hospice Care',
  'Memory Care',
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<AgencyFormData>({
    agencyName: '',
    licenseNumber: '',
    agencySize: '',
    servicesOffered: [],
    serviceAreas: '',
    contactName: '',
    contactRole: '',
    contactPhone: '',
    referralsPerMonth: '',
    intakeMethod: '',
    analyticsConsent: false,
    privacyAccepted: false,
  });

  const updateFormData = (field: keyof AgencyFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const toggleService = (service: string) => {
    const services = formData.servicesOffered.includes(service)
      ? formData.servicesOffered.filter((s) => s !== service)
      : [...formData.servicesOffered, service];
    updateFormData('servicesOffered', services);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.agencyName.trim()) {
          setError('Agency name is required');
          return false;
        }
        if (!formData.licenseNumber.trim()) {
          setError('License number is required');
          return false;
        }
        if (!formData.agencySize) {
          setError('Please select agency size');
          return false;
        }
        return true;
      case 2:
        if (formData.servicesOffered.length === 0) {
          setError('Please select at least one service');
          return false;
        }
        if (!formData.serviceAreas.trim()) {
          setError('Service areas are required');
          return false;
        }
        return true;
      case 3:
        if (!formData.contactName.trim()) {
          setError('Contact name is required');
          return false;
        }
        if (!formData.contactRole.trim()) {
          setError('Contact role is required');
          return false;
        }
        if (!formData.contactPhone.trim()) {
          setError('Contact phone is required');
          return false;
        }
        return true;
      case 4:
        // Optional step - always valid
        return true;
      case 5:
        if (!formData.privacyAccepted) {
          setError('You must accept the privacy policy to continue');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/agency/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create agency');
      }

      // Success - redirect to dashboard with welcome parameter
      router.push('/dashboard?welcome=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Agency Name *
              </label>
              <input
                type="text"
                value={formData.agencyName}
                onChange={(e) => updateFormData('agencyName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="Your Care Agency"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                License Number *
              </label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => updateFormData('licenseNumber', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="HCA-12345"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Agency Size *
              </label>
              <select
                value={formData.agencySize}
                onChange={(e) => updateFormData('agencySize', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              >
                <option value="">Select size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-100">51-100 employees</option>
                <option value="100+">100+ employees</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Services Offered * (Select all that apply)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {serviceOptions.map((service) => (
                  <label
                    key={service}
                    className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.servicesOffered.includes(service)}
                      onChange={() => toggleService(service)}
                      className="w-5 h-5 text-[#0B4F96] rounded focus:ring-[#0B4F96]"
                    />
                    <span className="text-gray-700">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Service Areas * (Cities or counties served)
              </label>
              <textarea
                value={formData.serviceAreas}
                onChange={(e) => updateFormData('serviceAreas', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="e.g., Boston, Cambridge, Somerville, Brookline"
                rows={3}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Name *
              </label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => updateFormData('contactName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role/Title *
              </label>
              <input
                type="text"
                value={formData.contactRole}
                onChange={(e) => updateFormData('contactRole', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="Director of Operations"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => updateFormData('contactPhone', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-[#0B4F96] p-4 rounded-r-lg mb-4">
              <p className="text-sm text-gray-700">
                This information is optional but helps us provide better insights and
                recommendations.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Average Referrals Per Month (Optional)
              </label>
              <select
                value={formData.referralsPerMonth}
                onChange={(e) => updateFormData('referralsPerMonth', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              >
                <option value="">Select range</option>
                <option value="0-10">0-10</option>
                <option value="11-25">11-25</option>
                <option value="26-50">26-50</option>
                <option value="51-100">51-100</option>
                <option value="100+">100+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Primary Intake Method (Optional)
              </label>
              <select
                value={formData.intakeMethod}
                onChange={(e) => updateFormData('intakeMethod', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              >
                <option value="">Select method</option>
                <option value="phone">Phone calls</option>
                <option value="email">Email</option>
                <option value="form">Online form</option>
                <option value="mixed">Mixed methods</option>
              </select>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Privacy Policy & Data Usage
              </h3>

              <div className="space-y-4 mb-6">
                <p className="text-gray-700">
                  We take your privacy seriously. Here's how we use your information:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Your agency information is used to personalize your experience</li>
                  <li>We never share your data with third parties without consent</li>
                  <li>All data is encrypted and stored securely</li>
                  <li>You can request data deletion at any time</li>
                </ul>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.analyticsConsent}
                    onChange={(e) => updateFormData('analyticsConsent', e.target.checked)}
                    className="w-5 h-5 text-[#0B4F96] rounded focus:ring-[#0B4F96] mt-1"
                  />
                  <span className="text-gray-700">
                    I consent to anonymous usage analytics to help improve the platform
                    (Optional)
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.privacyAccepted}
                    onChange={(e) => updateFormData('privacyAccepted', e.target.checked)}
                    className="w-5 h-5 text-[#0B4F96] rounded focus:ring-[#0B4F96] mt-1"
                  />
                  <span className="text-gray-700">
                    I have read and agree to the{' '}
                    <a href="/privacy" className="text-[#0B4F96] underline">
                      Privacy Policy
                    </a>{' '}
                    and{' '}
                    <a href="/terms" className="text-[#0B4F96] underline">
                      Terms of Service
                    </a>{' '}
                    *
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-[#48ccbc] text-white'
                          : isCurrent
                          ? 'bg-[#0B4F96] text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-sm font-semibold ${
                        isCurrent ? 'text-[#0B4F96]' : 'text-gray-600'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 transition-all ${
                        isCompleted ? 'bg-[#48ccbc]' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {steps[currentStep - 1].name}
            </h2>
            <p className="text-gray-600">
              Step {currentStep} of {steps.length}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          )}

          {/* Step Content */}
          <div className="mb-8">{renderStep()}</div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                currentStep === 1 || loading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-[#0B4F96] text-white rounded-lg font-semibold hover:bg-[#0a4280] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-[#48ccbc] text-white rounded-lg font-semibold hover:bg-[#3ab8a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Check className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
