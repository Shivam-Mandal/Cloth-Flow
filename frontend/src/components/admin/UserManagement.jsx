import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Scissors,
  Search,
  RefreshCw,
  Copy,
  Sparkles,
  KeyRound,
  X,
  Pencil,
  CheckCircle
} from 'lucide-react';
import { createUser, fetchUsers, updateUser } from '../services/userServices';
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';

const fallbackWorkerTypes = ['Cutting', 'Printing', 'Stitching', 'Finishing', 'Packing', 'Inventory'];

const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 10; i += 1) {
    password += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return password;
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : 'N/A');

const roleTone = (role) =>
  role === 'admin'
    ? 'bg-blue-100 text-blue-700 ring-blue-200'
    : 'bg-emerald-100 text-emerald-700 ring-emerald-200';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [workerTypes, setWorkerTypes] = useState(fallbackWorkerTypes);
  const [loading, setLoading] = useState({ fetch: false, submit: false, update: false });
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [creationResult, setCreationResult] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'worker',
    workerType: fallbackWorkerTypes[0],
    allowMultipleClaims: false,
    autoApprove: false,
    allowExcessPieces: false,
    phone: '',
    address: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: generatePassword(),
    role: 'worker',
    workerType: fallbackWorkerTypes[0],
    allowMultipleClaims: false,
    autoApprove: false,
    allowExcessPieces: false,
    phone: '',
    address: ''
  });

  const loadUsers = async () => {
    setLoading((prev) => ({ ...prev, fetch: true }));
    setError(null);

    try {
      const res = await fetchUsers();
      setUsers(res.users || []);
      setWorkerTypes(res.availableWorkerTypes?.length ? res.availableWorkerTypes : fallbackWorkerTypes);
      setFormData((prev) => ({
        ...prev,
        workerType: res.availableWorkerTypes?.[0] || prev.workerType || fallbackWorkerTypes[0]
      }));
    } catch (e) {
      console.error('Failed to load users', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load users');
    } finally {
      setLoading((prev) => ({ ...prev, fetch: false }));
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (creationResult) {
      const duration = creationResult.credentials ? 10000 : 5000;
      const timer = setTimeout(() => {
        setCreationResult(null);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [creationResult]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;

    return users.filter((user) =>
      [user.name, user.email, user.role, user.workerType, user.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [users, search]);

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems: paginatedUsers,
    handlePageChange
  } = useClientPagination(filteredUsers, 6);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((user) => user.role === 'admin').length,
    workers: users.filter((user) => user.role === 'worker').length
  }), [users]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditChange = (key, value) => {
    setEditFormData((prev) => ({ ...prev, [key]: value }));
  };

  const openEditModal = (user) => {
    setError(null);
    setCreationResult(null);
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'worker',
      workerType: user.workerType || workerTypes[0] || fallbackWorkerTypes[0],
      allowMultipleClaims: Boolean(user.allowMultipleClaims),
      autoApprove: Boolean(user.autoApprove),
      allowExcessPieces: Boolean(user.allowExcessPieces),
      phone: user.phone || '',
      address: user.address || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, submit: true }));
    setError(null);
    setCreationResult(null);

    try {
      const payload = {
        ...formData,
        sendCredentials: true
      };

      if (payload.role !== 'worker') {
        delete payload.workerType;
      }

      const res = await createUser(payload);
      setCreationResult(res);
      setUsers((prev) => [res.user, ...prev]);
      setFormData({
        name: '',
        email: '',
        password: generatePassword(),
        role: 'worker',
        workerType: workerTypes[0] || fallbackWorkerTypes[0],
        allowMultipleClaims: false,
        autoApprove: false,
        allowExcessPieces: false,
        phone: '',
        address: ''
      });
      setIsCreateModalOpen(false);
    } catch (e) {
      console.error('Failed to create user', e);
      setError(e?.response?.data?.message || e.message || 'Failed to create user');
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser?._id) return;

    setLoading((prev) => ({ ...prev, update: true }));
    setError(null);
    setCreationResult(null);

    try {
      const payload = {
        ...editFormData,
        sendCredentials: true
      };

      if (!payload.password?.trim()) {
        delete payload.password;
      }

      if (payload.role !== 'worker') {
        delete payload.workerType;
        delete payload.address;
      }

      const res = await updateUser(editingUser._id, payload);
      setCreationResult(res);
      setUsers((prev) => prev.map((user) => (user._id === editingUser._id ? res.user : user)));
      setEditingUser(null);
    } catch (e) {
      console.error('Failed to update user', e);
      setError(e?.response?.data?.message || e.message || 'Failed to update user');
    } finally {
      setLoading((prev) => ({ ...prev, update: false }));
    }
  };

  const workerRoleHint = workerTypes.includes('Inventory')
    ? 'Worker roles come from style stages, plus a dedicated Inventory role.'
    : 'Worker roles come from style stages.';

  const copyCredentials = async () => {
    if (!creationResult?.credentials) return;
    await navigator.clipboard.writeText(
      `Email: ${creationResult.credentials.email}\nPassword: ${creationResult.credentials.password}`
    );
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.20),_transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-100">
              <Users className="h-4 w-4" />
              User Management
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Create users and send credentials to their login email</h1>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col xl:flex-row">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCreationResult(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-50 sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Create User
            </button>
            <button
              onClick={loadUsers}
              disabled={loading.fetch}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${loading.fetch ? 'animate-spin' : ''}`} />
              Refresh Users
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, tone: 'from-sky-500 to-indigo-500' },
          { label: 'Admins', value: stats.admins, icon: Shield, tone: 'from-blue-500 to-cyan-500' },
          { label: 'Workers', value: stats.workers, icon: Scissors, tone: 'from-emerald-500 to-teal-500' }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm ${idx === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-slate-900">{card.value}</p>
                </div>
                <div className={`flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.tone} text-white shadow-lg shrink-0`}>
                  <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </section>


      <section className="space-y-6">
        <div className="space-y-6">
      {/* Top Centered Floating Toast / Popup */}
      {creationResult && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-lg transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <div className="rounded-2xl border border-emerald-300 bg-emerald-500 text-white p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white mt-0.5">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">User saved successfully</h3>
                  <p className="text-sm text-emerald-100 mt-0.5">{creationResult.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {creationResult.credentials && (
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCreationResult(null)}
                  className="rounded-xl p-1.5 text-emerald-100 hover:bg-white/20 hover:text-white transition"
                  aria-label="Close notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {creationResult.credentials && (
              <div className="mt-3 rounded-xl bg-white/10 p-3 text-xs text-white border border-white/20">
                <p><span className="font-semibold">Login Email:</span> {creationResult.credentials.email}</p>
                <p className="mt-1"><span className="font-semibold">Password:</span> {creationResult.credentials.password}</p>
              </div>
            )}

            {creationResult.emailStatus?.message && (
              <p className="mt-2.5 text-xs text-emerald-100 border-t border-emerald-400/50 pt-2">
                <span className="font-semibold text-white">Email delivery:</span> {creationResult.emailStatus.message}
              </p>
            )}
          </div>
        </div>
      )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Existing Users</h2>
                <p className="text-sm text-slate-500">Search and review created admin and worker accounts.</p>
              </div>

              <label className="relative block sm:w-72">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-400 focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-5">
              {loading.fetch ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                  No users found.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1080px] w-full divide-y divide-slate-200 text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Worker Type</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Address</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Created</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {paginatedUsers.map((user) => (
                          <tr key={user._id} className="transition hover:bg-slate-50">
                            <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900">
                              {user.name}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                              {user.email}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${roleTone(user.role)}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                              {user.workerType || 'N/A'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                              {user.phone || 'N/A'}
                            </td>
                            <td className="max-w-xs px-4 py-4 text-sm text-slate-600">
                              <span className="line-clamp-2">{user.address || 'N/A'}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                              {formatDate(user.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <button
                                type="button"
                                onClick={() => openEditModal(user)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              itemLabel="users"
            />
          </div>
        </div>
      </section>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Create New User</h2>
                  <p className="text-sm text-slate-500">Create login credentials for admin or worker accounts.</p>
                  <p className="mt-1 text-xs text-slate-400">{workerRoleHint}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Close create user modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                  >
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Login Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                    placeholder="This email will be used for login"
                    required
                  />
                </div>

                {formData.role === 'worker' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Worker Type</label>
                    <select
                      value={formData.workerType}
                      onChange={(e) => handleChange('workerType', e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                    >
                      {workerTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={formData.role === 'worker' ? '' : 'sm:col-span-2'}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                    placeholder="Optional phone number"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-400 focus:bg-white"
                        placeholder="Set a password"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange('password', generatePassword())}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate
                    </button>
                  </div>
                </div>

                {formData.role === 'worker' && (
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.allowMultipleClaims)}
                        onChange={(e) => handleChange('allowMultipleClaims', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Multiple Claim</div>
                        <div className="text-xs text-slate-500">Allow worker to claim multiple tasks</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.autoApprove)}
                        onChange={(e) => handleChange('autoApprove', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Auto Approve</div>
                        <div className="text-xs text-slate-500">Auto-approve completed tasks without admin review</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.allowExcessPieces)}
                        onChange={(e) => handleChange('allowExcessPieces', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Increase Pieces</div>
                        <div className="text-xs text-slate-500">Allow completed pieces above total requirement</div>
                      </div>
                    </label>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    rows="3"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                    placeholder="Optional address"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Credential Delivery
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  The credentials email will be sent to the same login email entered above.
                </p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {String(error)}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading.submit}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {loading.submit ? 'Creating user...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Edit User Details</h2>
                  <p className="text-sm text-slate-500">Update account details, login email, or set a new password.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Close edit user modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleUpdateSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                  <input
                    value={editFormData.name}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                  <input
                    value={editFormData.role}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm capitalize text-slate-500 outline-none"
                    disabled
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Login Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                    placeholder="This email will be used for login"
                    required
                  />
                </div>

                {editFormData.role === 'worker' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Worker Type</label>
                    <select
                      value={editFormData.workerType}
                      onChange={(e) => handleEditChange('workerType', e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                    >
                      {workerTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={editFormData.role === 'worker' ? '' : 'sm:col-span-2'}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    value={editFormData.phone}
                    onChange={(e) => handleEditChange('phone', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                    placeholder="Optional phone number"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={editFormData.password}
                        onChange={(e) => handleEditChange('password', e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-400 focus:bg-white"
                        placeholder="Leave blank to keep current password"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditChange('password', generatePassword())}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate
                    </button>
                  </div>
                </div>

                {editFormData.role === 'worker' && (
                  <>
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(editFormData.allowMultipleClaims)}
                          onChange={(e) => handleEditChange('allowMultipleClaims', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Multiple Claim</div>
                          <div className="text-xs text-slate-500">Allow worker to claim multiple tasks</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(editFormData.autoApprove)}
                          onChange={(e) => handleEditChange('autoApprove', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Auto Approve</div>
                          <div className="text-xs text-slate-500">Auto-approve completed tasks without admin review</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(editFormData.allowExcessPieces)}
                          onChange={(e) => handleEditChange('allowExcessPieces', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Increase Pieces</div>
                          <div className="text-xs text-slate-500">Allow completed pieces above total requirement</div>
                        </div>
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                      <textarea
                        value={editFormData.address}
                        onChange={(e) => handleEditChange('address', e.target.value)}
                        rows="3"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                        placeholder="Optional address"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Email and Password Update
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  If a new password is set, updated credentials will be sent to the email.
                </p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {String(error)}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading.update}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {loading.update ? 'Saving user...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
