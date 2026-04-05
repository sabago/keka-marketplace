"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Calendar, Filter } from "lucide-react";

interface AnalyticsData {
  referralsByMonth: Array<{ month: string; count: number }>;
  topSources: Array<{ name: string; count: number }>;
  statusBreakdown: Array<{ name: string; value: number }>;
  responseTimeByDay: Array<{ day: string; avgTime: number }>;
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("6months");

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/dashboard/analytics?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Colors for charts
  const COLORS = ["#0B4F96", "#48ccbc", "#10b981", "#f59e0b", "#ef4444"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Mock data for demo (replace with real data from API)
  const mockData: AnalyticsData = {
    referralsByMonth: [
      { month: "Jan", count: 12 },
      { month: "Feb", count: 19 },
      { month: "Mar", count: 15 },
      { month: "Apr", count: 25 },
      { month: "May", count: 22 },
      { month: "Jun", count: 30 },
    ],
    topSources: [
      { name: "Mass General Hospital", count: 45 },
      { name: "Hebrew Rehab Center", count: 38 },
      { name: "VNA Care Network", count: 32 },
      { name: "Beth Israel Deaconess", count: 28 },
      { name: "Brigham and Women's", count: 24 },
    ],
    statusBreakdown: [
      { name: "Accepted", value: 45 },
      { name: "Pending", value: 28 },
      { name: "Responded", value: 18 },
      { name: "Declined", value: 9 },
    ],
    responseTimeByDay: [
      { day: "Mon", avgTime: 24 },
      { day: "Tue", avgTime: 18 },
      { day: "Wed", avgTime: 22 },
      { day: "Thu", avgTime: 20 },
      { day: "Fri", avgTime: 28 },
      { day: "Sat", avgTime: 36 },
      { day: "Sun", avgTime: 42 },
    ],
  };

  const data = analyticsData || mockData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
              <TrendingUp className="h-8 w-8 text-[#0B4F96] mr-3" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-600">Visualize your referral patterns and performance</p>
          </div>

          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
            >
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Referrals Per Month - Line Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Referrals Per Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.referralsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#0B4F96"
                strokeWidth={2}
                name="Referrals"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Sources - Bar Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Top 5 Referral Sources
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topSources} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="count" fill="#48ccbc" name="Referrals" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Breakdown - Pie Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response Time by Day - Bar Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Average Response Time by Day of Week
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.responseTimeByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgTime" fill="#10b981" name="Avg Response Time (hours)" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-600 mt-4">
            Lower response times indicate faster processing by referral sources
          </p>
        </div>

        {/* Insights Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
            <h4 className="text-lg font-semibold mb-2">Best Performing Day</h4>
            <p className="text-3xl font-bold mb-2">Tuesday</p>
            <p className="text-sm text-blue-100">
              Fastest average response time at 18 hours
            </p>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-md p-6 text-white">
            <h4 className="text-lg font-semibold mb-2">Top Performer</h4>
            <p className="text-3xl font-bold mb-2">45</p>
            <p className="text-sm text-teal-100">Referrals to Mass General Hospital</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
            <h4 className="text-lg font-semibold mb-2">Success Rate</h4>
            <p className="text-3xl font-bold mb-2">72%</p>
            <p className="text-sm text-green-100">Of referrals accepted or started</p>
          </div>
        </div>

        {/* Export Options */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Reports</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors">
              Export to PDF
            </button>
            <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Export to Excel
            </button>
            <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Schedule Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
