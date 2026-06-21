'use client';

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';

interface KnowledgeBaseSearchProps {
  onSearch: (query: string) => void;
  onStateFilter: (state: string) => void;
  selectedState: string;
}

export default function KnowledgeBaseSearch({
  onSearch,
  onStateFilter,
  selectedState,
}: KnowledgeBaseSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Debounce could be added here for better UX
    onSearch(query);
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStateFilter(e.target.value);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search Bar */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>Search Articles</span>
            </div>
          </label>
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by title or keywords..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
            />
          </form>
        </div>

        {/* State Filter */}
        <div>
          <label htmlFor="state-filter" className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>Filter by State</span>
            </div>
          </label>
          <select
            id="state-filter"
            value={selectedState}
            onChange={handleStateChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent bg-white"
          >
            <option value="">All States</option>
            <option value="MA">Massachusetts (MA)</option>
            {/* Add more states as content expands */}
            <option value="CA">California (CA)</option>
            <option value="NY">New York (NY)</option>
            <option value="TX">Texas (TX)</option>
            <option value="FL">Florida (FL)</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {(searchQuery || selectedState) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 bg-[#48ccbc] text-white px-3 py-1 rounded-full">
                Search: {searchQuery}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    onSearch('');
                  }}
                  className="ml-1 hover:text-gray-200"
                >
                  ×
                </button>
              </span>
            )}
            {selectedState && (
              <span className="inline-flex items-center gap-1 bg-[#0B4F96] text-white px-3 py-1 rounded-full">
                State: {selectedState}
                <button
                  onClick={() => onStateFilter('')}
                  className="ml-1 hover:text-gray-200"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
