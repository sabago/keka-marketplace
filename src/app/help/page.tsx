'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, HelpCircle, Mail, ArrowRight } from 'lucide-react';

const faqs = [
  {
    question: 'How do I get started with Mastering HomeCare?',
    answer:
      'Create a free account at mastering homecare.com/auth/signup or request access at /memberships. Once your account is approved, you can access the resource library, credential tracking dashboard, and referral directory. New accounts are reviewed within 1 business day.',
  },
  {
    question: 'How does credential tracking work?',
    answer:
      'Upload a PDF, JPG, or PNG of any staff credential — CPR cards, RN licenses, HHA certificates, background checks, and more. Our AI system (OCR + GPT-4) automatically extracts the expiration date, issuer, and license number. You will receive email alerts at 30 days and 7 days before each credential expires.',
  },
  {
    question: 'What types of documents can I upload?',
    answer:
      'We support PDF, JPG, and PNG files up to 10 MB. Supported credential types include CPR/First Aid, RN and LPN licenses, HHA certificates, BCI/background checks, TB tests, I-9 work authorization, continuing education records, and liability insurance certificates.',
  },
  {
    question: 'How do I make a marketplace purchase?',
    answer:
      'Browse the marketplace at /marketplace to find digital products, templates, and resources. Add items to your cart and check out using a credit or debit card via our secure Stripe payment integration. Purchased downloads are available immediately from your account.',
  },
  {
    question: 'How do I invite staff members to my agency account?',
    answer:
      'Agency administrators can invite staff from the Agency Settings page. Enter the staff member\'s email address and they will receive an invite link. Staff members get access to upload their own credentials and view their compliance status. The number of staff seats available depends on your membership tier.',
  },
  {
    question: 'How do I update my account or billing information?',
    answer:
      'Go to Account Settings (top right menu) to update your name, email, or password. To manage your subscription, go to Agency > Subscription. Billing is handled securely through Stripe — we do not store your card details on our servers.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-4 text-sm sm:text-base">{question}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#0B4F96] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed pt-3">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#0B4F96]">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/[0.04] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-12 md:pt-20 md:pb-16 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-blue-200 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
            <HelpCircle className="w-3 h-3" />
            Help Center
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            How can we help?
          </h1>
          <p className="text-blue-200 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Find answers to common questions about getting started, credential tracking, and managing your account.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-center gap-2 mb-6">
          <p className="text-xs font-semibold text-[#0B4F96] uppercase tracking-wider">Frequently Asked Questions</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>

      {/* CONTACT SUPPORT */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0B4F96]/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-5 h-5 text-[#0B4F96]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Still need help?</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Our support team is based in Wakefield, MA and responds within 1 business day.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:info@masteringhomecare.com"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B4F96] text-white rounded-xl font-semibold text-sm hover:bg-[#0a4280] transition-colors"
            >
              Email support <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
