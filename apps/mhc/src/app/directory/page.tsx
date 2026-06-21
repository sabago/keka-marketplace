"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Building2, Phone, Mail, Globe, Loader2 } from "lucide-react";
import SecondaryNav from "@/components/SecondaryNav";

interface Agency {
  id: string;
  agencyName: string;
  licenseNumber: string;
  city: string;
  state: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
}

export default function DirectoryPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredAgencies, setFilteredAgencies] = useState<Agency[]>([]);

  useEffect(() => {
    fetchAgencies();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = agencies.filter((agency) =>
        agency.agencyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agency.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agency.state.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAgencies(filtered);
    } else {
      setFilteredAgencies(agencies);
    }
  }, [searchQuery, agencies]);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agencies');

      if (!response.ok) {
        throw new Error('Failed to fetch agencies');
      }

      const data = await response.json();
      setAgencies(data.agencies || []);
      setFilteredAgencies(data.agencies || []);
    } catch (error) {
      console.error("Error fetching agencies:", error);
      setAgencies([]);
      setFilteredAgencies([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section style={{ backgroundColor: "#48ccbc" }} className="text-white">
        <div className="w-full">
          <img
            src="/images/marketplacehomeimage.jpg"
            alt="Healthcare professionals providing home care services"
            className="w-full h-auto object-cover rounded-lg shadow-lg"
          />
        </div>
      </section>

      {/* Secondary Navigation */}
      <SecondaryNav />

      {/* Main Content */}
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#0B4F96] rounded-lg flex items-center justify-center">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Agency Directory</h1>
                <p className="text-gray-600 mt-1">
                  Find verified home care agencies in your area
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by agency name, city, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-[#0B4F96] animate-spin mb-4" />
              <p className="text-gray-600">Loading agencies...</p>
            </div>
          ) : filteredAgencies.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No agencies found
              </h3>
              <p className="text-gray-600">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : "No agencies are currently listed in the directory"}
              </p>
            </div>
          ) : (
            /* Agency List */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgencies.map((agency) => (
                <div
                  key={agency.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {agency.agencyName}
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#0B4F96] flex-shrink-0 mt-0.5" />
                      <span>
                        {agency.city}, {agency.state}
                      </span>
                    </div>

                    {agency.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-[#0B4F96] flex-shrink-0 mt-0.5" />
                        <a href={`tel:${agency.phone}`} className="hover:text-[#0B4F96]">
                          {agency.phone}
                        </a>
                      </div>
                    )}

                    {agency.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="w-4 h-4 text-[#0B4F96] flex-shrink-0 mt-0.5" />
                        <a href={`mailto:${agency.email}`} className="hover:text-[#0B4F96] break-all">
                          {agency.email}
                        </a>
                      </div>
                    )}

                    {agency.website && (
                      <div className="flex items-start gap-2">
                        <Globe className="w-4 h-4 text-[#0B4F96] flex-shrink-0 mt-0.5" />
                        <a
                          href={agency.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#0B4F96] break-all"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>

                  {agency.description && (
                    <p className="mt-4 text-sm text-gray-600 line-clamp-3">
                      {agency.description}
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      License: {agency.licenseNumber}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Card */}
          <div className="mt-8 bg-blue-50 border-l-4 border-[#0B4F96] p-4 rounded-r-lg">
            <p className="text-sm text-gray-700">
              <strong>About the Directory:</strong> All agencies listed here have been
              verified by our platform administrators. If you&apos;re an agency and want to be
              listed, please{" "}
              <a href="/auth/signup" className="text-[#0B4F96] hover:underline font-medium">
                sign up here
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
