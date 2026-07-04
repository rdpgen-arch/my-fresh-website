"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Pencil,
  Users,
  AlertCircle,
  Loader2,
  X,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { authFetch } from "@/utils/authFetch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ActiveBadge({ isActive }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
      <Check size={10} />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium bg-slate-100 text-slate-500 border-slate-200">
      Inactive
    </span>
  );
}

function RoleBadge({ roleName }) {
  const colors = {
    super_admin: "bg-slate-900 text-white border-slate-900",
    store_manager: "bg-blue-50 text-blue-700 border-blue-200",
    store_support: "bg-violet-50 text-violet-700 border-violet-200",
  };
  const cls =
    colors[roleName] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium ${cls}`}
    >
      {roleName ?? "—"}
    </span>
  );
}

// ─── Invite / Edit User Modal ─────────────────────────────────────────────────

function UserModal({ user, roles, onClose, onSaved }) {
  const isEdit = !!user;

  const [form, setForm] = useState({
    email: user?.email ?? "",
    fullName: user?.full_name ?? "",
    roleId: user?.role_id ?? roles[0]?.id ?? "",
    password: "",
    isActive: user?.is_active ?? true,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setError(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = isEdit ? `/api/users/${user.id}` : "/api/users";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? {
            fullName: form.fullName,
            roleId: form.roleId,
            isActive: form.isActive,
            ...(form.password ? { password: form.password } : {}),
          }
        : {
            email: form.email,
            fullName: form.fullName,
            roleId: form.roleId,
            password: form.password,
          };

      const res = await authFetch(url, { method, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.error ??
            (json.details ? JSON.stringify(json.details) : "Save failed."),
        );
      return json.data;
    },
    onSuccess: (data) => onSaved(data),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!isEdit && !form.email) return setError("Email is required.");
    if (!isEdit && !form.password)
      return setError("Password is required for new users.");
    if (!form.roleId) return setError("A role must be assigned.");
    saveMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            {isEdit ? "Edit User" : "Invite Staff Member"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X size={15} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {/* Email (create only) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="staff@acme.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors"
              />
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Jane Smith"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Role
            </label>
            <select
              name="roleId"
              value={form.roleId}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isEdit
                ? "New Password (leave blank to keep current)"
                : "Password"}
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={isEdit ? "••••••••" : "Min. 8 characters"}
                className="w-full pl-3 pr-9 py-2 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* Active toggle (edit only) */}
          {isEdit && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="sr-only"
              />
              <div
                onClick={() =>
                  setForm((f) => ({ ...f, isActive: !f.isActive }))
                }
                className={`relative inline-flex h-4 w-7 flex-shrink-0 rounded-full border cursor-pointer transition-colors ${
                  form.isActive
                    ? "bg-slate-900 border-slate-900"
                    : "bg-white border-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full shadow transform transition-transform duration-150 mt-[0.5px] ${
                    form.isActive ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                  style={{
                    backgroundColor: form.isActive ? "white" : "#94a3b8",
                  }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700">
                Account active
              </span>
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
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
              disabled={saveMutation.isPending}
              className="px-3 py-1.5 text-sm rounded bg-slate-900 text-white font-medium hover:bg-slate-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {saveMutation.isPending && (
                <Loader2 size={12} className="icon-spin" />
              )}
              {isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [modalUser, setModalUser] = useState(undefined); // undefined = closed, null = new, obj = edit
  const [sorting, setSorting] = useState([]);

  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await authFetch("/api/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load users.");
      return json.data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await authFetch("/api/roles");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load roles.");
      return json.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await authFetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Delete failed.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const handleSaved = useCallback(() => {
    setModalUser(undefined);
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }, [queryClient]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "full_name",
        header: "Name",
        cell: ({ getValue, row }) => (
          <div>
            <p className="text-sm font-medium text-slate-900 leading-tight">
              {getValue() || (
                <span className="text-slate-400 italic">No name set</span>
              )}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {row.original.email}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "role_name",
        header: "Role",
        size: 140,
        cell: ({ getValue }) => <RoleBadge roleName={getValue()} />,
      },
      {
        accessorKey: "is_active",
        header: "Status",
        size: 90,
        cell: ({ getValue }) => <ActiveBadge isActive={getValue()} />,
      },
      {
        accessorKey: "last_login_at",
        header: "Last Login",
        size: 140,
        cell: ({ getValue }) => {
          const val = getValue();
          if (!val)
            return <span className="text-slate-300 text-xs">Never</span>;
          return (
            <span className="text-xs text-slate-400 tabular-nums">
              {new Date(val).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Joined",
        size: 110,
        cell: ({ getValue }) => (
          <span className="text-xs text-slate-400 tabular-nums">
            {new Date(getValue()).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 72,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setModalUser(row.original)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title="Edit user"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => deleteMutation.mutate(row.original.id)}
              disabled={deleteMutation.isPending}
              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              title="Delete user"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ),
      },
    ],
    [deleteMutation],
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const skeletonRows = Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="skeleton-pulse-row">
      {columns.map((col, j) => (
        <td key={j} className="px-4 py-3">
          <div className="skeleton-bar" />
        </td>
      ))}
    </tr>
  ));

  const emptyRow = (
    <tr>
      <td colSpan={columns.length} className="py-20 text-center">
        <Users size={28} className="mx-auto text-slate-200 mb-3" />
        <p className="text-sm font-medium text-slate-500">
          No team members yet
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Invite your first staff member to get started.
        </p>
      </td>
    </tr>
  );

  const dataRows = table.getRowModel().rows.map((row) => (
    <tr key={row.id} className="group hover:bg-slate-50 transition-colors">
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="px-4 py-2.5 align-middle"
          style={{ width: cell.column.getSize() }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  ));

  const tbodyContent = usersLoading
    ? skeletonRows
    : users.length === 0
      ? emptyRow
      : dataRows;

  return (
    <div className="h-full flex flex-col">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">Team Members</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {usersLoading
              ? "Loading…"
              : `${users.length} user${users.length !== 1 ? "s" : ""} in this store`}
          </p>
        </div>
        <button
          onClick={() => setModalUser(null)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
        >
          <Plus size={13} />
          Invite Member
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {usersError ? (
          <div className="flex items-center gap-2 justify-center py-20 text-sm text-red-500">
            <AlertCircle size={16} />
            Failed to load team members.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                {table.getHeaderGroups().map((hg) =>
                  hg.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 whitespace-nowrap select-none ${
                        header.column.getCanSort()
                          ? "cursor-pointer hover:text-slate-800"
                          : ""
                      }`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{tbodyContent}</tbody>
          </table>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          roles={roles}
          onClose={() => setModalUser(undefined)}
          onSaved={handleSaved}
        />
      )}

      <style jsx global>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .skeleton-pulse-row { animation: skeleton-pulse 1.5s ease-in-out infinite; }
        .skeleton-bar { height: 11px; background: #f1f5f9; border-radius: 3px; width: 70%; }
        @keyframes icon-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .icon-spin { animation: icon-spin 0.75s linear infinite; }
      `}</style>
    </div>
  );
}
