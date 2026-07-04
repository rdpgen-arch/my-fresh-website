"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Shield,
  X,
  ShieldCheck,
} from "lucide-react";
import { authFetch } from "@/utils/authFetch";

// ─── Permission Matrix Definition ────────────────────────────────────────────
// Single source of truth for all resources and actions in the platform.
// Adding a new resource here automatically reflects in the UI.

const RESOURCES = [
  { key: "products", label: "Products", icon: "📦" },
  { key: "orders", label: "Orders", icon: "🛒" },
  { key: "customers", label: "Customers", icon: "👤" },
  { key: "users", label: "Users", icon: "🧑‍💼" },
  { key: "roles", label: "Roles", icon: "🔑" },
  { key: "webhooks", label: "Webhooks", icon: "🔗" },
  { key: "store", label: "Store", icon: "🏪" },
];

const ACTIONS = [
  { key: "read", label: "Read", description: "View & list" },
  { key: "write", label: "Write", description: "Create & edit" },
  { key: "delete", label: "Delete", description: "Permanently remove" },
];

const SYSTEM_ROLES = ["super_admin", "store_manager", "store_support"];

// ─── Permission toggle helpers ────────────────────────────────────────────────

/**
 * Checks if a permissions JSONB object grants a specific resource:action.
 */
function isGranted(permissions, resource, action) {
  if (permissions?.["*"]?.includes("*")) return true;
  const allowed = permissions?.[resource];
  if (!Array.isArray(allowed)) return false;
  return allowed.includes("*") || allowed.includes(action);
}

/**
 * Returns a new permissions object with the given resource:action toggled.
 */
function togglePermission(permissions, resource, action) {
  const current = Array.isArray(permissions?.[resource])
    ? [...permissions[resource]]
    : [];
  const idx = current.indexOf(action);
  if (idx === -1) current.push(action);
  else current.splice(idx, 1);
  return { ...permissions, [resource]: current };
}

// ─── Permission Toggle Row ────────────────────────────────────────────────────

function PermissionRow({ resource, permissions, onChange, disabled }) {
  return (
    <div className="flex items-center py-2.5 border-b border-slate-100 last:border-0">
      {/* Resource label */}
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <span className="text-base leading-none">{resource.icon}</span>
        <span className="text-xs font-medium text-slate-700">
          {resource.label}
        </span>
      </div>

      {/* Action toggles */}
      <div className="flex items-center gap-6">
        {ACTIONS.map((action) => {
          const granted = isGranted(permissions, resource.key, action.key);
          return (
            <label
              key={action.key}
              className={`flex items-center gap-2 cursor-pointer group ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {/* Custom toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={granted}
                disabled={disabled}
                onClick={() =>
                  !disabled &&
                  onChange(
                    togglePermission(permissions, resource.key, action.key),
                  )
                }
                className={`
                  relative inline-flex h-4 w-7 flex-shrink-0 rounded-full border transition-colors duration-150
                  focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-1
                  ${
                    granted
                      ? "bg-slate-900 border-slate-900"
                      : "bg-white border-slate-300"
                  }
                  ${disabled ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <span
                  className={`
                    inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform duration-150 mt-[0.5px]
                    ${granted ? "translate-x-3.5" : "translate-x-0.5"}
                  `}
                  style={{ backgroundColor: granted ? "white" : "#94a3b8" }}
                />
              </button>
              <div>
                <span
                  className={`text-xs font-medium ${granted ? "text-slate-800" : "text-slate-400"}`}
                >
                  {action.label}
                </span>
                <span className="hidden sm:block text-[10px] text-slate-400">
                  {action.description}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Role Card (expandable) ───────────────────────────────────────────────────

function RoleCard({ role, onDelete, onPermissionsChange, isSaving }) {
  const [expanded, setExpanded] = useState(false);
  const isSystem = SYSTEM_ROLES.includes(role.name);
  const isWildcard = role.permissions?.["*"]?.includes("*");

  return (
    <div className="border border-slate-200 rounded bg-white">
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2.5">
          {isWildcard ? (
            <ShieldCheck size={14} className="text-slate-700" />
          ) : (
            <Shield size={14} className="text-slate-400" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-900">{role.name}</p>
            {isSystem && (
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                System role · protected
              </p>
            )}
          </div>
          {isWildcard && (
            <span className="px-1.5 py-0.5 rounded border border-slate-300 text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
              Super Admin
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isSaving && (
            <Loader2 size={13} className="icon-spin text-slate-400" />
          )}
          {!isSystem && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(role);
              }}
              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </div>

      {/* Permissions editor */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-slate-100">
          {isWildcard ? (
            <div className="py-4 text-center">
              <ShieldCheck size={20} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                Unrestricted access
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                This role has full permissions on all resources.
              </p>
            </div>
          ) : (
            <div className="mt-2">
              {/* Column headers */}
              <div className="flex items-center mb-1 pl-32">
                {ACTIONS.map((a) => (
                  <div
                    key={a.key}
                    className="w-24 text-[10px] uppercase tracking-wide text-slate-400 font-semibold"
                  >
                    {a.label}
                  </div>
                ))}
              </div>
              {RESOURCES.map((resource) => (
                <PermissionRow
                  key={resource.key}
                  resource={resource}
                  permissions={role.permissions}
                  onChange={(newPerms) =>
                    onPermissionsChange(role.id, newPerms)
                  }
                  disabled={isSystem}
                />
              ))}
              {isSystem && (
                <p className="text-[11px] text-slate-400 mt-2 italic">
                  System roles cannot be edited. Clone this role to customize
                  permissions.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Create Role Modal ────────────────────────────────────────────────────────

function CreateRoleModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/roles", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), permissions: {} }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create role.");
      return json.data;
    },
    onSuccess: (data) => onCreated(data),
    onError: (err) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-full max-w-sm mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Create New Role
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X size={15} className="text-slate-500" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Role Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. inventory_manager"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Use lowercase with underscores. Permissions are set after
              creation.
            </p>
          </div>
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (name.trim()) createMutation.mutate();
                else setError("Name is required.");
              }}
              disabled={createMutation.isPending}
              className="px-3 py-1.5 text-sm rounded bg-slate-900 text-white font-medium hover:bg-slate-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {createMutation.isPending && (
                <Loader2 size={12} className="icon-spin" />
              )}
              Create Role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminRolesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const {
    data: roles = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await authFetch("/api/roles");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load roles.");
      return json.data;
    },
  });

  // ── Permission update (auto-save on toggle) ────────────────────────────────
  const updatePermsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }) => {
      const res = await authFetch(`/api/roles/${roleId}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save permissions.");
      return json.data;
    },
    onMutate: ({ roleId }) => setSavingId(roleId),
    onSettled: () => setSavingId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
    onError: (err) => console.error("Perm update failed:", err),
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (roleId) => {
      const res = await authFetch(`/api/roles/${roleId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to delete role.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  const handlePermChange = useCallback(
    (roleId, newPerms) => {
      updatePermsMutation.mutate({ roleId, permissions: newPerms });
    },
    [updatePermsMutation],
  );

  const handleCreated = useCallback(() => {
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: ["roles"] });
  }, [queryClient]);

  return (
    <div className="h-full flex flex-col">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">
            Roles & Permissions
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoading
              ? "Loading…"
              : `${roles.length} roles configured · changes save automatically`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
        >
          <Plus size={13} />
          New Role
        </button>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {isError ? (
          <div className="flex items-center gap-2 justify-center py-20 text-sm text-red-500">
            <AlertCircle size={16} />
            Failed to load roles.
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-pulse-row h-14 rounded border border-slate-100 bg-slate-50"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {/* Legend */}
            <div className="flex items-center gap-4 px-1 pb-2 mb-1 border-b border-slate-100">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">
                Click a role to expand and manage its permissions
              </p>
            </div>

            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                isSaving={savingId === role.id}
                onDelete={(r) => deleteMutation.mutate(r.id)}
                onPermissionsChange={handlePermChange}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRoleModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      <style jsx global>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .skeleton-pulse-row { animation: skeleton-pulse 1.5s ease-in-out infinite; }
        @keyframes icon-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .icon-spin { animation: icon-spin 0.75s linear infinite; }
      `}</style>
    </div>
  );
}
