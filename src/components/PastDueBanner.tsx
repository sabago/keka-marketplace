"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X, CreditCard } from "lucide-react";

/**
 * Shown across all agency pages when subscriptionStatus === PAST_DUE.
 * Fetches a Stripe billing portal URL so the admin can update their card immediately.
 */
export default function PastDueBanner() {
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/usage")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.subscriptionStatus) setSubscriptionStatus(data.subscriptionStatus);
      })
      .catch(() => {});

    fetch("/api/agency/subscription/portal-url")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.url) setPortalUrl(data.url);
      })
      .catch(() => {});
  }, []);

  if (dismissed || subscriptionStatus !== "PAST_DUE") return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 flex-1">
          <strong>Payment past due.</strong> Your last payment failed. Stripe will retry automatically — please update your payment method to avoid losing access.
        </p>
        {portalUrl && (
          <a
            href={portalUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors shrink-0"
          >
            <CreditCard className="h-4 w-4" />
            Update Card
          </a>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800 shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
