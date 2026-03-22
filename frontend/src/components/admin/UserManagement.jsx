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
  KeyRound
} from 'lucide-react';
import { createUser, fetchUsers } from '../services/userServices';
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
  const [loading, setLoading] = useState({ fetch: false, submit: false });
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [creationResult, setCreationResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: generatePassword(),
    role: 'worker',
    workerType: fallbackWorkerTypes[0],
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
        phone: '',
        address: ''
      });
    } catch (e) {
      console.error('Failed to create user', e);
      setError(e?.response?.data?.message || e.message || 'Failed to create user');
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
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
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.20),_transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-100">
              <Users className="h-4 w-4" />
              User Management
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Create users and send credentials to their login email</h1>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              Admin can create worker or admin accounts here. After account creation, the generated credentials are sent to the same email used for login when backend email delivery is configured.
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading.fetch}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading.fetch ? 'animate-spin' : ''}`} />
            Refresh Users
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, tone: 'from-sky-500 to-indigo-500' },
          { label: 'Admins', value: stats.admins, icon: Shield, tone: 'from-blue-500 to-cyan-500' },
          { label: 'Workers', value: stats.workers, icon: Scissors, tone: 'from-emerald-500 to-teal-500' }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.tone} text-white shadow-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Create New User</h2>
              <p className="text-sm text-slate-500">Create login credentials for admin or worker accounts.</p>
              <p className="mt-1 text-xs text-slate-400">{workerRoleHint}</p>
            </div>
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
                <div className="flex gap-3">
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
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </button>
                </div>
              </div>

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

            <button
              type="submit"
              disabled={loading.submit}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading.submit ? 'Creating user...' : 'Create User'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {creationResult && (
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-emerald-900">User created successfully</h2>
                  <p className="mt-1 text-sm text-emerald-700">{creationResult.message}</p>
                </div>
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-700">
                <p><span className="font-medium text-slate-900">Login Email:</span> {creationResult.credentials?.email}</p>
                <p className="mt-2"><span className="font-medium text-slate-900">Password:</span> {creationResult.credentials?.password}</p>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Email delivery:</span> {creationResult.emailStatus?.message}
              </div>
            </div>
          )}

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

            <div className="mt-5 space-y-3">
              {loading.fetch ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                  No users found.
                </div>
              ) : (
                paginatedUsers.map((user) => (
                  <div key={user._id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${roleTone(user.role)}`}>
                            {user.role}
                          </span>
                          {user.workerType && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                              {user.workerType}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{user.email}</p>
                      </div>

                      <div className="text-sm text-slate-500">
                        Created {formatDate(user.createdAt)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <span className="font-medium text-slate-900">Phone:</span> {user.phone || 'N/A'}
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <span className="font-medium text-slate-900">Address:</span> {user.address || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))
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
    </div>
  );
}
