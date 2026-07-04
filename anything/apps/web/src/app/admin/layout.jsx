"use client";

import { useState, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  FolderOpen,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Users,
  ShieldCheck,
  Settings,
  Truck,
  Globe,
  Webhook,
  Zap,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Store,
  DollarSign,
  FileText,
  ChevronRight,
  Paintbrush,
} from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false },
  },
});

const NAV_SECTIONS = [
  {
    label: "Commerce",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
      {
        label: "COD Collection",
        href: "/admin/cod-collection",
        icon: DollarSign,
      },
      {
        label: "Abandoned Carts",
        href: "/admin/abandoned-carts",
        icon: ShoppingCart,
      },
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Categories", href: "/admin/categories", icon: FolderOpen },
      { label: "Coupons", href: "/admin/coupons", icon: Tag },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Landing Pages", href: "/admin/landing-pages", icon: FileText },
      { label: "Integrations", href: "/admin/integrations", icon: Zap },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Team", href: "/admin/users", icon: Users },
      { label: "Roles", href: "/admin/roles", icon: ShieldCheck },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Store Settings", href: "/admin/store", icon: Settings },
      {
        label: "Storefront Design",
        href: "/admin/store/design",
        icon: Paintbrush,
      },
      { label: "Shipping Zones", href: "/admin/store/shipping", icon: Truck },
      { label: "Custom Domain", href: "/admin/store/domain", icon: Globe },
      { label: "Webhooks", href: "/admin/webhooks", icon: Webhook },
    ],
  },
];

// ─── SidebarLink ─────────────────────────────────────────────────────────────

function SidebarLink({ item, isActive }) {
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "9px",
        padding: "7px 10px",
        borderRadius: "7px",
        fontSize: "13px",
        fontWeight: isActive ? "600" : "450",
        color: isActive ? "#f8fafc" : "#64748b",
        background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
        textDecoration: "none",
        transition: "all 110ms ease",
        position: "relative",
        marginBottom: "1px",
        letterSpacing: isActive ? "-0.01em" : "normal",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "#cbd5e1";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#64748b";
        }
      }}
    >
      {isActive && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: "3px",
            height: "18px",
            borderRadius: "0 3px 3px 0",
            background: "var(--accent)",
          }}
        />
      )}
      <Icon
        size={15}
        strokeWidth={isActive ? 2.5 : 1.75}
        style={{
          flexShrink: 0,
          color: isActive ? "var(--accent)" : "inherit",
          transition: "color 110ms",
        }}
      />
      <span style={{ flex: 1 }}>{item.label}</span>
    </a>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ currentPath, onClose }) {
  const { data: storeData } = useQuery({
    queryKey: ["admin-store-meta"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/store");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data ?? json;
    },
    staleTime: 300000,
  });

  const storeSlug = storeData?.slug ?? "";
  const storeName = storeData?.name ?? "Shop Manager";

  const [user, setUser] = useState(null);
  useEffect(() => {
    try {
      const u = localStorage.getItem("admin_user");
      if (u) setUser(JSON.parse(u));
    } catch (_) {}
  }, []);

  const displayName =
    user?.full_name || user?.fullName || user?.email || "Admin";
  const displayEmail = user?.email || "";
  const initial = displayName[0]?.toUpperCase() ?? "A";

  async function handleLogout() {
    try {
      await authFetch("/api/auth/login", { method: "DELETE" });
    } catch (_) {}
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_store_id");
    window.location.href = "/admin/login";
  }

  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "220px",
        flexShrink: 0,
        background: "#0f172a",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        overflowY: "auto",
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 14px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              background: "var(--accent)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Store size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <p
              style={{
                fontSize: "13.5px",
                fontWeight: "700",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {storeName}
            </p>
            <p
              style={{
                fontSize: "10px",
                color: "#475569",
                fontWeight: "500",
                letterSpacing: "0.02em",
              }}
            >
              Admin Console
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: "4px",
              cursor: "pointer",
              color: "#475569",
              display: "flex",
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: "20px" }}>
            <p
              style={{
                fontSize: "10px",
                fontWeight: "700",
                color: "#334155",
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                padding: "0 10px",
                marginBottom: "3px",
              }}
            >
              {section.label}
            </p>
            {section.items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                isActive={currentPath === item.href}
              />
            ))}
          </div>
        ))}

        {/* Storefront link */}
        {storeSlug && (
          <a
            href={`/${storeSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 10px",
              borderRadius: "7px",
              fontSize: "12.5px",
              color: "#475569",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              textDecoration: "none",
              marginTop: "8px",
              fontWeight: "500",
              transition: "all 110ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.color = "#475569";
            }}
          >
            <ExternalLink size={12} />
            <span>View Storefront</span>
          </a>
        )}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: "10px 10px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            padding: "7px 8px",
            borderRadius: "8px",
            marginBottom: "4px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{ fontSize: "11px", fontWeight: "700", color: "#fff" }}
            >
              {initial}
            </span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#e2e8f0",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </p>
            <p
              style={{
                fontSize: "10px",
                color: "#475569",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayEmail}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 10px",
            borderRadius: "7px",
            border: "none",
            background: "none",
            fontSize: "12px",
            color: "#475569",
            cursor: "pointer",
            fontWeight: "500",
            transition: "all 110ms",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.1)";
            e.currentTarget.style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = "#475569";
          }}
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ─── Admin Layout ─────────────────────────────────────────────────────────────

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "/admin";

  return (
    <QueryClientProvider client={queryClient}>
      <div
        style={{
          display: "flex",
          height: "100vh",
          background: "#f8fafc",
          overflow: "hidden",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Desktop sidebar */}
        <div style={{ display: "none" }} className="admin-desktop-sidebar">
          <Sidebar currentPath={currentPath} />
        </div>

        {/* Mobile overlay drawer */}
        {sidebarOpen && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(2px)",
              }}
              onClick={() => setSidebarOpen(false)}
            />
            <div style={{ position: "relative", zIndex: 10, display: "flex" }}>
              <Sidebar
                currentPath={currentPath}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Mobile topbar */}
          <header
            className="admin-mobile-header"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "11px 16px",
              background: "#0f172a",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                display: "flex",
                padding: "4px",
              }}
            >
              <Menu size={19} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  background: "var(--accent)",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Store size={12} color="#fff" strokeWidth={2.5} />
              </div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#f1f5f9",
                }}
              >
                Shop Manager
              </span>
            </div>
          </header>

          <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
        </div>
      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .admin-desktop-sidebar { display: flex !important; flex-shrink: 0; }
          .admin-mobile-header { display: none !important; }
        }
        @media (max-width: 1023px) {
          .admin-desktop-sidebar { display: none !important; }
          .admin-mobile-header { display: flex !important; }
        }
      `}</style>
    </QueryClientProvider>
  );
}
