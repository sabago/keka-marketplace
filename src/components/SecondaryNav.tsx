'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/lib/useCart';
import { useState } from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function SecondaryNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { getTotalItems, isHydrated } = useCart();
  const [searchQuery, setSearchQuery] = useState('');

  // Get the cart item count
  const cartItemCount = isHydrated ? getTotalItems() : 0;

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const searchUrl = `/marketplace?search=${encodeURIComponent(searchQuery)}`;
      router.push(searchUrl);
    }
  };

  // Check if user is a platform admin (for admin links)
  const isPlatformAdmin = session?.user?.role === 'PLATFORM_ADMIN';

  // Check if we're on a marketplace-related page
  const isMarketplacePage =
    pathname === '/marketplace' ||
    pathname === '/categories' ||
    (pathname?.startsWith('/admin') && !pathname?.startsWith('/admin/agencies'));

  // Check if we're on a directory-related page
  const isDirectoryPage =
    pathname?.startsWith('/knowledge-base') ||
    pathname === '/directory' ||
    pathname?.startsWith('/directory/');

  // Check if we're on an agency-related page
  const isAgencyPage = pathname?.startsWith('/agency');

  // Check if user has agency access
  const hasAgencyAccess =
    session?.user?.role === 'AGENCY_ADMIN' || session?.user?.role === 'AGENCY_USER';

  // Don't render if not on a marketplace, directory, or agency page
  if (!isMarketplacePage && !isDirectoryPage && !isAgencyPage) {
    return null;
  }

  return (
    <div className="bg-gray-50 border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center justify-between">
          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {isMarketplacePage && (
              <>
                <Link
                  href="/marketplace"
                  className={`text-sm hover:text-[#48ccbc] transition-colors ${
                    pathname === '/marketplace' ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1' : 'text-gray-600'
                  }`}
                >
                  Marketplace
                </Link>
                <Link
                  href="/categories"
                  className={`text-sm hover:text-[#48ccbc] transition-colors ${
                    pathname === '/categories'
                      ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                      : 'text-gray-600'
                  }`}
                >
                  Categories
                </Link>
                {/* Show Admin link for platform admins only */}
                {isPlatformAdmin && (
                  <Link
                    href="/admin"
                    className={`text-sm hover:text-[#48ccbc] transition-colors ${
                      pathname?.startsWith('/admin')
                        ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                        : 'text-gray-600'
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}

            {isDirectoryPage && (
              <>
                <Link
                  href="/knowledge-base"
                  className={`text-sm hover:text-[#48ccbc] transition-colors ${
                    pathname?.startsWith('/knowledge-base')
                      ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                      : 'text-gray-600'
                  }`}
                >
                  Directory
                </Link>
                {/* Show Directory Admin link for platform admins only */}
                {isPlatformAdmin && (
                  <Link
                    href="/directory/admin"
                    className={`text-sm hover:text-[#48ccbc] transition-colors ${
                      pathname?.startsWith('/directory/admin')
                        ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                        : 'text-gray-600'
                    }`}
                  >
                    Directory Admin
                  </Link>
                )}
              </>
            )}

            {isAgencyPage && hasAgencyAccess && (
              <>
                <Link
                  href="/agency"
                  className={`text-sm hover:text-[#48ccbc] transition-colors ${
                    pathname === '/agency'
                      ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                      : 'text-gray-600'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  href="/agency/employees"
                  className={`text-sm hover:text-[#48ccbc] transition-colors ${
                    pathname?.startsWith('/agency/employees')
                      ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                      : 'text-gray-600'
                  }`}
                >
                  Employees
                </Link>
                <Link
                  href="/agency/compliance"
                  className={`text-sm hover:text-[#48ccbc] transition-colors ${
                    pathname === '/agency/compliance'
                      ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                      : 'text-gray-600'
                  }`}
                >
                  Compliance
                </Link>
                <Link
                  href="/agency/document-types"
                  className={`text-sm hover:text-[#48ccbc] transition-colors ${
                    pathname === '/agency/document-types'
                      ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                      : 'text-gray-600'
                  }`}
                >
                  Document Types
                </Link>
                <Link
                  href="/agency/staff"
                  className={`text-sm hover:text-[#48ccbc] transition-colors ${
                    pathname === '/agency/staff'
                      ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                      : 'text-gray-600'
                  }`}
                >
                  Staff
                </Link>
                <Link
                  href="/agency/settings"
                  className={`text-sm hover:text-[#48ccbc] transition-colors ${
                    pathname === '/agency/settings'
                      ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                      : 'text-gray-600'
                  }`}
                >
                  Settings
                </Link>
                <Link
                  href="/agency/subscription"
                  className={`text-sm hover:text-[#48ccbc] transition-colors ${
                    pathname === '/agency/subscription'
                      ? 'text-[#0B4F96] font-medium border-b-2 border-[#0B4F96] pb-1'
                      : 'text-gray-600'
                  }`}
                >
                  Subscription
                </Link>
              </>
            )}
          </div>

          {/* Search and Cart (Marketplace only) */}
          {isMarketplacePage && (
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="pl-10 pr-4 py-2 border rounded-l-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <button
                  type="submit"
                  className="bg-[#0B4F96] text-white px-4 py-2 rounded-r-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  Search
                </button>
              </form>

              {/* Cart Icon */}
              <Link href="/cart" className="relative">
                <ShoppingCart className="h-6 w-6 text-gray-600 hover:text-blue-600" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#48ccbc] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
