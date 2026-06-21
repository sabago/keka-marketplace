'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Mail, Phone, User, FileText, Hash, MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { US_STATES } from '@/lib/validation';

interface FormData {
  agencyName: string;
  licenseNumber: string;
  taxId: string;
  state: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  hearAboutUs: string;
}

const INITIAL: FormData = {
  agencyName: '',
  licenseNumber: '',
  taxId: '',
  state: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  hearAboutUs: '',
};

export default function RequestAccessPage() {
  const [formData, setFormData] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Request Received</h1>
            <p className="text-gray-600 mb-6">
              Thanks, <strong>{formData.contactName}</strong>. We've received your request for <strong>{formData.agencyName}</strong> and will be in touch within 1–2 business days.
            </p>
            <div className="bg-blue-50 border-l-4 border-[#0B4F96] p-4 rounded-r-lg text-left mb-6">
              <p className="text-sm font-semibold text-gray-900 mb-2">What happens next?</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Our team reviews your license and agency details</li>
                <li>We send you a password setup link to get started</li>
                <li>You invite your staff from within the platform</li>
              </ul>
            </div>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[#0B4F96] text-white rounded-lg font-bold hover:bg-[#094080] transition-all"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0B4F96] rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Access</h1>
          <p className="text-gray-600">
            Fill out the form below and we'll get your agency set up within 1–2 business days.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Agency Identity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Agency Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.agencyName}
                  onChange={set('agencyName')}
                  required
                  placeholder="Sunrise Home Health"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  License Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={set('licenseNumber')}
                    required
                    placeholder="HHA-12345"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tax ID / EIN <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={set('taxId')}
                    required
                    placeholder="12-3456789"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">Format: XX-XXXXXXX</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.state}
                  onChange={set('state')}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent appearance-none bg-white"
                  disabled={loading}
                >
                  <option value="">Select state</option>
                  {US_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Primary Contact */}
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Primary Contact</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={set('contactName')}
                  required
                  placeholder="Jane Smith"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={set('contactEmail')}
                    required
                    placeholder="jane@agency.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={set('contactPhone')}
                    required
                    placeholder="(617) 555-0100"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                How did you hear about us? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.hearAboutUs}
                onChange={set('hearAboutUs')}
                rows={2}
                placeholder="Referral, conference, online search..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent resize-none"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0B4F96] text-white rounded-lg font-bold hover:bg-[#094080] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-[#0B4F96] hover:text-[#48ccbc] font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
