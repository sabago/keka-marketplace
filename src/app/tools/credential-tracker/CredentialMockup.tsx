'use client';

import { useState, useEffect } from 'react';
import { Upload, Cpu, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

type CycleState = 0 | 1 | 2;

const staticRows = [
  { label: 'RN License', status: 'active', days: '312 days' },
  { label: 'BCI / Background Check', status: 'expiring', days: '18 days' },
  { label: 'TB Test', status: 'active', days: '204 days' },
];

export default function CredentialMockup() {
  const [state, setState] = useState<CycleState>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setState(prev => ((prev + 1) % 3) as CycleState);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto lg:mx-0 lg:max-w-none select-none">
      {/* Browser chrome */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(11,79,150,0.18), 0 4px 16px rgba(0,0,0,0.08)' }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#0b4f96' }}>
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-bold tracking-wide">Credential Tracker</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3da777] animate-pulse" />
            <span className="text-[10px] font-semibold text-green-300 uppercase tracking-widest">Live</span>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-4 py-4 space-y-3">

          {/* Cycling credential card */}
          <div
            className="rounded-xl border p-4 transition-all duration-500"
            style={{
              borderColor: state === 0 ? '#e5e7eb' : state === 1 ? '#48ccbc' : '#3da777',
              borderStyle: state === 0 ? 'dashed' : 'solid',
              backgroundColor: state === 0 ? '#f9fafb' : state === 1 ? 'rgba(72,204,188,0.04)' : 'rgba(61,167,119,0.04)',
            }}
          >
            {state === 0 && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-4 h-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">CPR_Card_Smith.pdf</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Uploading document…</p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                </div>
              </div>
            )}

            {state === 1 && (
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(72,204,188,0.15)' }}
                >
                  <Cpu className="w-4 h-4 animate-pulse" style={{ color: '#48ccbc' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: '#48ccbc' }}>AI Reading…</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Extracting issuer · expiry date · license #</p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <div
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'rgba(72,204,188,0.3)', borderTopColor: '#48ccbc' }}
                  />
                </div>
              </div>
            )}

            {state === 2 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#3da777' }} />
                    <span className="text-xs font-bold" style={{ color: '#3da777' }}>Active</span>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(61,167,119,0.12)', color: '#3da777' }}
                  >
                    247 days remaining
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-800">CPR Card — Jane Smith</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Expires Jan 15, 2026 · American Red Cross</p>
              </div>
            )}
          </div>

          {/* State progress dots */}
          <div className="flex justify-center gap-1.5 py-0.5">
            {([0, 1, 2] as CycleState[]).map(i => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: state === i ? 16 : 6,
                  height: 6,
                  backgroundColor: state === i ? '#0b4f96' : '#e5e7eb',
                }}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Static compliance rows */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Staff Compliance</p>
            {staticRows.map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {row.status === 'active' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#3da777' }} />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                  )}
                  <span className="text-xs text-gray-700">{row.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-300" />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: row.status === 'expiring' ? '#e07b2a' : '#6b7280' }}
                  >
                    {row.days}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
