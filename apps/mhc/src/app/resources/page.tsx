'use client';

import Link from 'next/link';
import AnimatedSection from '@/components/AnimatedSection';

const businessTopics = [
  {
    illustration: '/images/undraw/plan-business.svg',
    illustrationAlt: 'Plan your business illustration',
    accentBg: '#e8eef8',
    accentColor: '#0b4f96',
    title: 'Plan your business',
    description:
      'Plan your business by laying a strong foundation with clear goals, compliance strategies, and systems that align your mission with long-term success in home care.',
    topics: [
      'Market research and competitive analysis',
      'Write your business plan',
      'Calculate your startup costs',
      'Establish business credit',
      'Fund your business',
      'Buy an existing business or franchise',
    ],
  },
  {
    illustration: '/images/undraw/launch-business.svg',
    illustrationAlt: 'Launch your business illustration',
    accentBg: '#e6f4f1',
    accentColor: '#48ccbc',
    title: 'Launch your business',
    description:
      'Launch your business with confidence by turning your home care vision into reality through proper licensing, branding, and operational setup.',
    topics: [
      'Pick your business location',
      'Choose a business structure',
      'Choose your business name',
      'Register your business',
      'Get federal and state tax ID numbers',
      'Apply for licenses and permits',
      'Open a business bank account',
      'Get business insurance',
    ],
  },
  {
    illustration: '/images/undraw/manage-business.svg',
    illustrationAlt: 'Manage your business illustration',
    accentBg: '#fef3e2',
    accentColor: '#d97706',
    title: 'Manage your business',
    description:
      'Manage your business efficiently with smart systems for staffing, billing, compliance, and day-to-day operations to ensure quality care and sustainable growth.',
    topics: [
      'Manage your finances',
      'Hire and manage employees',
      'Pay taxes',
      'Stay legally compliant',
      'Buy assets and equipment',
      'Marketing and sales',
      'Accreditation Support',
      'Employee Learning Hub',
      'Prepare for emergencies',
      'Recover from disasters',
      'Close or sell your business',
      'Hire employees with disabilities',
    ],
    highlightedTopics: ['Accreditation Support', 'Employee Learning Hub'],
  },
  {
    illustration: '/images/undraw/grow-business.svg',
    illustrationAlt: 'Grow your business illustration',
    accentBg: '#e6f9f0',
    accentColor: '#16a34a',
    title: 'Grow your business',
    description:
      'Grow your business by expanding your services, diversifying revenue streams, and leveraging partnerships, technology, and marketing to reach more clients and increase impact.',
    topics: [
      'Get more funding',
      'Expand to new locations',
      'Merge and acquire businesses',
      'Become a franchise',
      'Export products',
      'Women-owned businesses',
      'Native American-owned businesses',
      'Veteran-owned businesses',
      'Military spouse businesses',
      'Rural businesses',
      'Minority-owned businesses',
    ],
  },
];

const howWeHelp = [
  {
    illustration: '/images/undraw/counseling.svg',
    illustrationAlt: 'Business counseling illustration',
    title: 'Business counseling',
    description: 'Get business advice from our partnering organizations and experts.',
    href: '/contact',
  },
  {
    illustration: '/images/undraw/loans.svg',
    illustrationAlt: 'Guaranteed business loans illustration',
    title: 'Guaranteed business loans',
    description: 'Find an SBA lender near you to help fund your business.',
    href: '/contact',
  },
  {
    illustration: '/images/undraw/government.svg',
    illustrationAlt: 'Federal government contracting illustration',
    title: 'Federal government contracting',
    description: 'Learn how to find and win small business government contracts.',
    href: '/contact',
  },
  {
    illustration: '/images/undraw/disaster.svg',
    illustrationAlt: 'Home and business disaster loans illustration',
    title: 'Home & business disaster loans',
    description: 'Apply for a low-interest disaster loan to help recover from declared disasters.',
    href: '/contact',
  },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-[#0b4f96] overflow-hidden">
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/[0.04] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-24 text-center">
          <p className="text-[#48ccbc] text-xs font-bold uppercase tracking-widest mb-4">
            RESOURCE MAP
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
            Everything you need to<br className="hidden sm:block" /> run a home care agency.
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            Your complete guide to planning, launching, managing, and growing a home care agency in Massachusetts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/resources/knowledge-base"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-white text-sm transition-colors bg-[#3da777] hover:bg-[#359268]"
            >
              Browse Referral Directory →
            </Link>
            <Link
              href="/memberships"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-white text-sm border-2 border-white/40 hover:border-white transition-colors"
            >
              Become a Member
            </Link>
          </div>
        </div>

        {/* Wave divider */}
        <div className="relative h-12 -mb-px">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0 48 C360 0 1080 0 1440 48 L1440 48 L0 48 Z" fill="#fdf6e3" />
          </svg>
        </div>
      </section>

      {/* ── TRUST STRIP ─────────────────────────────────────── */}
      <div className="bg-[#fdf6e3] border-b border-[#e8e0c8]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {['124+ referral sources', 'Built for MA home care', '10+ years of experience', 'Free to get started'].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 tracking-wide uppercase">
                <span className="text-[#3da777]">✓</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── BUSINESS TOPICS ─────────────────────────────────── */}
      <section className="bg-[#fdf6e3] py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-20">
          {businessTopics.map((card, i) => {
            const isEven = i % 2 === 0;
            return (
              <div
                key={card.title}
                className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center"
              >
                {/* Illustration — left on even rows, right (order-last) on odd */}
                <AnimatedSection
                  animation={isEven ? 'slide-left' : 'slide-right'}
                  delay={100}
                  className={isEven ? '' : 'md:order-last'}
                >
                  <div
                    className="rounded-2xl overflow-hidden flex items-center justify-center h-64 shadow-sm"
                    style={{ backgroundColor: card.accentBg }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.illustration}
                      alt={card.illustrationAlt}
                      className="h-52 w-full object-contain px-8"
                    />
                  </div>
                </AnimatedSection>

                {/* Text */}
                <AnimatedSection
                  animation={isEven ? 'slide-right' : 'slide-left'}
                  delay={200}
                >
                  <p
                    className="text-xs font-bold tracking-widest uppercase mb-2"
                    style={{ color: card.accentColor }}
                  >
                    {['PLAN', 'LAUNCH', 'MANAGE', 'GROW'][i]}
                  </p>
                  <h3 className="text-2xl font-bold text-[#0b4f96] mb-3">{card.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-5">{card.description}</p>
                  <ul className="space-y-1.5">
                    {card.topics.map((topic) => {
                      const isHighlighted = (card as any).highlightedTopics?.includes(topic);
                      return (
                        <li key={topic} className="flex items-center gap-2 text-sm">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: isHighlighted ? card.accentColor : '#cbd5e1' }}
                          />
                          {isHighlighted ? (
                            <span style={{ color: card.accentColor }} className="font-medium">{topic}</span>
                          ) : (
                            <span className="text-gray-700">{topic}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </AnimatedSection>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── HOW WE HELP ─────────────────────────────────────── */}
      <section className="bg-[#f7f5f0] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#48ccbc] text-xs font-bold uppercase tracking-widest mb-2 text-center">HOW WE HELP</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0b4f96] mb-10 text-center">
            Supporting Home Care businesses
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howWeHelp.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Illustration band */}
                <div className="flex items-center justify-center h-36 overflow-hidden bg-[#e8eef8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.illustration}
                    alt={item.illustrationAlt}
                    className="h-28 w-full object-contain px-4"
                  />
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-base font-bold text-[#0b4f96] mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-5 flex-1">{item.description}</p>
                  <Link
                    href={item.href}
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#3da777] hover:bg-[#359268] transition-colors"
                  >
                    Learn more →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ────────────────────────────────────────── */}
      <section className="relative bg-[#0b4f96] overflow-hidden">
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Wave divider top */}
        <div className="relative h-12 -mt-px">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="absolute top-0 w-full" preserveAspectRatio="none">
            <path d="M0 0 C360 48 1080 48 1440 0 L1440 0 L0 0 Z" fill="#f7f5f0" />
          </svg>
        </div>
        <div className="relative max-w-2xl mx-auto px-4 pb-16 text-center">
          <p className="text-[#48ccbc] text-xs font-bold uppercase tracking-widest mb-3">GET STARTED</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Start and grow your business
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed mb-8">
            Want to be an entrepreneur? Learn how to get started on your home care business today.
          </p>
          <Link
            href="/memberships"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-white text-base bg-[#3da777] hover:bg-[#359268] transition-colors"
          >
            Become a Member →
          </Link>
        </div>
      </section>

    </div>
  );
}
