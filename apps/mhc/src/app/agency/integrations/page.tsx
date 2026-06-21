"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

interface WebhookSub {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

const WEBHOOK_EVENTS = [
  "credential.approved",
  "credential.rejected",
  "credential.expiring",
  "credential.expired",
];

export default function IntegrationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState("");

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookSub[]>([]);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookError, setWebhookError] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/auth/signin"); return; }
    if (session.user?.role !== "AGENCY_ADMIN" && session.user?.role !== "PLATFORM_ADMIN") {
      router.push("/dashboard"); return;
    }
    fetchAll();
  }, [session, status]);

  const fetchAll = async () => {
    setLoading(true);
    const [keysRes, hooksRes] = await Promise.all([
      fetch("/api/agency/api-keys"),
      fetch("/api/agency/webhooks"),
    ]);
    if (keysRes.ok) setApiKeys((await keysRes.json()).keys ?? []);
    if (hooksRes.ok) setWebhooks((await hooksRes.json()).subscriptions ?? []);
    setLoading(false);
  };

  // ── API Keys ──────────────────────────────────────────────────────────────

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setKeyLoading(true);
    setKeyError("");
    setGeneratedKey(null);

    const res = await fetch("/api/agency/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });

    const data = await res.json();
    if (!res.ok) { setKeyError(data.error ?? "Failed to create key"); }
    else {
      setGeneratedKey(data.key);
      setNewKeyName("");
      setApiKeys((prev) => [{ id: data.id, name: data.name, keyPrefix: data.keyPrefix, createdAt: data.createdAt, revokedAt: null, lastUsedAt: null }, ...prev]);
    }
    setKeyLoading(false);
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Revoke this API key? Any integrations using it will stop working.")) return;
    await fetch(`/api/agency/api-keys/${id}`, { method: "DELETE" });
    setApiKeys((prev) => prev.map((k) => k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k));
  };

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Webhooks ──────────────────────────────────────────────────────────────

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl || webhookEvents.length === 0) return;
    setWebhookLoading(true);
    setWebhookError("");
    setGeneratedSecret(null);

    const res = await fetch("/api/agency/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        events: webhookEvents,
        ...(webhookSecret ? { secret: webhookSecret } : {}),
      }),
    });

    const data = await res.json();
    if (!res.ok) { setWebhookError(data.error ?? "Failed to create webhook"); }
    else {
      setGeneratedSecret(data.secret);
      setWebhooks((prev) => [{ id: data.id, url: data.url, events: data.events, active: data.active, createdAt: data.createdAt }, ...prev]);
      setWebhookUrl("");
      setWebhookEvents([]);
      setWebhookSecret("");
      setShowWebhookForm(false);
    }
    setWebhookLoading(false);
  };

  const handleToggleWebhook = async (id: string, active: boolean) => {
    await fetch(`/api/agency/webhooks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, active: !active } : w));
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Delete this webhook subscription?")) return;
    await fetch(`/api/agency/webhooks/${id}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600 mt-1">
            Manage API keys for HR system sync and webhooks for real-time event notifications.
          </p>
        </div>

        {/* ── API KEYS ───────────────────────────────────────────────────── */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-[#0B4F96]" />
            <h2 className="text-xl font-bold text-gray-900">API Keys</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Use API keys to authenticate inbound syncs from BambooHR, Gusto, or Zapier via{" "}
            <code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;key&gt;</code>.
            The raw key is shown once — store it securely.
          </p>

          {/* Generated key banner */}
          {generatedKey && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                <Check className="h-4 w-4" /> API key created — copy it now, it won&apos;t be shown again
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-green-300 rounded px-3 py-2 text-sm font-mono break-all">
                  {generatedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedKey, setKeyCopied)}
                  className="p-2 text-green-700 hover:text-green-900"
                  title="Copy"
                >
                  {keyCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Create key form */}
          <form onSubmit={handleCreateKey} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. BambooHR Production)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
            />
            <button
              type="submit"
              disabled={keyLoading || !newKeyName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0B4F96] text-white text-sm rounded-lg hover:bg-[#0a4485] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {keyLoading ? "Creating..." : "Create"}
            </button>
          </form>
          {keyError && (
            <p className="text-sm text-red-600 mb-3 flex items-center gap-1">
              <XCircle className="h-4 w-4" /> {keyError}
            </p>
          )}

          {/* Keys list */}
          {apiKeys.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No API keys yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{key.name}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {key.keyPrefix}••••••••
                      {key.revokedAt && (
                        <span className="ml-2 text-red-500 font-sans">(revoked)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {!key.revokedAt && (
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Revoke"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── WEBHOOKS ───────────────────────────────────────────────────── */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-[#0B4F96]" />
              <h2 className="text-xl font-bold text-gray-900">Webhook Subscriptions</h2>
            </div>
            <button
              onClick={() => setShowWebhookForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4485]"
            >
              <Plus className="h-4 w-4" />
              Add Webhook
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Receive real-time HTTP POST notifications when credential events occur. Payloads are
            signed with <code className="bg-gray-100 px-1 rounded">X-Webhook-Signature: sha256=...</code>.
          </p>

          {/* Generated secret banner */}
          {generatedSecret && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                <Check className="h-4 w-4" /> Webhook created — save the signing secret now
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-green-300 rounded px-3 py-2 text-sm font-mono break-all">
                  {generatedSecret}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedSecret, setSecretCopied)}
                  className="p-2 text-green-700 hover:text-green-900"
                  title="Copy"
                >
                  {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Add webhook form */}
          {showWebhookForm && (
            <form
              onSubmit={handleCreateWebhook}
              className="mb-6 p-4 border border-gray-200 rounded-lg space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-system.com/webhooks/keka"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Events to subscribe
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <label key={event} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={webhookEvents.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="h-4 w-4 text-[#0B4F96] rounded"
                      />
                      <code className="text-xs text-gray-700">{event}</code>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signing Secret{" "}
                  <span className="text-gray-400 font-normal">(auto-generated if blank)</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    minLength={16}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {webhookError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> {webhookError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={webhookLoading || !webhookUrl || webhookEvents.length === 0}
                  className="px-4 py-2 bg-[#0B4F96] text-white text-sm rounded-lg hover:bg-[#0a4485] disabled:opacity-50"
                >
                  {webhookLoading ? "Creating..." : "Create Webhook"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWebhookForm(false)}
                  className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Webhooks list */}
          {webhooks.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No webhook subscriptions yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {webhooks.map((wh) => (
                <div key={wh.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm text-gray-900 font-mono truncate">{wh.url}</code>
                        <span
                          className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                            wh.active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {wh.active ? "active" : "paused"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {wh.events.map((ev) => (
                          <span
                            key={ev}
                            className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Created {new Date(wh.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleWebhook(wh.id, wh.active)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {wh.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(wh.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-yellow-500" />
              Failed deliveries are automatically retried with exponential backoff: 5 min → 30 min → 2 hr (max 3 attempts).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
