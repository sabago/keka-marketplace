import Link from 'next/link';
import { ShieldCheck, TrendingUp, Calendar, ClipboardList } from 'lucide-react';

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="bg-[#0b4f96]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-14 md:pt-24 md:pb-20 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            Tools for Home Care Professionals
          </h1>
          <p className="text-blue-200 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Purpose-built tools to help you run a compliant, efficient, and growing home care agency.
            One live today. More on the way.
          </p>
        </div>
      </div>

      {/* FEATURED LIVE TOOL */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <p className="text-xs font-semibold text-[#0b4f96] uppercase tracking-wider mb-6">Live Now</p>

        <div className="rounded-2xl border border-green-200 bg-white shadow-lg p-8 border-l-4 border-l-[#3da777]">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="w-14 h-14 rounded-2xl bg-[#3da777]/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-7 h-7 text-[#3da777]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 bg-[#3da777] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Live
                </span>
                <h2 className="text-2xl font-bold text-gray-900">Credential Tracker</h2>
              </div>

              <p className="text-gray-600 mb-5 leading-relaxed max-w-2xl">
                Track every staff credential from upload to expiry. AI parses CPR cards, RN licenses,
                HHA certificates, and BCI checks — then alerts you at 30 and 7 days before expiration.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {['AI-Powered Parsing', '30 & 7 Day Alerts', 'Compliance Dashboard', 'Bulk Import'].map((chip) => (
                  <span
                    key={chip}
                    className="inline-block bg-[#3da777]/10 text-[#3da777] text-xs font-medium px-3 py-1 rounded-full"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/tools/credential-tracker"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3da777] text-white rounded-xl font-semibold text-sm hover:bg-[#359469] transition-colors shadow-sm"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMING SOON GRID */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">Coming Soon</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* Referral Tracker */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 shadow-sm p-6 opacity-80">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-gray-500" />
              </div>
              <span className="inline-block bg-gray-200 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
            <h3 className="font-bold text-gray-700 mb-2">Referral Tracker</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Log inbound referrals, track sources by ZIP and category, and see your pipeline over time.
            </p>
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors">
              Notify Me →
            </a>
          </div>

          {/* Shift Scheduler */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 shadow-sm p-6 opacity-80">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-gray-500" />
              </div>
              <span className="inline-block bg-gray-200 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
            <h3 className="font-bold text-gray-700 mb-2">Shift Scheduler</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Manage staff availability, assign shifts, and reduce scheduling conflicts across your agency.
            </p>
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors">
              Notify Me →
            </a>
          </div>

          {/* Onboarding Checklist */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 shadow-sm p-6 opacity-80">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-5 h-5 text-gray-500" />
              </div>
              <span className="inline-block bg-gray-200 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
            <h3 className="font-bold text-gray-700 mb-2">Onboarding Checklist</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Guide new staff through every onboarding step with automated task tracking and deadline reminders.
            </p>
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors">
              Notify Me →
            </a>
          </div>

        </div>
      </div>

      {/* BOTTOM CTA STRIP */}
      <div className="bg-[#3da777]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <p className="text-white font-medium text-base sm:text-lg">
            More tools are in development. Have a tool idea?
          </p>
          <Link
            href="/help"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#3da777] rounded-xl font-bold text-sm hover:bg-green-50 transition-colors shadow-sm flex-shrink-0"
          >
            Contact Us
          </Link>
        </div>
      </div>

    </div>
  );
}
