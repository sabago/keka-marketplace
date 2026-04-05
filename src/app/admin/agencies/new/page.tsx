'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Building2, Mail, User, AlertCircle, Loader2, CheckCircle, MapPin, Phone, Globe, ClipboardList, ArrowLeft } from 'lucide-react';
import { US_STATES } from '@/lib/validation';

type AgencySize = 'SMALL' | 'MEDIUM' | 'LARGE' | '';
type ContactRole = 'AGENCY_ADMIN' | 'AGENCY_USER' | '';

interface FormData {
  // Agency Information
  agencyName: string;
  licenseNumber: string;
  taxId: string;

  // Address
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;

  // Contact Information
  phoneNumber: string;
  websiteUrl: string;

  // Primary Contact
  contactName: string;
  contactEmail: string;
  contactRole: ContactRole;

  // Optional
  agencySize: AgencySize;

  // Intake Analytics
  intakeMethods: string[];
  intakeTrackingDescription: string;
  followUpFrequency: string;
  followUpMethods: string[];
}

export default function AdminCreateAgencyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState<FormData>({
    agencyName: '',
    licenseNumber: '',
    taxId: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    phoneNumber: '',
    websiteUrl: '',
    contactName: '',
    contactEmail: '',
    contactRole: '',
    agencySize: '',
    intakeMethods: [],
    intakeTrackingDescription: '',
    followUpFrequency: '',
    followUpMethods: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdAgencyId, setCreatedAgencyId] = useState('');

  // Auth check
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user?.role !== 'PLATFORM_ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const toggleCheckbox = (field: 'intakeMethods' | 'followUpMethods', value: string) => {
    setFormData((prev) => {
      const currentArray = prev[field];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
    setError('');
  };

  const validateForm = (): boolean => {
    // Required fields validation
    if (!formData.agencyName.trim()) {
      setError('Agency name is required');
      return false;
    }
    if (!formData.licenseNumber.trim()) {
      setError('License number is required');
      return false;
    }
    if (!formData.taxId.trim()) {
      setError('Tax ID / EIN is required');
      return false;
    }
    if (!/^\d{2}-\d{7}$/.test(formData.taxId)) {
      setError('Tax ID must be in format XX-XXXXXXX (e.g., 12-3456789)');
      return false;
    }
    if (!formData.streetAddress.trim()) {
      setError('Street address is required');
      return false;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.state) {
      setError('State is required');
      return false;
    }
    if (!formData.zipCode.trim()) {
      setError('ZIP code is required');
      return false;
    }
    if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      setError('ZIP code must be in format 12345 or 12345-6789');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.contactName.trim()) {
      setError('Contact name is required');
      return false;
    }
    if (!formData.contactEmail.trim()) {
      setError('Contact email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.contactRole) {
      setError('Please select your role');
      return false;
    }
    // Optional URL validation
    if (formData.websiteUrl && !/^https?:\/\/.+/.test(formData.websiteUrl)) {
      setError('Website URL must start with http:// or https://');
      return false;
    }
    // Intake analytics validation
    if (formData.intakeMethods.length === 0) {
      setError('Please select at least one intake method');
      return false;
    }
    if (formData.followUpMethods.length === 0) {
      setError('Please select at least one follow-up method');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create agency');
      }

      // Success
      setSuccess(true);
      setCreatedAgencyId(data.agency.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Agency Created Successfully!</h1>
            <p className="text-lg text-gray-700 mb-6">
              The agency has been created and is pending approval. Once approved, the primary contact will receive an email with instructions to set their password.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push(`/admin/agencies/${createdAgencyId}`)}
                className="px-6 py-3 bg-[#0B4F96] text-white rounded-lg font-bold hover:bg-[#0a4280] transition-all"
              >
                View Agency
              </button>
              <button
                onClick={() => router.push('/admin/agencies')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
              >
                Back to Agencies
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/admin/agencies')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Agencies
        </button>

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Agency</h1>
          <p className="text-gray-600">Add a new agency to the platform</p>
        </div>

        {/* Admin Info Banner */}
        <div className="bg-blue-50 border-l-4 border-[#0B4F96] p-4 rounded-r-lg mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#0B4F96] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Platform Admin Agency Creation</p>
            <p>You can create agencies on behalf of agency admins. After creation, approve the agency to send the primary contact a password setup email.</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 mb-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Agency Information Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0B4F96]" />
                Agency Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Agency Name */}
                <div className="md:col-span-2">
                  <label htmlFor="agencyName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Agency Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="agencyName"
                    type="text"
                    value={formData.agencyName}
                    onChange={(e) => updateField('agencyName', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="ABC Home Care Services"
                    disabled={loading}
                  />
                </div>

                {/* License Number */}
                <div>
                  <label htmlFor="licenseNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                    License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="licenseNumber"
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => updateField('licenseNumber', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="MA-HCA-12345"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">Your state-issued agency license number</p>
                </div>

                {/* Tax ID / EIN */}
                <div>
                  <label htmlFor="taxId" className="block text-sm font-semibold text-gray-700 mb-2">
                    Tax ID / EIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="taxId"
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => updateField('taxId', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="12-3456789"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">Format: XX-XXXXXXX</p>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#0B4F96]" />
                Business Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Street Address */}
                <div className="md:col-span-2">
                  <label htmlFor="streetAddress" className="block text-sm font-semibold text-gray-700 mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="streetAddress"
                    type="text"
                    value={formData.streetAddress}
                    onChange={(e) => updateField('streetAddress', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="123 Main Street, Suite 100"
                    disabled={loading}
                  />
                </div>

                {/* City */}
                <div>
                  <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="Boston"
                    disabled={loading}
                  />
                </div>

                {/* State */}
                <div>
                  <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent bg-white"
                    disabled={loading}
                  >
                    <option value="">Select a state</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ZIP Code */}
                <div className="md:col-span-2">
                  <label htmlFor="zipCode" className="block text-sm font-semibold text-gray-700 mb-2">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="02101"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#0B4F96]" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone Number */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => updateField('phoneNumber', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="(617) 555-0100"
                    disabled={loading}
                  />
                </div>

                {/* Website URL */}
                <div>
                  <label htmlFor="websiteUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                    Website URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="websiteUrl"
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) => updateField('websiteUrl', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                      placeholder="https://www.youragency.com"
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Optional</p>
                </div>
              </div>
            </div>

            {/* Primary Contact Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#0B4F96]" />
                Primary Contact
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Name */}
                <div>
                  <label htmlFor="contactName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contactName"
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => updateField('contactName', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="John Smith"
                    disabled={loading}
                  />
                </div>

                {/* Contact Email */}
                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => updateField('contactEmail', e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                      placeholder="john@agency.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Your Role <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-[#0B4F96] transition-colors">
                      <input
                        type="radio"
                        name="contactRole"
                        value="AGENCY_ADMIN"
                        checked={formData.contactRole === 'AGENCY_ADMIN'}
                        onChange={(e) => updateField('contactRole', e.target.value as ContactRole)}
                        className="mt-1"
                        disabled={loading}
                      />
                      <div>
                        <div className="font-semibold text-gray-900">Agency Administrator</div>
                        <div className="text-sm text-gray-600">
                          Full access to manage agency settings, users, and all platform features
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-[#0B4F96] transition-colors">
                      <input
                        type="radio"
                        name="contactRole"
                        value="AGENCY_USER"
                        checked={formData.contactRole === 'AGENCY_USER'}
                        onChange={(e) => updateField('contactRole', e.target.value as ContactRole)}
                        className="mt-1"
                        disabled={loading}
                      />
                      <div>
                        <div className="font-semibold text-gray-900">Agency Employee</div>
                        <div className="text-sm text-gray-600">
                          Standard user access to view and manage referrals and resources
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional: Agency Size */}
            <div>
              <label htmlFor="agencySize" className="block text-sm font-semibold text-gray-700 mb-2">
                Agency Size (Optional)
              </label>
              <select
                id="agencySize"
                value={formData.agencySize}
                onChange={(e) => updateField('agencySize', e.target.value as AgencySize)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent bg-white"
                disabled={loading}
              >
                <option value="">Select agency size</option>
                <option value="SMALL">Small (1-10 employees)</option>
                <option value="MEDIUM">Medium (11-50 employees)</option>
                <option value="LARGE">Large (51+ employees)</option>
              </select>
            </div>

            {/* Intake Analytics Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#0B4F96]" />
                Intake Process & Analytics
              </h2>
              <div className="space-y-6">
                {/* Intake Methods */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    How does your agency receive intake requests? <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-600 mb-3">Select all that apply</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { value: 'phone', label: 'Phone Calls' },
                      { value: 'online', label: 'Online Forms' },
                      { value: 'email', label: 'Email' },
                      { value: 'fax', label: 'Fax' },
                      { value: 'in-person', label: 'In-Person' },
                    ].map((method) => (
                      <label
                        key={method.value}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.intakeMethods.includes(method.value)
                            ? 'border-[#0B4F96] bg-blue-50'
                            : 'border-gray-300 hover:border-[#0B4F96]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.intakeMethods.includes(method.value)}
                          onChange={() => toggleCheckbox('intakeMethods', method.value)}
                          className="w-4 h-4"
                          disabled={loading}
                        />
                        <span className="font-medium text-gray-900">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Intake Tracking Description */}
                <div>
                  <label htmlFor="intakeTrackingDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                    How do you track intake and follow-up?
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Describe your tracking system (e.g., "Custom dashboard with spreadsheet views", "CRM system", "Manual tracking")
                  </p>
                  <textarea
                    id="intakeTrackingDescription"
                    value={formData.intakeTrackingDescription}
                    onChange={(e) => updateField('intakeTrackingDescription', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="Example: We use a custom dashboard that shows referral status, pending documents, and follow-up schedules across multiple views..."
                    disabled={loading}
                  />
                </div>

                {/* Follow-up Frequency */}
                <div>
                  <label htmlFor="followUpFrequency" className="block text-sm font-semibold text-gray-700 mb-2">
                    How often do you follow up on missing signatures and documents?
                  </label>
                  <select
                    id="followUpFrequency"
                    value={formData.followUpFrequency}
                    onChange={(e) => updateField('followUpFrequency', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent bg-white"
                    disabled={loading}
                  >
                    <option value="">Select follow-up frequency</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="as-needed">As needed</option>
                  </select>
                </div>

                {/* Follow-up Methods */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    What methods do you use for follow-ups? <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-600 mb-3">Select all that apply</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { value: 'email', label: 'Email' },
                      { value: 'phone', label: 'Phone' },
                      { value: 'text', label: 'Text/SMS' },
                      { value: 'in-person', label: 'In-Person' },
                      { value: 'automated', label: 'Automated System' },
                    ].map((method) => (
                      <label
                        key={method.value}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.followUpMethods.includes(method.value)
                            ? 'border-[#0B4F96] bg-blue-50'
                            : 'border-gray-300 hover:border-[#0B4F96]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.followUpMethods.includes(method.value)}
                          onChange={() => toggleCheckbox('followUpMethods', method.value)}
                          className="w-4 h-4"
                          disabled={loading}
                        />
                        <span className="font-medium text-gray-900">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#0B4F96] text-white rounded-lg font-bold text-lg hover:bg-[#0a4280] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Creating Agency...
                  </>
                ) : (
                  'Create Agency'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-[#0B4F96] animate-spin" />
      </div>
    );
  }
}
