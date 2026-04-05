'use client';

import { ApprovalStatus, AgencySize } from '@prisma/client';
import { Building2, Users, MapPin, Calendar, Mail } from 'lucide-react';

interface AgencyUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Agency {
  id: string;
  agencyName: string;
  licenseNumber: string;
  agencySize: AgencySize;
  primaryContactName: string;
  primaryContactEmail: string;
  approvalStatus: ApprovalStatus;
  createdAt: string | Date;
  serviceArea: string[];
  users: AgencyUser[];
  _count?: {
    users: number;
  };
}

interface AgencyListProps {
  agencies: Agency[];
  onAgencyClick: (agencyId: string) => void;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
  SUSPENDED: 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusLabels = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

export default function AgencyList({ agencies, onAgencyClick }: AgencyListProps) {
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (agencies.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No agencies found</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {agencies.map((agency) => (
          <div
            key={agency.id}
            onClick={() => onAgencyClick(agency.id)}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {agency.agencyName}
                </h3>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <Building2 className="h-4 w-4 mr-1" />
                  {agency.licenseNumber}
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                  statusColors[agency.approvalStatus]
                }`}
              >
                {statusLabels[agency.approvalStatus]}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-600">
                <Users className="h-4 w-4 mr-2 text-gray-400" />
                <span className="font-medium">{agency.primaryContactName}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                <span className="truncate">{agency.primaryContactEmail}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                <span>{agency.serviceArea[0] || 'N/A'}</span>
              </div>
              <div className="flex items-center text-gray-500 text-xs mt-2">
                <Calendar className="h-3 w-3 mr-1" />
                Submitted {formatDate(agency.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Agency
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                License #
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Primary Contact
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Location
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Submitted
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {agencies.map((agency) => (
              <tr
                key={agency.id}
                onClick={() => onAgencyClick(agency.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-[#0B4F96] rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {agency.agencyName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {agency.agencySize} • {agency._count?.users || 0} users
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{agency.licenseNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{agency.primaryContactName}</div>
                  <div className="text-sm text-gray-500">{agency.primaryContactEmail}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {agency.serviceArea[0] || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                      statusColors[agency.approvalStatus]
                    }`}
                  >
                    {statusLabels[agency.approvalStatus]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(agency.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
