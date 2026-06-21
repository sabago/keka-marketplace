'use client';

import { Check, Star } from 'lucide-react';

export interface PricingTier {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
  annualSavings?: number;
}

interface PricingCardProps {
  tier: PricingTier;
  onSelect: () => void;
}

export default function PricingCard({ tier, onSelect }: PricingCardProps) {
  const { name, price, period, description, features, cta, popular, annualSavings } = tier;

  return (
    <div
      className={`relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-8 h-full flex flex-col ${
        popular ? 'border-4 border-[#48ccbc] scale-105' : 'border border-gray-200'
      }`}
    >
      {/* Popular Badge */}
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-[#48ccbc] text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
            <Star className="w-4 h-4 fill-current" />
            Most Popular
          </div>
        </div>
      )}

      {/* Tier Name */}
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        {price === 0 ? (
          <div className="text-5xl font-bold text-[#0B4F96]">Free</div>
        ) : (
          <>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-bold text-[#0B4F96]">${price}</span>
              <span className="text-gray-600">/{period}</span>
            </div>
            {annualSavings && (
              <div className="mt-2 text-sm text-[#48ccbc] font-semibold">
                Save ${annualSavings}/year with annual billing
              </div>
            )}
          </>
        )}
      </div>

      {/* Features List */}
      <div className="flex-1 mb-8">
        <ul className="space-y-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <button
        onClick={onSelect}
        className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all ${
          popular
            ? 'bg-[#48ccbc] hover:bg-[#3ab8a8] text-white shadow-lg hover:shadow-xl'
            : 'bg-[#0B4F96] hover:bg-[#0a4280] text-white'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
