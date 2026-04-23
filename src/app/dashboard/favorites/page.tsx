"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Star, ExternalLink, Trash2, Edit2, Save, X } from "lucide-react";
import Link from "next/link";

interface Favorite {
  id: string;
  articleSlug: string;
  articleTitle?: string;
  articleCategory?: string;
  notes?: string;
  createdAt: string;
}

export default function FavoritesPage() {
  const { data: session } = useSession();
  const isStaff = session?.user?.role === "AGENCY_USER";
  const isAdmin =
    session?.user?.role === "AGENCY_ADMIN" ||
    session?.user?.role === "PLATFORM_ADMIN" ||
    session?.user?.role === "SUPERADMIN";

  const [liveApprovalStatus, setLiveApprovalStatus] = useState<string | null>(null);
  const isSuspended = liveApprovalStatus === "SUSPENDED" || liveApprovalStatus === "REJECTED";
  const actionsDisabled = isSuspended && !isAdmin;

  const [myFavorites, setMyFavorites] = useState<Favorite[]>([]);
  const [agencyFavorites, setAgencyFavorites] = useState<Favorite[]>([]);
  const [view, setView] = useState<"mine" | "agency">("agency");
  const favorites = (isStaff || view === "mine") ? myFavorites : agencyFavorites;

  // Once session loads, force staff to "mine" view
  useEffect(() => {
    if (isStaff) setView("mine");
  }, [isStaff]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const [statusData, response] = await Promise.all([
        fetch("/api/agency/status").then((r) => r.ok ? r.json() : null),
        fetch("/api/favorites"),
      ]);
      if (statusData?.approvalStatus) setLiveApprovalStatus(statusData.approvalStatus);
      if (response.ok) {
        const data = await response.json();
        setMyFavorites(data.myFavorites || []);
        setAgencyFavorites(data.agencyFavorites || data.favorites || []);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    if (!confirm("Are you sure you want to remove this from favorites?")) {
      return;
    }

    try {
      const response = await fetch(`/api/favorites/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const updater = (list: Favorite[]) => list.filter((fav) => fav.id !== id);
        view === "mine" ? setMyFavorites(updater) : setAgencyFavorites(updater);
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
      alert("Failed to remove favorite");
    }
  };

  const handleStartEdit = (favorite: Favorite) => {
    setEditingId(favorite.id);
    setEditNotes(favorite.notes || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNotes("");
  };

  const handleSaveNotes = async (id: string) => {
    try {
      const response = await fetch(`/api/favorites/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: editNotes }),
      });

      if (response.ok) {
        const updater = (list: Favorite[]) =>
          list.map((fav) => (fav.id === id ? { ...fav, notes: editNotes } : fav));
        view === "mine" ? setMyFavorites(updater) : setAgencyFavorites(updater);
        setEditingId(null);
        setEditNotes("");
      }
    } catch (error) {
      console.error("Error updating notes:", error);
      alert("Failed to update notes");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Star className="h-8 w-8 text-yellow-500 mr-3 fill-yellow-500" />
            Favorite Referral Sources
          </h1>
          <p className="text-gray-600">
            Quick access to your most-used referral sources with personal notes
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          {!isStaff && (
            <button
              onClick={() => setView("agency")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${view === "agency" ? "bg-[#0B4F96] text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}`}
            >
              All Agency ({agencyFavorites.length})
            </button>
          )}
          <button
            onClick={() => setView("mine")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${(isStaff || view === "mine") ? "bg-[#0B4F96] text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}`}
          >
            Saved by Me ({myFavorites.length})
          </button>
        </div>

        {/* Favorites Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-md p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Star className="h-20 w-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">
              No favorites yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start adding referral sources to your favorites for quick access.
              Browse the knowledge base and click the star icon on any guide.
            </p>
            {actionsDisabled ? (
              <span
                className="inline-flex items-center px-6 py-3 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed"
                title="Your agency account is suspended"
              >
                Browse Knowledge Base
                <ExternalLink className="h-5 w-5 ml-2" />
              </span>
            ) : (
              <Link
                href="/knowledge-base"
                className="inline-flex items-center px-6 py-3 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors"
              >
                Browse Knowledge Base
                <ExternalLink className="h-5 w-5 ml-2" />
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {favorite.articleTitle || favorite.articleSlug}
                        </h3>
                        {favorite.articleCategory && (
                          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                            {favorite.articleCategory}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveFavorite(favorite.id)}
                        className="text-yellow-500 hover:text-red-500 transition-colors ml-2"
                        title="Remove from favorites"
                      >
                        <Star className="h-6 w-6 fill-yellow-500" />
                      </button>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="p-6 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Private Notes
                      </label>
                      {editingId === favorite.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSaveNotes(favorite.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Save notes"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-500 hover:text-gray-700"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(favorite)}
                          className="text-gray-500 hover:text-[#0B4F96]"
                          title="Edit notes"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {editingId === favorite.id ? (
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent resize-none"
                        rows={4}
                        placeholder="Add your notes here..."
                      />
                    ) : (
                      <p className="text-sm text-gray-600 min-h-[80px]">
                        {favorite.notes || (
                          <span className="italic text-gray-400">
                            No notes yet. Click the edit icon to add notes.
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-6 pt-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <Link
                        href={`/knowledge-base/${favorite.articleSlug}`}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors text-sm font-medium"
                      >
                        View Guide
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Link>
                      <button
                        onClick={() => handleRemoveFavorite(favorite.id)}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Favorites</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {favorites.length}
                  </p>
                </div>
                <Link
                  href="/knowledge-base"
                  className="flex items-center text-[#0B4F96] hover:text-[#48ccbc] font-medium"
                >
                  Add More Favorites
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
