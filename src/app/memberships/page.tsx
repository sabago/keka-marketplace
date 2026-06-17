import Link from 'next/link';
import { Check } from 'lucide-react';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    priceSuffix: '/ month',
    tagline: 'Start exploring at no cost',
    popular: false,
    cardBg: 'bg-white',
    cardBorder: 'border border-gray-200',
    nameColor: 'text-[#0B4F96]',
    checkColor: 'text-[#48ccbc]',
    features: [
      'Resource Map access',
      'Marketplace browsing',
      'Community updates',
      'Up to 3 staff members',
    ],
    ctaStyle: 'border-2 border-[#0B4F96] text-[#0B4F96] hover:bg-[#0B4F96] hover:text-white',
  },
  {
    name: 'Silver',
    price: '$29',
    priceSuffix: '/ month',
    tagline: 'Essential tools for home care startups',
    popular: false,
    cardBg: 'bg-white',
    cardBorder: 'border border-gray-200',
    nameColor: 'text-[#0B4F96]',
    checkColor: 'text-[#48ccbc]',
    features: [
      'Everything in Free',
      'Business planning templates',
      'Licensing & registration guide',
      'Up to 10 staff members',
      'Basic credential tracking',
    ],
    ctaStyle: 'border-2 border-[#0B4F96] text-[#0B4F96] hover:bg-[#0B4F96] hover:text-white',
  },
  {
    name: 'Gold',
    price: '$79',
    priceSuffix: '/ month',
    tagline: 'Comprehensive resources for growing agencies',
    popular: true,
    cardBg: 'bg-[#e8faf8]',
    cardBorder: 'border-2 border-[#48ccbc]',
    nameColor: 'text-[#0B4F96]',
    checkColor: 'text-[#48ccbc]',
    features: [
      'Everything in Silver',
      'Policy & procedure samples',
      'Marketing toolkit & templates',
      'Up to 30 staff members',
      'AI credential parsing & alerts',
    ],
    ctaStyle: 'bg-[#48ccbc] text-white hover:bg-[#3ab8a8]',
  },
  {
    name: 'Premium',
    price: '$149',
    priceSuffix: '/ month',
    tagline: 'All-in-one toolkit with expert guidance',
    popular: false,
    cardBg: 'bg-white',
    cardBorder: 'border border-gray-200',
    nameColor: 'text-[#0B4F96]',
    checkColor: 'text-[#e07b2a]',
    features: [
      'Everything in Gold',
      'Unlimited staff members',
      '1:1 startup consultation (30 min)',
      'Dedicated onboarding support',
      'Priority support & early access',
    ],
    ctaStyle: 'border-2 border-[#0B4F96] text-[#0B4F96] hover:bg-[#0B4F96] hover:text-white',
  },
];

const trustItems = [
  'Free plan always available',
  'Cancel anytime',
  'HIPAA-aware platform',
  '30-day money-back guarantee',
];

export default function MembershipsPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#0B4F96]">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-16 md:pt-20 md:pb-20 text-center">
          <p className="text-[#48ccbc] text-xs font-bold tracking-widest uppercase mb-4">
            MEMBERSHIPS
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            Find the Perfect Plan<br className="hidden sm:block" /> for Your Agency
          </h1>
          <p className="text-blue-200 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Whether you're just starting out or scaling an established agency, we have a tier for your stage.
          </p>
        </div>

        {/* Wave divider */}
        <div className="relative h-12 -mb-px">
          <svg
            viewBox="0 0 1440 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0 w-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 48 C360 0 1080 0 1440 48 L1440 48 L0 48 Z"
              fill="#fdf6e3"
            />
          </svg>
        </div>
      </div>

      {/* TRUST STRIP */}
      <div className="bg-[#fdf6e3] border-b border-[#e8e0c8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {trustItems.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 tracking-wide uppercase">
                <span className="text-[#3da777]">✓</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CARDS */}
      <div className="bg-[#f4f6f8] py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
            {tiers.map((tier) => (
              <div key={tier.name} className="relative pt-5 flex flex-col">
                {/* "MOST POPULAR" badge floats above card */}
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-[#48ccbc] text-white text-xs font-bold px-4 py-1 rounded-full tracking-widest uppercase whitespace-nowrap">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div
                  className={`rounded-2xl flex flex-col flex-1 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${tier.cardBg} ${tier.cardBorder}`}
                >
                  {/* Card header */}
                  <div className="px-6 pt-6 pb-0">
                    <h2 className={`text-xl font-bold ${tier.nameColor}`}>{tier.name}</h2>
                    <p className="text-sm text-gray-500 mt-1 leading-snug">{tier.tagline}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[#0B4F96]">{tier.price}</span>
                      <span className="text-sm text-gray-400 ml-1">{tier.priceSuffix}</span>
                    </div>
                    <Link
                      href="/auth/signup"
                      className={`mt-4 w-full block text-center py-2.5 px-4 rounded-xl font-bold text-sm transition-colors ${tier.ctaStyle}`}
                    >
                      Sign Up →
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="mx-6 mt-5 border-t border-gray-200" />

                  {/* Features */}
                  <div className="px-6 py-5 flex-1">
                    <ul className="space-y-3">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tier.checkColor}`} />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 text-center">
          <p className="text-[#48ccbc] text-xs font-bold tracking-widest uppercase mb-3">
            NEED HELP CHOOSING?
          </p>
          <h2 className="text-2xl font-bold text-[#0B4F96] mb-3">Not sure which tier is right for you?</h2>
          <p className="text-gray-500 text-sm mb-7 max-w-md mx-auto">
            Start with the free plan and upgrade at any time. No contracts, no hidden fees — just the tools your agency needs.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-7 py-3 bg-[#3da777] text-white rounded-full font-bold text-sm hover:bg-[#359268] transition-colors shadow-sm"
          >
            Create a free account →
          </Link>
        </div>
      </div>
    </div>
  );
}
