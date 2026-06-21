"use client";

import { useEffect, useState } from "react";
import {
  Users,
  FolderOpen,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface StatsData {
  referralsLogged: number;
  referralsChange: number;
  directoriesAccessed: number;
  directoriesChange: number;
  avgResponseTime: number;
  responseTimeChange: number;
  successRate: number;
  successRateChange: number;
}

export default function DashboardStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: "Referrals Logged",
      value: stats.referralsLogged,
      change: stats.referralsChange,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Directories Accessed",
      value: stats.directoriesAccessed,
      change: stats.directoriesChange,
      icon: FolderOpen,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
    {
      title: "Avg Response Time",
      value: `${stats.avgResponseTime}h`,
      change: stats.responseTimeChange,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      invertChange: true, // Lower is better
    },
    {
      title: "Success Rate",
      value: `${stats.successRate}%`,
      change: stats.successRateChange,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        const isPositive = card.invertChange ? card.change < 0 : card.change > 0;
        const changeColor = isPositive ? "text-green-600" : "text-red-600";
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
              {card.change !== 0 && (
                <div className={`flex items-center ${changeColor}`}>
                  <TrendIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">
                    {Math.abs(card.change)}%
                  </span>
                </div>
              )}
            </div>

            <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>

            <p className="text-xs text-gray-500 mt-2">
              {isPositive ? "Up" : "Down"} from last month
            </p>
          </div>
        );
      })}
    </div>
  );
}
