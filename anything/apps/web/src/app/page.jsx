"use client";

import { useEffect } from "react";

// Platform-owned domain suffixes — use normal slug-based routing
const PLATFORM_SUFFIXES = [
  "localhost",
  "create.xyz",
  "createdevserver.com",
  "anything.com",
];

function isPlatformHost(host) {
  return PLATFORM_SUFFIXES.some((s) => host === s || host.endsWith("." + s));
}

export default function RootPage() {
  useEffect(() => {
    async function resolve() {
      if (typeof window === "undefined") return;

      const host = window.location.hostname.toLowerCase();

      // Platform domain — redirect to default demo store
      if (isPlatformHost(host)) {
        window.location.replace("/onlinebdshop");
        return;
      }

      // Custom domain — resolve to a store slug via the API
      try {
        const res = await fetch(
          `/api/resolve-domain?host=${encodeURIComponent(host)}`,
        );
        const json = await res.json();
        if (res.ok && json.data?.slug) {
          window.location.replace(`/${json.data.slug}`);
        } else {
          // Domain not mapped to any store
          document.body.innerHTML =
            "<div style='font-family:sans-serif;padding:3rem;color:#374151'>" +
            "<h2>Store not found</h2>" +
            "<p style='color:#6b7280'>This domain is not connected to any active store.</p>" +
            "</div>";
        }
      } catch {
        window.location.replace("/acme-corp");
      }
    }

    resolve();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        color: "#6b7280",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "2px solid #e5e7eb",
            borderTopColor: "#111827",
            margin: "0 auto 1rem",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: "0.875rem" }}>Resolving store…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
