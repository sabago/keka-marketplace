"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  FileText,
  ArrowRight,
  TrendingUp,
  Star,
  Search,
  Activity,
} from "lucide-react";
import QueryUsageWidget from "@/components/QueryUsageWidget";
import DashboardStats from "@/components/DashboardStats";
import AIRecommendations from "@/components/AIRecommendations";
import Link from "next/link";

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon: string;
}

interface TrendingSource {
  slug: string;
  title: string;
  viewCount: number;
  category: string;
}

export default function DashboardPage() {
  const [agencyName, setAgencyName] = useState("Agency");
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [trendingSources, setTrendingSources] = useState<TrendingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // For now, we'll use mock data. In production, this would fetch from API
      setAgencyName("Your Agency");

      // Mock recent activity
      setRecentActivity([
        {
          id: "1",
          type: "query",
          description: "Asked about skilled nursing facilities in Massachusetts",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          icon: "search",
        },
        {
          id: "2",
          type: "referral",
          description: "Logged referral to Mass General Hospital",
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          icon: "file",
        },
        {
          id: "3",
          type: "favorite",
          description: "Added Beth Israel Deaconess to favorites",
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          icon: "star",
        },
      ]);

      // Mock trending sources
      setTrendingSources([
        {
          slug: "ma-hospitals-mass-general",
          title: "Massachusetts General Hospital",
          viewCount: 234,
          category: "Hospitals",
        },
        {
          slug: "ma-skilled-nursing-hebrew-rehab",
          title: "Hebrew Rehabilitation Center",
          viewCount: 189,
          category: "Skilled Nursing",
        },
        {
          slug: "ma-home-health-vna-care",
          title: "VNA Care Network",
          viewCount: 156,
          category: "Home Health",
        },
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (iconType: string) => {
    switch (iconType) {
      case "search":
        return <Search className="h-5 w-5" />;
      case "file":
        return <FileText className="h-5 w-5" />;
      case "star":
        return <Star className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {agencyName}!
          </h1>
          <p className="text-gray-600">
            Here's an overview of your referral management activity
          </p>
        </div>

        {/* Query Usage Widget */}
        <div className="mb-8">
          <QueryUsageWidget />
        </div>

        {/* Quick Stats Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Stats</h2>
          <DashboardStats />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Activity - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Clock className="h-6 w-6 text-[#0B4F96] mr-2" />
                  Recent Activity
                </h3>
                <Link
                  href="/dashboard/referrals"
                  className="text-sm text-[#0B4F96] hover:text-[#48ccbc] font-medium"
                >
                  View All
                </Link>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No recent activity yet</p>
                  <p className="text-sm mt-1">Start using the platform to see your activity here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="p-2 bg-blue-50 rounded-full text-[#0B4F96]">
                        {getActivityIcon(activity.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trending Sources - 1/3 width */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <TrendingUp className="h-6 w-6 text-[#48ccbc] mr-2" />
                  Trending
                </h3>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {trendingSources.map((source, index) => (
                    <Link
                      key={source.slug}
                      href={`/knowledge-base/${source.slug}`}
                      className="block p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg font-bold text-[#48ccbc]">
                              #{index + 1}
                            </span>
                            <h4 className="text-sm font-semibold text-gray-800 truncate">
                              {source.title}
                            </h4>
                          </div>
                          <p className="text-xs text-gray-500">{source.category}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {source.viewCount} views this week
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#0B4F96] transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="mb-8">
          <AIRecommendations />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/dashboard/referrals"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
          >
            <FileText className="h-8 w-8 text-[#0B4F96] mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Track Referrals</h3>
            <p className="text-sm text-gray-600 mb-4">
              Log and monitor your referral submissions
            </p>
            <span className="text-[#0B4F96] group-hover:text-[#48ccbc] font-medium text-sm flex items-center">
              Go to Referrals
              <ArrowRight className="h-4 w-4 ml-1" />
            </span>
          </Link>

          <Link
            href="/dashboard/favorites"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
          >
            <Star className="h-8 w-8 text-[#48ccbc] mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Favorites</h3>
            <p className="text-sm text-gray-600 mb-4">
              Quick access to your bookmarked sources
            </p>
            <span className="text-[#0B4F96] group-hover:text-[#48ccbc] font-medium text-sm flex items-center">
              View Favorites
              <ArrowRight className="h-4 w-4 ml-1" />
            </span>
          </Link>

          <Link
            href="/knowledge-base"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
          >
            <Search className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Explore Directory</h3>
            <p className="text-sm text-gray-600 mb-4">
              Browse all referral sources and guides
            </p>
            <span className="text-[#0B4F96] group-hover:text-[#48ccbc] font-medium text-sm flex items-center">
              Browse Directory
              <ArrowRight className="h-4 w-4 ml-1" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
