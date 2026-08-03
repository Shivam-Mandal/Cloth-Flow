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
  X,
  ChevronLeft,
  ChevronRight
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

const buildPiecesBreakdown = (pieces = {}, availablePieces = null) => {
  const entries = [];
  if (!pieces || typeof pieces !== 'object') return entries;

  let rawTotal = 0;
  Object.values(pieces).forEach((sizes) => {
    if (typeof sizes === 'number') {
      rawTotal += Number(sizes) || 0;
    } else if (sizes && typeof sizes === 'object') {
      Object.values(sizes).forEach((qty) => {
        rawTotal += Number(qty) || 0;
      });
    }
  });

  const targetTotal = (availablePieces !== null && availablePieces !== undefined)
    ? Number(availablePieces)
    : rawTotal;

  const scaleFactor = (rawTotal > 0 && targetTotal !== rawTotal) ? (targetTotal / rawTotal) : 1;

  let accumulated = 0;
  const tempEntries = [];

  Object.entries(pieces).forEach(([color, sizes]) => {
    if (typeof sizes === 'number') {
      const rawCount = Number(sizes) || 0;
      if (rawCount > 0) {
        tempEntries.push({ color, size: 'Standard', rawCount });
      }
      return;
    }
    if (!sizes || typeof sizes !== 'object') return;
    Object.entries(sizes).forEach(([size, qty]) => {
      const rawCount = Number(qty) || 0;
      if (rawCount > 0) {
        tempEntries.push({ color, size, rawCount });
      }
    });
  });

  tempEntries.forEach((item, index) => {
    let count = Math.round(item.rawCount * scaleFactor);
    if (index === tempEntries.length - 1 && scaleFactor !== 1) {
      count = Math.max(0, targetTotal - accumulated);
    }
    accumulated += count;
    entries.push({
      color: item.color,
      size: item.size,
      count,
      label: item.size === 'Standard' ? `${item.color}: ${count}` : `${item.color} / ${item.size}: ${count}`
    });
  });

  return entries;
};

const InventoryImageGallery = ({ item }) => {
  const allImages = useMemo(() => {
    const list = [];
    if (Array.isArray(item?.photos) && item.photos.length > 0) {
      item.photos.forEach((p) => p && list.push(p));
    }
    if (list.length === 0 && item?.image) {
      list.push(item.image);
    }
    return list;
  }, [item]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const activeImage = allImages[currentIndex] || allImages[0] || item?.image;

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 flex items-center justify-center group">
        {activeImage ? (
          <img
            src={activeImage}
            alt={item?.order?.style?.name || item?.name || 'Garment Photo'}
            className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <Package2 className="h-12 w-12 sm:h-16 sm:w-16 stroke-1 text-slate-300 mb-2" />
            <p className="text-xs font-medium">No Image Available</p>
          </div>
        )}

        {/* Carousel controls if multiple images exist */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              type="button"
              aria-label="Previous photo"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/65 text-white backdrop-blur transition hover:bg-slate-900 active:scale-95 shadow-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              type="button"
              aria-label="Next photo"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/65 text-white backdrop-blur transition hover:bg-slate-900 active:scale-95 shadow-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute top-3 right-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur border border-white/10 shadow-sm">
              {currentIndex + 1} / {allImages.length}
            </div>
          </>
        )}

        {item?.inventoryLocation && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900/85 px-3 py-1.5 text-xs font-medium text-white backdrop-blur shadow-md">
            <MapPin className="h-3.5 w-3.5 text-cyan-400" />
            <span>{item.inventoryLocation}</span>
          </div>
        )}
      </div>

      {/* Thumbnails bar if multiple images exist */}
      {allImages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto p-2.5 bg-white border-t border-slate-100 scrollbar-none">
          {allImages.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                idx === currentIndex ? 'border-cyan-500 scale-105 shadow-xs' : 'border-slate-200 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const [selectedStyle, setSelectedStyle] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stylesList, setStylesList] = useState([]);
  const [editorState, setEditorState] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInventory({
        q: search.trim() || undefined,
        status: status === 'all' ? undefined : status,
        styleId: selectedStyle === 'all' ? undefined : selectedStyle,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      const items = res.inventory || [];
      if (res.styles) {
        setStylesList(res.styles);
      }
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
  }, [status, selectedStyle, startDate, endDate]);

  const isFiltered = Boolean(search || status !== 'all' || selectedStyle !== 'all' || startDate || endDate);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('all');
    setSelectedStyle('all');
    setStartDate('');
    setEndDate('');
  };

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

  const openInventoryItem = (item) => {
    if (!item?._id) return;
    setEditorState((prev) => ({
      ...prev,
      [item._id]: {
        inventoryStatus: item.inventoryStatus || 'packed',
        inventoryLocation: item.inventoryLocation || '',
        inventoryNotes: item.inventoryNotes || '',
        saleReference: item.saleReference || '',
        ...(prev[item._id] || {})
      }
    }));
    setSelectedItem(item);
  };

  const handleSave = async (id) => {
    const payload = editorState[id];
    if (!payload) return;
    setSavingId(id);
    setError(null);
    try {
      await updateInventory(id, payload);
      await loadInventory();
      setSelectedItem((current) => (
        current?._id === id
          ? { ...current, ...payload, inventoryUpdatedAt: new Date().toISOString() }
          : current
      ));
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: 'Stored Suborders', value: summary.totalSubOrders, icon: ClipboardList, tone: 'from-cyan-500 to-blue-500' },
          { label: 'Actual Quantity Present', value: summary.availablePieces, icon: Tag, tone: 'from-violet-500 to-fuchsia-500' }
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

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 items-center">
          
          {/* Search bar */}
          <div className="lg:col-span-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadInventory()}
                placeholder="Search order, suborder, style..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </label>
          </div>

          {/* Style Filter Dropdown */}
          <div className="lg:col-span-3">
            <label className="relative block">
              <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white"
              >
                <option value="all">All Styles</option>
                {stylesList.map((st) => (
                  <option key={st._id} value={st._id}>{st.name}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Status Filter Dropdown */}
          <div className="lg:col-span-3">
            <label className="relative block">
              <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white"
              >
                <option value="all">All Statuses</option>
                {INVENTORY_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Filter Action Buttons */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <button
              onClick={loadInventory}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              Apply
            </button>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                title="Reset filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Date Range Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium text-slate-500 shrink-0">
            <CalendarDays className="h-4 w-4 text-cyan-600" />
            <span>Date Range:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-400">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-900 font-medium outline-none"
              />
            </div>

            <span className="text-slate-400">to</span>

            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-slate-400">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-900 font-medium outline-none"
              />
            </div>
          </div>
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
                      onClick={() => openInventoryItem(item)}
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
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 ring-1 ring-inset ring-cyan-600/20">
                          <Package2 className="h-4 w-4 text-cyan-600" />
                          <span>{item.availablePieces ?? 0} Pcs</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.inventoryLocation || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.inventoryUpdatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInventoryItem(item);
                          }}
                          aria-label={`View ${item.subOrderCode || item.order?.orderId || 'inventory item'}`}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4 text-cyan-600" />
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
        const piecesBreakdown = buildPiecesBreakdown(item.pieces, item.availablePieces);
        const form = editorState[item._id] || {
          inventoryStatus: item.inventoryStatus || 'packed',
          inventoryLocation: item.inventoryLocation || '',
          inventoryNotes: item.inventoryNotes || '',
          saleReference: item.saleReference || ''
        };

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-md transition-all animate-in fade-in duration-200">
            <div className="relative max-h-[92vh] sm:max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col">
              
              {/* Compact Sticky Header Banner */}
              <div className="sticky top-0 z-20 overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 px-4 py-3.5 sm:px-6 sm:py-4 text-white border-b border-white/10 flex items-center justify-between gap-3 shadow-md">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_40%)] pointer-events-none" />
                
                <div className="relative flex flex-1 flex-wrap items-center gap-2 sm:gap-3 min-w-0 pr-2">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ring-1 ${getStatusTone(item.inventoryStatus)}`}>
                    {prettify(item.inventoryStatus)}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-mono text-cyan-200 backdrop-blur">
                    {item.subOrderCode || 'Suborder'}
                  </span>
                  <h2 className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                    {item.order?.style?.name || item.name || 'Inventory Detail'}
                  </h2>
                </div>

                <div className="relative flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className="hidden sm:block rounded-xl bg-white/10 px-3 py-1.5 text-xs text-right border border-white/10">
                    <span className="text-slate-300">Order ID: </span>
                    <span className="font-semibold text-white">{item.order?.orderId || item.orderId || 'N/A'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    aria-label="Close inventory detail modal"
                    className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body Content */}
              <div className="overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 flex-1">
                
                {/* Mobile Order ID Pill */}
                <div className="block sm:hidden rounded-xl bg-slate-900 p-3 text-xs text-white flex items-center justify-between">
                  <span className="text-slate-300">Actual Order ID</span>
                  <span className="font-semibold font-mono text-cyan-200">{item.order?.orderId || item.orderId || 'N/A'}</span>
                </div>

                {/* Top Metrics Highlights Banner (Inside Scrollable Area) */}
                <div className="grid grid-cols-1">
                  <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 p-4 text-white shadow-md flex items-center justify-between">
                    <div>
                      <p className="text-[11px] sm:text-xs font-semibold text-cyan-300 uppercase tracking-wider">Actual Quantity Present in Inventory</p>
                      <p className="text-xs text-slate-400 mt-0.5">Physical pieces available for dispatch & sale</p>
                    </div>
                    <div className="flex items-baseline gap-1.5 bg-cyan-950/80 px-4 py-2 rounded-xl border border-cyan-500/30">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white">{item.availablePieces ?? 0}</span>
                      <span className="text-xs font-semibold text-cyan-300">Pcs</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                  
                  {/* Left Column: Image, SKU Breakdown, Worker Info */}
                  <div className="lg:col-span-5 space-y-5 sm:space-y-6">
                    {/* Garment Image Gallery Card */}
                    <InventoryImageGallery item={item} />

                    {/* Actual SKU Breakdown (Color & Size Matrix) */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-cyan-600" />
                          <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Piece Breakdown</h3>
                        </div>
                        <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-cyan-700">
                          {piecesBreakdown.length} SKU Variants
                        </span>
                      </div>
                      
                      <div className="mt-3.5">
                        {piecesBreakdown.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {piecesBreakdown.map((sku, idx) => (
                              <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                                <div className="font-medium text-slate-700 truncate pr-2">
                                  <span className="text-slate-900 font-semibold">{sku.color}</span> / <span className="text-slate-500">{sku.size}</span>
                                </div>
                                <span className="font-bold text-cyan-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                                  {sku.count} Pcs
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic py-2">No individual size/color breakdown available.</p>
                        )}
                      </div>
                    </div>

                    {/* Worker Details Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs sm:text-sm font-semibold text-slate-900">
                        <UserRound className="h-4 w-4 text-cyan-600" />
                        Worker Info
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-slate-600">
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-400">Worker Name:</span>
                          <span className="font-semibold text-slate-900">{item.completedBy?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-400">Worker Role:</span>
                          <span className="font-medium text-slate-800 capitalize">{item.completedBy?.workerType || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Email:</span>
                          <span className="font-medium text-slate-800 truncate max-w-[180px]">{item.completedBy?.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Inventory Management & Activity Log */}
                  <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                    {/* Inventory Control Form */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs sm:text-sm font-semibold text-slate-900">
                        <MapPin className="h-4 w-4 text-cyan-600" />
                        Inventory Status & Storage Controls
                      </div>
                      
                      <div className="mt-4 space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Inventory Status</label>
                            <select
                              value={form.inventoryStatus}
                              onChange={(e) => handleEditorChange(item._id, 'inventoryStatus', e.target.value)}
                              disabled={!canManage}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white disabled:opacity-60"
                            >
                              {INVENTORY_STATUSES.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Storage Location</label>
                            <input
                              value={form.inventoryLocation}
                              onChange={(e) => handleEditorChange(item._id, 'inventoryLocation', e.target.value)}
                              disabled={!canManage}
                              placeholder="e.g. Shelf B2 / Bin 4"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white disabled:opacity-60"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Sale / Dispatch Reference</label>
                          <input
                            value={form.saleReference}
                            onChange={(e) => handleEditorChange(item._id, 'saleReference', e.target.value)}
                            disabled={!canManage}
                            placeholder="e.g. Dispatch Order #, Sale Invoice Ref..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white disabled:opacity-60"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Inventory Notes</label>
                          <textarea
                            value={form.inventoryNotes}
                            onChange={(e) => handleEditorChange(item._id, 'inventoryNotes', e.target.value)}
                            disabled={!canManage}
                            rows="2"
                            placeholder="Add inventory tracking notes, dispatch instructions..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white disabled:opacity-60"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className="text-[11px] text-slate-400">
                            Last updated: {item.inventoryUpdatedByName || 'System'} ({formatDate(item.inventoryUpdatedAt)})
                          </span>
                          {canManage && (
                            <button
                              onClick={() => handleSave(item._id)}
                              disabled={savingId === item._id}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                            >
                              <Save className="h-4 w-4" />
                              {savingId === item._id ? 'Saving Changes...' : 'Save Inventory'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timeline Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs sm:text-sm font-semibold text-slate-900">
                        <CalendarDays className="h-4 w-4 text-emerald-600" />
                        Lifecycle Timeline
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <p className="text-[10px] font-medium text-slate-400 uppercase">Work Completed</p>
                          <p className="mt-0.5 font-semibold text-slate-800">{formatDate(item.updatedAt)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <p className="text-[10px] font-medium text-slate-400 uppercase">Admin Approved</p>
                          <p className="mt-0.5 font-semibold text-slate-800">{formatDate(item.approvedAt)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <p className="text-[10px] font-medium text-slate-400 uppercase">Last Updated</p>
                          <p className="mt-0.5 font-semibold text-slate-800">{formatDate(item.inventoryUpdatedAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Inventory Audit Activity */}
                    {!!item.inventoryEvents?.length && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs sm:text-sm font-semibold text-slate-900">
                          <FileText className="h-4 w-4 text-slate-700" />
                          Inventory Activity History
                        </div>
                        <div className="mt-3 space-y-2">
                          {item.inventoryEvents.slice(0, 4).map((event, index) => (
                            <div key={`${item._id}-${index}`} className="flex items-start justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 border border-slate-100">
                              <div>
                                <span className="font-semibold text-slate-900 capitalize">{prettify(event.status)}</span>
                                {event.notes && <p className="mt-0.5 text-slate-600">{event.notes}</p>}
                              </div>
                              <div className="text-right text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                <span>{event.updatedByName || 'System'}</span>
                                <div>{formatDate(event.updatedAt)}</div>
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
          </div>
        );
      })()}
    </div>
  );
}
