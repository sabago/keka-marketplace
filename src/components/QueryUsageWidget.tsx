"use client";

import { useEffect, useState } from "react";
import { Activity, TrendingUp, Infinity } from "lucide-react";

interface UsageData {
  queriesUsed: number;
  queriesLimit: number;
  isUnlimited: boolean;
  resetDate: string;
  daysUntilReset: number;
}

export default function QueryUsageWidget() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      const response = await fetch("/api/dashboard/usage");
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      }
    } catch (error) {
      console.error("Error fetching usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (!usageData) {
    return null;
  }

  const { queriesUsed, queriesLimit, isUnlimited, daysUntilReset } = usageData;
  const percentage = isUnlimited ? 0 : (queriesUsed / queriesLimit) * 100;

  // Determine color based on usage
  const getColor = () => {
    if (isUnlimited) return "text-purple-600";
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = () => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#0B4F96]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Activity className="h-6 w-6 text-[#0B4F96] mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Query Usage</h3>
        </div>
        {!isUnlimited && percentage >= 70 && (
          <TrendingUp className={`h-5 w-5 ${getColor()}`} />
        )}
      </div>

      {isUnlimited ? (
        <div className="flex items-center space-x-3">
          <Infinity className="h-8 w-8 text-purple-600" />
          <div>
            <p className="text-2xl font-bold text-purple-600">Unlimited queries</p>
            <p className="text-sm text-gray-500">No usage limits on your plan</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <div className="flex justify-between items-baseline mb-2">
              <p className={`text-2xl font-bold ${getColor()}`}>
                {queriesUsed} / {queriesLimit}
              </p>
              <span className="text-sm text-gray-500">{percentage.toFixed(0)}% used</span>
            </div>
            <p className="text-sm text-gray-600">queries used this month</p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>

          {/* Reset Information */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Resets in{" "}
              <span className="font-semibold text-gray-800">
                {daysUntilReset} {daysUntilReset === 1 ? "day" : "days"}
              </span>
            </span>
            {percentage >= 70 && (
              <button className="text-[#0B4F96] hover:text-[#48ccbc] font-medium transition-colors">
                Upgrade Plan
              </button>
            )}
          </div>

          {/* Warning Messages */}
          {percentage >= 90 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <span className="font-semibold">Warning:</span> You're approaching your query
                limit. Consider upgrading to continue uninterrupted access.
              </p>
            </div>
          )}

          {percentage >= 70 && percentage < 90 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                You've used {percentage.toFixed(0)}% of your monthly queries. Plan ahead to avoid
                hitting your limit.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
