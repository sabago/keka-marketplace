"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

interface Recommendation {
  slug: string;
  title: string;
  category: string;
  compatibilityScore: number;
  reason: string;
  tags: string[];
}

export default function AIRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch("/api/recommendations");
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <Sparkles className="h-6 w-6 text-[#48ccbc] mr-2" />
          <h3 className="text-xl font-semibold text-gray-800">AI Recommendations</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Sparkles className="h-6 w-6 text-[#48ccbc] mr-2" />
          <h3 className="text-xl font-semibold text-gray-800">AI Recommendations</h3>
        </div>
        <p className="text-gray-600">
          No recommendations available yet. Use the platform more to get personalized suggestions!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Sparkles className="h-6 w-6 text-[#48ccbc] mr-2" />
          <h3 className="text-xl font-semibold text-gray-800">AI Recommendations</h3>
        </div>
        <span className="text-sm text-gray-500">Personalized for you</span>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-4 hover:border-[#0B4F96] hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h4 className="text-lg font-semibold text-gray-800 mr-3">{rec.title}</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {rec.compatibilityScore}% match
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{rec.category}</p>

                {/* Tags */}
                {rec.tags && rec.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {rec.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Reason */}
                <div className="bg-[#48ccbc]/10 border-l-4 border-[#48ccbc] p-3 rounded mb-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Why recommended?</span> {rec.reason}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href={`/knowledge-base/${rec.slug}`}
              className="inline-flex items-center text-[#0B4F96] hover:text-[#48ccbc] font-medium text-sm transition-colors"
            >
              View Guide
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/knowledge-base"
          className="text-sm text-gray-600 hover:text-[#0B4F96] transition-colors"
        >
          Browse all referral sources
        </Link>
      </div>
    </div>
  );
}
