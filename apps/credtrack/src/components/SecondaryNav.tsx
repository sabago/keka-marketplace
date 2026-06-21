'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const AGENCY_SUBNAV = [
  { href: '/agency', label: 'Overview', exact: true },
  { href: '/agency/staff', label: 'Staff' },
  { href: '/agency/compliance', label: 'Compliance' },
  { href: '/agency/credentials/review', label: 'Credentials Review' },
  { href: '/agency/document-types', label: 'Document Types' },
  { href: '/agency/settings', label: 'Settings' },
  { href: '/agency/subscription', label: 'Subscription' },
  { href: '/agency/audit-log', label: 'Audit Log' },
];

const ADMIN_SUBNAV = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/agencies', label: 'Agencies' },
  { href: '/admin/admins', label: 'Admins' },
];

export default function SecondaryNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = session?.user?.role;
  const orgId = (session?.user as { orgId?: string | null } | undefined)?.orgId;

  const isAdminPage = pathname?.startsWith('/admin');
  const isAgencyPage = pathname?.startsWith('/agency');
  const isMyCredentialsPage = pathname?.startsWith('/my-credentials');

  const linkClass = (active: boolean) =>
    `text-sm transition-colors hover:text-[#48ccbc] whitespace-nowrap ${
      active
        ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
        : 'text-gray-600'
    }`;

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    if (href === '/agency') return pathname === '/agency';
    return !!pathname?.startsWith(href);
  };

  // --- PLATFORM_ADMIN ---
  if (role === 'PLATFORM_ADMIN') {
    if (isAdminPage) {
      const links = [...ADMIN_SUBNAV];
      if (orgId) {
        links.push({ href: '/agency', label: 'My Agency', exact: true });
      }
      return (
        <SubNavBar>
          {links.map(({ href, label, exact }) => (
            <Link key={href} href={href} className={linkClass(isActive(href, exact))}>
              {label}
            </Link>
          ))}
        </SubNavBar>
      );
    }
    if (isAgencyPage && orgId) {
      return (
        <SubNavBar>
          {AGENCY_SUBNAV.map(({ href, label, exact }) => (
            <Link key={href} href={href} className={linkClass(isActive(href, exact))}>
              {label}
            </Link>
          ))}
        </SubNavBar>
      );
    }
    if (isMyCredentialsPage && orgId) {
      return (
        <SubNavBar>
          <Link href="/my-credentials" className={linkClass(!!pathname?.startsWith('/my-credentials'))}>
            My Credentials
          </Link>
        </SubNavBar>
      );
    }
    return null;
  }

  // --- SUPERADMIN ---
  if (role === 'SUPERADMIN') {
    if (isAdminPage) {
      return (
        <SubNavBar>
          {ADMIN_SUBNAV.map(({ href, label, exact }) => (
            <Link key={href} href={href} className={linkClass(isActive(href, exact))}>
              {label}
            </Link>
          ))}
        </SubNavBar>
      );
    }
    return null;
  }

  // --- AGENCY_ADMIN ---
  if (role === 'AGENCY_ADMIN') {
    if (isAgencyPage) {
      return (
        <SubNavBar>
          {AGENCY_SUBNAV.map(({ href, label, exact }) => (
            <Link key={href} href={href} className={linkClass(isActive(href, exact))}>
              {label}
            </Link>
          ))}
        </SubNavBar>
      );
    }
    if (isMyCredentialsPage) {
      return (
        <SubNavBar>
          <Link href="/my-credentials" className={linkClass(!!pathname?.startsWith('/my-credentials'))}>
            My Credentials
          </Link>
        </SubNavBar>
      );
    }
    return null;
  }

  // --- AGENCY_USER ---
  if (role === 'AGENCY_USER' && isMyCredentialsPage) {
    return (
      <SubNavBar>
        <Link href="/my-credentials" className={linkClass(!!pathname?.startsWith('/my-credentials'))}>
          My Credentials
        </Link>
      </SubNavBar>
    );
  }

  return null;
}

function SubNavBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center space-x-6 overflow-x-auto">{children}</nav>
      </div>
    </div>
  );
}
