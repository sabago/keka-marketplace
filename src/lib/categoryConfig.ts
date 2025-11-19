import { Hospital, Users, Heart, Shield, Building2, Flag, Network } from 'lucide-react';

export interface CategoryColor {
  base: string;
  light: string;
  dark: string;
  badge: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: typeof Hospital;
  color: CategoryColor;
  order: number;
}

// Category color definitions - WCAG AA compliant
export const categoryColors: Record<string, CategoryColor> = {
  'hospitals-health-systems': {
    base: '#2563EB',      // Blue
    light: '#DBEAFE',     // Light blue bg
    dark: '#1E40AF',      // Dark blue hover
    badge: '#EFF6FF',     // Very light blue badge
  },
  'aging-services-access-points': {
    base: '#9333EA',      // Purple
    light: '#F3E8FF',     // Light purple bg
    dark: '#7E22CE',      // Dark purple hover
    badge: '#FAF5FF',     // Very light purple badge
  },
  'aging-programs-coas-geriatrics': {
    base: '#059669',      // Emerald
    light: '#D1FAE5',     // Light emerald bg
    dark: '#047857',      // Dark emerald hover
    badge: '#ECFDF5',     // Very light emerald badge
  },
  'insurance-health-plans': {
    base: '#EA580C',      // Orange
    light: '#FFEDD5',     // Light orange bg
    dark: '#C2410C',      // Dark orange hover
    badge: '#FFF7ED',     // Very light orange badge
  },
  'mcos-acos': {
    base: '#4F46E5',      // Indigo
    light: '#E0E7FF',     // Light indigo bg
    dark: '#4338CA',      // Dark indigo hover
    badge: '#EEF2FF',     // Very light indigo badge
  },
  'veteran-military': {
    base: '#DC2626',      // Red
    light: '#FEE2E2',     // Light red bg
    dark: '#B91C1C',      // Dark red hover
    badge: '#FEF2F2',     // Very light red badge
  },
  'community-consumer-platforms': {
    base: '#0D9488',      // Teal
    light: '#CCFBF1',     // Light teal bg
    dark: '#0F766E',      // Dark teal hover
    badge: '#F0FDFA',     // Very light teal badge
  },
};

// Category definitions
export const categories: Category[] = [
  {
    id: '1',
    name: 'Hospitals & Health Systems',
    slug: 'hospitals-health-systems',
    description: 'Hospital discharge planning and health system partnership opportunities',
    icon: Hospital,
    color: categoryColors['hospitals-health-systems'],
    order: 1,
  },
  {
    id: '2',
    name: 'Aging Services Access Points',
    slug: 'aging-services-access-points',
    description: 'State-funded ASAPs, MassHealth, and aging services programs',
    icon: Users,
    color: categoryColors['aging-services-access-points'],
    order: 2,
  },
  {
    id: '3',
    name: 'Aging Programs & COAs',
    slug: 'aging-programs-coas-geriatrics',
    description: 'Councils on Aging, PACE programs, and local senior services',
    icon: Heart,
    color: categoryColors['aging-programs-coas-geriatrics'],
    order: 3,
  },
  {
    id: '4',
    name: 'Insurance & Health Plans',
    slug: 'insurance-health-plans',
    description: 'Medicare, MassHealth, and health insurance enrollment',
    icon: Shield,
    color: categoryColors['insurance-health-plans'],
    order: 4,
  },
  {
    id: '5',
    name: 'MCOs & ACOs',
    slug: 'mcos-acos',
    description: 'Managed Care Organizations and Accountable Care Organizations',
    icon: Building2,
    color: categoryColors['mcos-acos'],
    order: 5,
  },
  {
    id: '6',
    name: 'Veteran & Military',
    slug: 'veteran-military',
    description: 'VA healthcare systems and veteran benefit programs',
    icon: Flag,
    color: categoryColors['veteran-military'],
    order: 6,
  },
  {
    id: '7',
    name: 'Community & Consumer Platforms',
    slug: 'community-consumer-platforms',
    description: 'Consumer platforms, professional partnerships, and community networks',
    icon: Network,
    color: categoryColors['community-consumer-platforms'],
    order: 7,
  },
];

// Helper functions
export function getCategoryBySlug(slug: string | null): Category | undefined {
  if (!slug) return undefined;
  return categories.find(cat => cat.slug === slug);
}

export function getCategoryColor(slug: string | null): CategoryColor {
  if (!slug) return categoryColors['hospitals-health-systems']; // Default
  return categoryColors[slug] || categoryColors['hospitals-health-systems'];
}

export function normalizeCategorySlug(rawCategory: string): string {
  // Map from folder names to category slugs
  const mapping: Record<string, string> = {
    '1-hospitals-and-health-systems': 'hospitals-health-systems',
    '2-aging-services-access-points': 'aging-services-access-points',
    '3-aging-programs-coas-geriatrics': 'aging-programs-coas-geriatrics',
    '4-insurance-and-health-plans': 'insurance-health-plans',
    '5-mcos-and-acos': 'mcos-acos',
    '6-veteran-and-military': 'veteran-military',
    '7-community-and-consumer-platforms': 'community-consumer-platforms',
    // Support direct slugs as well
    'hospitals-health-systems': 'hospitals-health-systems',
    'aging-services-access-points': 'aging-services-access-points',
    'aging-programs-coas-geriatrics': 'aging-programs-coas-geriatrics',
    'insurance-health-plans': 'insurance-health-plans',
    'mcos-acos': 'mcos-acos',
    'veteran-military': 'veteran-military',
    'community-consumer-platforms': 'community-consumer-platforms',
    // Support frontmatter variations
    'hospital-platforms': 'hospitals-health-systems',
    'insurance-and-health-plans': 'insurance-health-plans',
    'overview': 'hospitals-health-systems', // Default for overview files
  };

  const normalized = mapping[rawCategory.toLowerCase()] || rawCategory;
  return normalized;
}
