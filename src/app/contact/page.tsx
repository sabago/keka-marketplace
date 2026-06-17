'use client';

import { useState } from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    agencyName: '',
    phone: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <main>
      {/* Hero */}
      <section style={{ backgroundColor: '#0b4f96' }} className="relative pt-20 pb-32 px-4 text-center text-white overflow-hidden">
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#48ccbc' }}>
            GET IN TOUCH
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: '#bfdbfe' }}>
            We&apos;d love to hear from you. Reach out with questions, feedback, or partnership inquiries.
          </p>
        </div>
        {/* Wave divider */}
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0,32 C360,64 1080,0 1440,32 L1440,64 L0,64 Z" fill="#fdf6e3" />
        </svg>
      </section>

      {/* Trust strip */}
      <section style={{ backgroundColor: '#fdf6e3' }} className="py-4 px-4 border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          <span style={{ color: '#3da777' }}>✓ HIPAA-aware</span>
          <span>·</span>
          <span>Responds within 1 business day</span>
          <span>·</span>
          <span>MA-based team</span>
          <span>·</span>
          <span>No credit card required</span>
        </div>
      </section>

      {/* Contact section */}
      <section style={{ backgroundColor: '#f7f5f0' }} className="py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* Left — contact details */}
          <div className="p-4 flex flex-col gap-6 h-full">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#3da777' }}>
                REACH OUT
              </p>
              <h2 className="text-2xl font-bold" style={{ color: '#0b4f96' }}>
                Get in Touch
              </h2>
            </div>
            <p className="text-gray-500">
              Have a question about our platform or need help with your agency account? Our team is happy to help.
            </p>

            <div className="flex flex-col gap-5 mt-2">
              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 shrink-0" style={{ backgroundColor: '#e8faf7' }}>
                  <MapPin style={{ color: '#3da777' }} size={18} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Address</p>
                  <p className="text-gray-500 text-sm">26 Princess St, Suite 110</p>
                  <p className="text-gray-500 text-sm">Wakefield, MA 01880</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 shrink-0" style={{ backgroundColor: '#e8faf7' }}>
                  <Phone style={{ color: '#3da777' }} size={18} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Phone</p>
                  <a href="tel:+19783906996" className="text-gray-500 text-sm hover:underline">
                    (978) 390-6996
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 shrink-0" style={{ backgroundColor: '#e8faf7' }}>
                  <Mail style={{ color: '#3da777' }} size={18} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Email</p>
                  <a href="mailto:info@masteringhomecare.com" className="text-gray-500 text-sm hover:underline">
                    info@masteringhomecare.com
                  </a>
                </div>
              </div>
            </div>

            {/* Divider accent */}
            <div className="mt-auto pt-6 border-t-2" style={{ borderColor: '#48ccbc' }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#0b4f96' }}>Built by home care experts · 10+ years of industry experience</p>
            </div>
          </div>

          {/* Right — contact form on white card */}
          <div className="rounded-2xl bg-white shadow-sm p-8">
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8faf7' }}>
                  <Mail style={{ color: '#3da777' }} size={24} />
                </div>
                <p className="text-xl font-bold" style={{ color: '#0b4f96' }}>
                  Thanks! We&apos;ll be in touch soon.
                </p>
                <p className="text-sm text-gray-500">We typically respond within 1 business day.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#3da777' }}>
                    SEND A MESSAGE
                  </p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50"
                    style={{ '--tw-ring-color': '#3da777' } as React.CSSProperties}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50"
                    style={{ '--tw-ring-color': '#3da777' } as React.CSSProperties}
                  />
                </div>

                <div>
                  <label htmlFor="agencyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject / Agency Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="agencyName"
                    name="agencyName"
                    type="text"
                    required
                    value={form.agencyName}
                    onChange={handleChange}
                    placeholder="Your agency or inquiry subject"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50"
                    style={{ '--tw-ring-color': '#3da777' } as React.CSSProperties}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="How can we help?"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none bg-gray-50"
                    style={{ '--tw-ring-color': '#3da777' } as React.CSSProperties}
                  />
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-600">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="mt-1 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: '#3da777' }}
                >
                  {status === 'loading' ? 'Sending…' : 'Send Message →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
