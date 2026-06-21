"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import SecondaryNav from "@/components/SecondaryNav";

interface NavLink {
  href: string;
  label: string;
}

function useNavLinks(): NavLink[] {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const orgId = (session?.user as { orgId?: string | null } | undefined)?.orgId;

  if (!session) return [];

  const links: NavLink[] = [{ href: '/dashboard', label: 'Dashboard' }];

  if (role === 'PLATFORM_ADMIN') {
    links.push({ href: '/admin/agencies', label: 'Agencies' });
    links.push({ href: '/admin/admins', label: 'Admins' });
    if (orgId) {
      links.push({ href: '/agency', label: 'My Agency' });
      links.push({ href: '/my-credentials', label: 'My Credentials' });
    }
  } else if (role === 'SUPERADMIN') {
    links.push({ href: '/admin/agencies', label: 'Agencies' });
    links.push({ href: '/admin/admins', label: 'Admins' });
  } else if (role === 'AGENCY_ADMIN') {
    links.push({ href: '/agency', label: 'My Agency' });
    links.push({ href: '/my-credentials', label: 'My Credentials' });
  } else if (role === 'AGENCY_USER') {
    links.push({ href: '/my-credentials', label: 'My Credentials' });
  }

  return links;
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const navLinks = useNavLinks();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return !!pathname?.startsWith('/dashboard');
    if (href === '/admin/agencies') return !!pathname?.startsWith('/admin');
    if (href === '/admin/admins') return pathname === '/admin/admins';
    if (href === '/agency') return !!pathname?.startsWith('/agency');
    if (href === '/my-credentials') return !!pathname?.startsWith('/my-credentials');
    return pathname === href;
  };

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              aria-label="CredTrack"
            >
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] text-white flex items-center justify-center font-bold text-base flex-shrink-0">
                CT
              </span>
              <span className="flex items-baseline gap-1 text-[19px] leading-none">
                <span className="font-semibold text-[#0B4F96]">Cred</span>
                <span className="font-bold text-[#48ccbc]">Track</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {!session && (
                <Link
                  href="/pricing"
                  className={`hover:text-[#48ccbc] ${
                    pathname === "/pricing" ? "text-[#48ccbc] font-medium" : "text-gray-600"
                  }`}
                >
                  Pricing
                </Link>
              )}
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`hover:text-[#48ccbc] ${
                    isActive(href) ? "text-[#48ccbc] font-medium" : "text-gray-600"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {session ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/account"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 bg-[#0B4F96] rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {session.user?.name || session.user?.email || "Account"}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-gray-600 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="text-[#0B4F96] hover:text-[#48ccbc] text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-gray-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <nav className="flex flex-col space-y-4">
              {!session && (
                <Link
                  href="/pricing"
                  className={`hover:text-blue-600 ${pathname === "/pricing" ? "text-[#0B4F96] font-medium" : "text-gray-600"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
              )}
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`hover:text-blue-600 ${isActive(href) ? "text-[#0B4F96] font-medium" : "text-gray-600"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}

              {/* Auth */}
              {session ? (
                <>
                  <Link
                    href="/account"
                    className="flex items-center text-gray-600 hover:text-[#0B4F96]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-5 w-5 text-[#0B4F96] mr-2" />
                    <span className="font-medium">
                      {session.user?.name || session.user?.email || "Account"}
                    </span>
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="flex items-center text-gray-600 hover:text-red-600"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  className="flex items-center text-[#0B4F96] hover:text-[#48ccbc]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-5 w-5 mr-2" />
                  <span>Sign In</span>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
      <SecondaryNav />
    </header>
  );
}
