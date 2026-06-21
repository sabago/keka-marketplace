'use client';

import { useState } from 'react';
import { Cpu, Bell, ShieldCheck, BarChart2, Users, FileCheck } from 'lucide-react';

const tabs = [
  {
    id: 'parsing',
    num: '01',
    label: 'AI Parsing',
    icon: Cpu,
    tagline: 'No manual entry. Ever.',
    desc: 'Drop in any document — PDF, photo, or scan. Our AI reads the issuer, license number, and expiry date in seconds. It also flags missing fields, duplicate uploads, and conflicting information before anything hits your compliance record.',
    detail: '85–95% extraction accuracy · 10–30 sec per document',
  },
  {
    id: 'alerts',
    num: '02',
    label: 'Multi-Tier Alerts',
    icon: Bell,
    tagline: 'Nothing slips before a survey.',
    desc: 'Staff and agency admins receive email reminders at 90, 30, 14, and 7 days before any credential expires. No more last-minute scrambles the night before a state inspection.',
    detail: 'Alerts at 90 · 30 · 14 · 7 days',
  },
  {
    id: 'verification',
    num: '03',
    label: 'License Verify',
    icon: ShieldCheck,
    tagline: 'Validated against official databases.',
    desc: 'Nursing licenses, therapy licenses, social worker licenses, and other state-regulated credentials are automatically verified against public licensing authorities — with a full audit trail of every check.',
    detail: '6-step verification · Permanent audit record',
  },
  {
    id: 'dashboard',
    num: '04',
    label: 'Dashboard',
    icon: BarChart2,
    tagline: 'Your entire agency at a glance.',
    desc: 'One live compliance view across all staff. Green means covered. Red means act now. Filter by credential type, department, or expiry window — and export a snapshot for any audit or accreditation review.',
    detail: 'Real-time · Filterable · Export-ready',
  },
  {
    id: 'onboarding',
    num: '05',
    label: 'Onboarding',
    icon: Users,
    tagline: 'New hires know exactly what to submit.',
    desc: 'Auto-assigns personalized credential checklists based on employee role and state requirements the moment someone joins. Tracks completion in real time so nothing falls through the cracks during onboarding.',
    detail: 'Role-based · Automated · Admin visibility',
  },
  {
    id: 'reports',
    num: '06',
    label: 'Audit Reports',
    icon: FileCheck,
    tagline: 'Survey-ready in one click.',
    desc: 'Every submission, verification result, approval action, and renewal is logged with a timestamp. Generate a full compliance history report for surveys, accreditation reviews, or state inspections in seconds.',
    detail: 'Full history · Timestamped · One-click export',
  },
];

export default function FeatureTabs() {
  const [active, setActive] = useState(0);
  const tab = tabs[active];

  return (
    <div className="w-full">
      {/* Tab strip */}
      <div className="flex overflow-x-auto border-b border-white/10 mb-0 scrollbar-hide -mx-6 px-6 lg:mx-0 lg:px-0">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActive(i)}
            className="flex-shrink-0 text-left px-5 py-4 border-b-2 transition-all duration-200 focus:outline-none"
            style={{
              borderBottomColor: active === i ? '#48ccbc' : 'transparent',
              backgroundColor: active === i ? 'rgba(72,204,188,0.08)' : 'transparent',
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: active === i ? '#48ccbc' : 'rgba(255,255,255,0.4)' }}>
              {t.num} · {t.label.toUpperCase()}
            </p>
            <p className="text-sm font-semibold whitespace-nowrap" style={{ color: active === i ? '#ffffff' : 'rgba(255,255,255,0.6)' }}>
              {t.label}
            </p>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        key={tab.id}
        className="mt-0 rounded-b-2xl rounded-tr-2xl p-8"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(61,167,119,0.2)' }}>
                <tab.icon className="w-5 h-5" style={{ color: '#3da777' }} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#3da777' }}>{tab.num} · {tab.label}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">{tab.tagline}</h3>
            <p className="text-blue-200 text-base leading-relaxed mb-5">{tab.desc}</p>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'rgba(72,204,188,0.12)', color: '#48ccbc', border: '1px solid rgba(72,204,188,0.25)' }}
            >
              {tab.detail}
            </div>
          </div>

          {/* Visual accent — decorative stat/icon panel */}
          <div
            className="rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[180px]"
            style={{ backgroundColor: 'rgba(11,79,150,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(61,167,119,0.15)' }}
            >
              <tab.icon className="w-8 h-8" style={{ color: '#3da777' }} />
            </div>
            <p className="text-white font-bold text-lg mb-1">{tab.label}</p>
            <p className="text-xs text-blue-300">{tab.detail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
