import React, { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Package2,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  UserRound,
  CalendarDays,
  MapPin,
  FileText,
  Tag,
  Save,
  Eye,
  X
} from 'lucide-react';
import { fetchInventory, updateInventory } from '../services/inventoryServices';
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';

const INVENTORY_STATUSES = [
  { value: 'packed', label: 'Packed' },
  { value: 'ready_for_sale', label: 'Ready for Sale' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'sold', label: 'Sold' }
];

const getStatusTone = (status) => {
  switch (status) {
    case 'sold':
      return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
    case 'dispatched':
      return 'bg-sky-100 text-sky-700 ring-sky-200';
    case 'reserved':
      return 'bg-amber-100 text-amber-700 ring-amber-200';
    case 'ready_for_sale':
      return 'bg-violet-100 text-violet-700 ring-violet-200';
    case 'packed':
      return 'bg-slate-200 text-slate-700 ring-slate-300';
    default:
      return 'bg-gray-100 text-gray-700 ring-gray-200';
  }
};

const prettify = (value) => String(value || 'unknown').replace(/_/g, ' ');

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
};

const buildPiecesBreakdown = (pieces = {}) => {
  const entries = [];
  Object.entries(pieces || {}).forEach(([color, sizes]) => {
    if (!sizes || typeof sizes !== 'object') return;
    Object.entries(sizes).forEach(([size, qty]) => {
      const count = Number(qty) || 0;
      if (count > 0) entries.push(`${color} / ${size}: ${count}`);
    });
  });
  return entries;
};

export default function InventoryWorkspace({
  title,
  description,
  accent = 'cyan',
  canManage = true
}) {
  const accentBackground = accent === 'emerald'
    ? 'from-slate-950 via-emerald-950 to-teal-950'
    : 'from-slate-950 via-slate-900 to-cyan-950';

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [editorState, setEditorState] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInventory({
        q: search.trim() || undefined,
        status: status === 'all' ? undefined : status
      });
      const items = res.inventory || [];
      setInventory(items);
      setEditorState((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          next[item._id] = next[item._id] || {
            inventoryStatus: item.inventoryStatus || 'packed',
            inventoryLocation: item.inventoryLocation || '',
            inventoryNotes: item.inventoryNotes || '',
            saleReference: item.saleReference || ''
          };
        });
        return next;
      });
    } catch (e) {
      console.error('Failed to load inventory', e);
      setError(e?.response?.data?.message || e?.response?.data?.error || e.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [status]);

  const summary = useMemo(() => {
    return inventory.reduce(
      (acc, item) => {
        acc.totalSubOrders += 1;
        acc.totalPieces += Number(item.totalPackedPieces) || 0;
        acc.approvedPieces += Number(item.totalCompletedPieces) || 0;
        acc.availablePieces += Number(item.availablePieces) || 0;
        acc.damagedPieces += Number(item.totalDamagedPieces) || 0;
        return acc;
      },
      { totalSubOrders: 0, totalPieces: 0, approvedPieces: 0, availablePieces: 0, damagedPieces: 0 }
    );
  }, [inventory]);

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems,
    handlePageChange
  } = useClientPagination(inventory, 8);

  const handleEditorChange = (id, key, value) => {
    setEditorState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [key]: value
      }
    }));
  };

  const handleSave = async (id) => {
    const payload = editorState[id];
    if (!payload) return;
    setSavingId(id);
    setError(null);
    try {
      await updateInventory(id, payload);
      await loadInventory();
    } catch (e) {
      console.error('Failed to update inventory', e);
      setError(e?.response?.data?.message || e.message || 'Failed to update inventory');
    } finally {
      setSavingId(null);
    }
  };

  const getPrimaryColor = (pieces = {}) => Object.keys(pieces || {})[0] || 'N/A';

  return (
    <div className="space-y-6">
      <section className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${accentBackground} p-6 sm:p-8 text-white shadow-xl`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.18),_transparent_30%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-100">
              <Boxes className="h-4 w-4" />
              Inventory Control
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">{description}</p>
          </div>
          <button
            onClick={loadInventory}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Inventory
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[
          { label: 'Stored Suborders', value: summary.totalSubOrders, icon: ClipboardList, tone: 'from-cyan-500 to-blue-500' },
          { label: 'Packed Pieces', value: summary.totalPieces, icon: Package2, tone: 'from-sky-500 to-indigo-500' },
          { label: 'Approved Pieces', value: summary.approvedPieces, icon: ShieldCheck, tone: 'from-emerald-500 to-teal-500' },
          { label: 'Available Pieces', value: summary.availablePieces, icon: Tag, tone: 'from-violet-500 to-fuchsia-500' },
          { label: 'Damaged Pieces', value: summary.damagedPieces, icon: AlertTriangle, tone: 'from-amber-500 to-orange-500' }
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

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadInventory()}
                placeholder="Search by order ID, suborder code, style, worker..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
              />
            </label>
            <label className="relative min-w-[220px]">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
              >
                <option value="all">All statuses</option>
                {INVENTORY_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            onClick={loadInventory}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            Apply Filters
          </button>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{String(error)}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Loading inventory records...</p>
        </div>
      ) : inventory.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Boxes className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">No inventory found</h2>
          <p className="mt-2 text-sm text-slate-500">Final-stage approved suborders will appear here.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Image</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Style</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Color</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Pieces</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedItems.map((item) => {
                  const primaryColor = getPrimaryColor(item.pieces);

                  return (
                    <tr
                      key={item._id}
                      onClick={() => setSelectedItem(item)}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                          {item.image ? (
                            <img src={item.image} alt={item.order?.style?.name || item.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package2 className="h-6 w-6 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{item.order?.orderId || item.orderId || 'N/A'}</div>
                        <div className="text-xs text-slate-500">{item.subOrderCode || item.name || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{item.order?.style?.name || item.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{primaryColor}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className={`whitespace-nowrap inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${getStatusTone(item.inventoryStatus)}`}>
                          {prettify(item.inventoryStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                        <div>{item.totalPackedPieces ?? 0} total</div>
                        <div className="text-xs text-slate-500">{item.availablePieces ?? 0} available</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.inventoryLocation || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.inventoryUpdatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        itemLabel="inventory records"
      />

      {selectedItem && (() => {
        const item = selectedItem;
        const piecesBreakdown = buildPiecesBreakdown(item.pieces);
        const form = editorState[item._id] || {
          inventoryStatus: item.inventoryStatus || 'packed',
          inventoryLocation: item.inventoryLocation || '',
          inventoryNotes: item.inventoryNotes || '',
          saleReference: item.saleReference || ''
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-600 shadow hover:bg-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr]">
                <div className="relative min-h-[260px] overflow-hidden bg-gradient-to-br from-slate-100 via-cyan-50 to-emerald-50">
                  {item.image ? (
                    <img src={item.image} alt={item.order?.style?.name || item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-[260px] items-center justify-center text-slate-400">
                      <Package2 className="h-16 w-16" />
                    </div>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold text-slate-900">{item.name}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${getStatusTone(item.inventoryStatus)}`}>
                          {prettify(item.inventoryStatus)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Suborder code: <span className="font-medium text-slate-700">{item.subOrderCode || 'N/A'}</span>
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <div className="font-medium text-slate-900">{item.order?.orderId || item.orderId || 'N/A'}</div>
                      <div>Actual order ID</div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Pieces', value: item.totalPackedPieces ?? 0 },
                      { label: 'Approved', value: item.totalCompletedPieces ?? 0 },
                      { label: 'Available', value: item.availablePieces ?? 0 },
                      { label: 'Damaged', value: item.totalDamagedPieces ?? 0 }
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</div>
                        <div className="mt-2 text-xl font-semibold text-slate-900">{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <UserRound className="h-4 w-4 text-cyan-600" />
                        Worker Details
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <p><span className="font-medium text-slate-900">Completed By:</span> {item.completedBy?.name || 'Unknown'}</p>
                        <p><span className="font-medium text-slate-900">Type:</span> {item.completedBy?.workerType || 'N/A'}</p>
                        <p><span className="font-medium text-slate-900">Email:</span> {item.completedBy?.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <CalendarDays className="h-4 w-4 text-emerald-600" />
                        Timeline
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <p><span className="font-medium text-slate-900">Completed At:</span> {formatDate(item.updatedAt)}</p>
                        <p><span className="font-medium text-slate-900">Approved At:</span> {formatDate(item.approvedAt)}</p>
                        <p><span className="font-medium text-slate-900">Inventory Updated:</span> {formatDate(item.inventoryUpdatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">Piece Breakdown</h3>
                      <span className="text-xs text-slate-500">{piecesBreakdown.length} SKU entries</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {piecesBreakdown.length > 0 ? piecesBreakdown.map((entry) => (
                        <span key={entry} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{entry}</span>
                      )) : <span className="text-sm text-slate-500">No piece details available.</span>}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <MapPin className="h-4 w-4 text-violet-600" />
                      Inventory Controls
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <select
                        value={form.inventoryStatus}
                        onChange={(e) => handleEditorChange(item._id, 'inventoryStatus', e.target.value)}
                        disabled={!canManage}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white disabled:opacity-60"
                      >
                        {INVENTORY_STATUSES.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <input
                        value={form.inventoryLocation}
                        onChange={(e) => handleEditorChange(item._id, 'inventoryLocation', e.target.value)}
                        disabled={!canManage}
                        placeholder="Inventory location"
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white disabled:opacity-60"
                      />
                      <input
                        value={form.saleReference}
                        onChange={(e) => handleEditorChange(item._id, 'saleReference', e.target.value)}
                        disabled={!canManage}
                        placeholder="Sale / dispatch reference"
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white disabled:opacity-60 sm:col-span-2"
                      />
                      <textarea
                        value={form.inventoryNotes}
                        onChange={(e) => handleEditorChange(item._id, 'inventoryNotes', e.target.value)}
                        disabled={!canManage}
                        rows="3"
                        placeholder="Inventory notes"
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white disabled:opacity-60 sm:col-span-2"
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        Last updated by {item.inventoryUpdatedByName || 'system'} ({item.inventoryUpdatedByRole || 'system'})
                      </div>
                      {canManage && (
                        <button
                          onClick={() => handleSave(item._id)}
                          disabled={savingId === item._id}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" />
                          {savingId === item._id ? 'Saving...' : 'Save Inventory'}
                        </button>
                      )}
                    </div>
                  </div>

                  {!!item.inventoryEvents?.length && (
                    <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <FileText className="h-4 w-4 text-slate-700" />
                        Inventory Activity
                      </div>
                      <div className="mt-3 space-y-3">
                        {item.inventoryEvents.slice(0, 3).map((event, index) => (
                          <div key={`${item._id}-${index}`} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            <div className="font-medium text-slate-900">{prettify(event.status)}</div>
                            <div className="mt-1">{event.notes || 'No notes added'}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {event.updatedByName || 'System'} • {formatDate(event.updatedAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
