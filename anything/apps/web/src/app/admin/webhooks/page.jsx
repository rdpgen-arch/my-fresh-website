"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch, authJson } from "@/utils/authFetch";
import {
  Plus,
  Trash2,
  Webhook,
  ToggleLeft,
  ToggleRight,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_EVENTS = [
  { value: "product.created", label: "Product Created" },
  { value: "product.updated", label: "Product Updated" },
  { value: "product.deleted", label: "Product Deleted" },
  { value: "order.created", label: "Order Created" },
  { value: "order.updated", label: "Order Updated" },
  { value: "order.fulfilled", label: "Order Fulfilled" },
  { value: "order.cancelled", label: "Order Cancelled" },
  { value: "customer.created", label: "Customer Created" },
  { value: "customer.updated", label: "Customer Updated" },
];

const EVENT_DOMAINS = {
  product: "bg-blue-50 text-blue-700 border-blue-200",
  order: "bg-violet-50 text-violet-700 border-violet-200",
  customer: "bg-amber-50 text-amber-700 border-amber-200",
};

function EventBadge({ eventType }) {
  const domain = eventType?.split(".")[0] ?? "";
  const cls =
    EVENT_DOMAINS[domain] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-mono font-medium ${cls}`}
    >
      {eventType}
    </span>
  );
}

// ─── Copy-to-clipboard helper ─────────────────────────────────────────────────

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(value).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check size={12} className="text-emerald-600" />
      ) : (
        <Copy size={12} />
      )}
    </button>
  );
}

// ─── Create Webhook Modal ─────────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }) {
  const [targetUrl, setTargetUrl] = useState("");
  const [eventType, setEventType] = useState("");
  const [error, setError] = useState(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const data = await authJson("/api/webhooks", {
        method: "POST",
        body: { targetUrl: targetUrl.trim(), eventType },
      });
      return data;
    },
    onSuccess: (data) => onCreated(data),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!targetUrl.trim()) return setError("Target URL is required.");
    if (!eventType) return setError("Event type is required.");
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Add Webhook Endpoint
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X size={15} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Target URL
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://your-service.com/webhook"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Must be a publicly reachable HTTPS endpoint.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors"
            >
              <option value="">Select an event…</option>
              {SUPPORTED_EVENTS.map((ev) => (
                <option key={ev.value} value={ev.value}>
                  {ev.label} ({ev.value})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-3 py-1.5 text-sm rounded bg-slate-900 text-white font-medium hover:bg-slate-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {createMutation.isPending && (
                <Loader2 size={12} className="icon-spin" />
              )}
              Create Webhook
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Secret Token Reveal Row ──────────────────────────────────────────────────

function SecretCell({ secret }) {
  const [revealed, setRevealed] = useState(false);
  if (!secret) return <span className="text-slate-300 text-xs">—</span>;
  const display = revealed ? secret : `sha256:${secret.slice(0, 8)}…`;
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[11px] text-slate-500">{display}</span>
      <button
        onClick={() => setRevealed((r) => !r)}
        className="text-[10px] underline text-slate-400 hover:text-slate-600 transition-colors"
      >
        {revealed ? "hide" : "reveal"}
      </button>
      {revealed && <CopyButton value={secret} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminWebhooksPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newConfig, setNewConfig] = useState(null);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const {
    data: configs = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => authJson("/api/webhooks"),
  });

  // ── Toggle active mutation ────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const res = await authFetch(`/api/webhooks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Failed to update webhook.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await authFetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const handleCreated = useCallback(
    (config) => {
      setShowCreate(false);
      setNewConfig(config);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    [queryClient],
  );

  return (
    <div className="h-full flex flex-col">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">Webhooks</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoading
              ? "Loading…"
              : `${configs.length} endpoint${configs.length !== 1 ? "s" : ""} configured`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/webhooks/logs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            View Logs
          </a>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
          >
            <Plus size={13} />
            Add Webhook
          </button>
        </div>
      </div>

      {/* ── One-time secret banner ─────────────────────────────────────────── */}
      {newConfig && (
        <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded text-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-800">
                ⚠ Save your signing secret — it will not be shown again.
              </p>
              <p className="text-amber-700 mt-0.5">
                Use this secret to verify incoming payloads on your server:
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="font-mono text-[11px] text-amber-900 bg-amber-100 px-2 py-1 rounded break-all">
                  {newConfig.secret_token}
                </code>
                <CopyButton value={newConfig.secret_token} />
              </div>
            </div>
            <button
              onClick={() => setNewConfig(null)}
              className="p-1 rounded hover:bg-amber-100 text-amber-600 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {isError ? (
          <div className="flex items-center gap-2 justify-center py-20 text-sm text-red-500">
            <AlertCircle size={16} />
            Failed to load webhook configurations.
          </div>
        ) : isLoading ? (
          <div className="px-6 py-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-pulse-row h-16 rounded border border-slate-100 bg-slate-50"
              />
            ))}
          </div>
        ) : configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Webhook size={28} className="text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">
              No webhooks configured
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Add an endpoint to start receiving event notifications.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  "Event",
                  "Target URL",
                  "Signing Secret",
                  "Status",
                  "Created",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {configs.map((cfg) => (
                <tr
                  key={cfg.id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 align-middle">
                    <EventBadge eventType={cfg.event_type} />
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-700 font-mono truncate max-w-xs">
                        {cfg.target_url}
                      </span>
                      <a
                        href={cfg.target_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-300 hover:text-slate-600 transition-colors"
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <SecretCell secret={cfg.secret_token} />
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: cfg.id,
                          isActive: cfg.is_active,
                        })
                      }
                      disabled={toggleMutation.isPending}
                      className="flex items-center gap-1.5 text-xs transition-colors"
                    >
                      {cfg.is_active ? (
                        <>
                          <ToggleRight size={18} className="text-emerald-600" />
                          <span className="text-emerald-700 font-medium">
                            Active
                          </span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={18} className="text-slate-400" />
                          <span className="text-slate-500">Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className="text-xs text-slate-400 tabular-nums">
                      {new Date(cfg.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => deleteMutation.mutate(cfg.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete webhook"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      <style jsx global>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        .skeleton-pulse-row {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        @keyframes icon-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .icon-spin { animation: icon-spin 0.75s linear infinite; }
      `}</style>
    </div>
  );
}
