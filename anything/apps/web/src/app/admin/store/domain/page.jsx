"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { authFetch } from "@/utils/authFetch";

function getAppHost() {
  try {
    return new URL(process.env.NEXT_PUBLIC_CREATE_APP_URL ?? "").hostname;
  } catch {
    return "platformhq.app";
  }
}

export default function CustomDomainPage() {
  const qc = useQueryClient();
  const [domain, setDomain] = useState("");
  const [copied, setCopied] = useState(false);
  const appHost = getAppHost();

  const { data, isLoading } = useQuery({
    queryKey: ["store-domain"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/store/domain");
      return (await res.json()).data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/admin/store/domain", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save domain.");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-domain"] });
      setDomain("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/admin/store/domain", {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to remove domain.");
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store-domain"] }),
  });

  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="max-w-xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-sm font-semibold text-slate-900">Custom Domain</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Serve your storefront on your own domain.
        </p>
      </div>

      {/* Current domain */}
      {!isLoading && data?.customDomain && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={16}
                className="text-emerald-600 flex-shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  {data.customDomain}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Active custom domain
                </p>
              </div>
            </div>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* DNS instructions */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
          DNS Configuration
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Add the following CNAME record to your domain's DNS settings:
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded p-3 font-mono text-xs space-y-2">
          {[
            { label: "Type", value: "CNAME" },
            {
              label: "Name",
              value:
                data?.customDomain?.split(".")[0] ?? "shop  (or @ for root)",
            },
            { label: "Value", value: appHost },
            { label: "TTL", value: "3600" },
          ].map((row) => (
            <div key={row.label} className="flex gap-4">
              <span className="w-14 text-slate-400 flex-shrink-0">
                {row.label}
              </span>
              <span className="text-slate-800">{row.value}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => copy(`CNAME ${appHost}`)}
          className="inline-flex items-center gap-1 mt-2 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied!" : "Copy value"}
        </button>
        <p className="text-[11px] text-slate-400 mt-3">
          DNS changes can take up to 48 hours to propagate. We'll verify
          automatically when you save.
        </p>
      </div>

      {/* Add domain form */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
          {data?.customDomain ? "Change Domain" : "Add Custom Domain"}
        </h3>
        <div className="flex gap-2">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="shop.yourbrand.com"
            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors"
          />
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !domain.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Globe size={12} />
            )}
            Verify & Save
          </button>
        </div>
        {saveMutation.isError && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <AlertCircle size={11} />
            {saveMutation.error?.message}
          </p>
        )}
        {saveMutation.data && (
          <p
            className={`text-xs mt-2 flex items-center gap-1 ${saveMutation.data.dnsVerified ? "text-emerald-700" : "text-amber-600"}`}
          >
            {saveMutation.data.dnsVerified ? (
              <CheckCircle2 size={11} />
            ) : (
              <AlertCircle size={11} />
            )}
            {saveMutation.data.dnsVerified
              ? "DNS verified and domain activated."
              : "Domain saved. DNS not yet verified — check back after propagation."}
          </p>
        )}
      </div>
    </div>
  );
}
