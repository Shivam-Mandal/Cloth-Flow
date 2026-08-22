// src/components/admin/OrderManagement.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  FileText,
  Flag,
  Hourglass,
  PackageCheck,
  Plus,
  Ruler,
  Save,
  Shirt,
  ShoppingCart,
  Store,
  Timer,
  Trash2,
  X,
  RotateCw
} from 'lucide-react';
import * as orderService from '../services/orderServices';
import * as styleService from '../services/styleServices';
import stockService from '../services/stockServices';
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';
import { dataCache } from '../../utils/dataCache';

const colorMap = {
  black: '#111827',
  blue: '#2563eb',
  green: '#16a34a',
  orange: '#f97316',
  purple: '#7c3aed',
  red: '#ef4444',
  white: '#ffffff',
  yellow: '#eab308'
};

const getOrderId = (order) => order?._id || order?.id;

const normalizeOrdersResponse = (res) => {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.orders)) return data.orders;
  return [];
};

const normalizeOrder = (order = {}) => ({
  ...order,
  _id: order._id || order.id || order.order?._id,
  id: order.id || order._id || order.order?.id,
  orderId: order.orderId || order.orderID || order.order?.orderId,
  styleSnapshot: order.styleSnapshot || order.style_snapshot || order.style?.styleSnapshot || {}
});

const resolvePhotoUrl = (photo) => {
  if (!photo) return null;
  if (typeof photo === 'string') return photo;
  return photo.url || photo.secure_url || photo.path || null;
};

const getStylePhoto = (style) => resolvePhotoUrl(style?.photos?.[0] || style?.photo || style?.image || style?.imageUrl);

const getColorValue = (color = '') => {
  const normalized = String(color).trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) return normalized;
  return colorMap[normalized] || '#2563eb';
};

const clampProgress = (value) => {
  const progress = Number(value);
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, Math.round(progress)));
};

const calculateProgress = (order = {}) => {
  if (order.progress !== undefined && order.progress !== null) return clampProgress(order.progress);
  if (Array.isArray(order.subOrders) && order.subOrders.length) {
    const total = order.subOrders.reduce((sum, subOrder) => sum + clampProgress(subOrder.progress), 0);
    return clampProgress(total / order.subOrders.length);
  }

  const stages = order.stages || [];
  const stage = String(order.currentStage || '').toLowerCase();
  if (stage === 'completed') return 100;
  if (stages.length && stage) {
    const index = stages.findIndex((item) => String(item).toLowerCase() === stage);
    if (index >= 0) return clampProgress((index / stages.length) * 100);
  }
  return 0;
};

const getStageLabel = (order = {}) => {
  const progress = calculateProgress(order);
  if (progress >= 100) return 'Completed';
  return order.currentStage || order.status || 'Pending';
};

const getPriorityColor = (priority = 'Normal') => {
  switch (String(priority).toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-700';
    case 'low':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export const OrderManagement = () => {
  const cachedOrders = dataCache.getCache('orders');
  const [orders, setOrders] = useState(cachedOrders || []);
  const [styles, setStyles] = useState(dataCache.getCache('styles') || []);
  const [vendors, setVendors] = useState(dataCache.getCache('vendors') || []);
  const [stocks, setStocks] = useState(dataCache.getCache('stocks') || []);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [viewingDetails, setViewingDetails] = useState(null);
  const [viewingLoading, setViewingLoading] = useState(false);

  const handleOpenViewModal = async (orderRaw) => {
    const order = normalizeOrder(orderRaw);
    setViewingOrder(order);
    setViewingDetails(null);
    setViewingLoading(true);
    try {
      const id = getOrderId(order);
      if (id) {
        const details = await orderService.getOrderDetails(id);
        setViewingDetails(details);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setViewingLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewingOrder(null);
    setViewingDetails(null);
    setViewingLoading(false);
  };
  const [selectedStyleId, setSelectedStyleId] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedFabric, setSelectedFabric] = useState('');
  const [pieces, setPieces] = useState({});
  const [requiredKgInput, setRequiredKgInput] = useState('');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [priorityInput, setPriorityInput] = useState('Normal');
  const [photoMap, setPhotoMap] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loading, setLoading] = useState(!cachedOrders);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await orderService.getOrders();
      const norm = normalizeOrdersResponse(res).map(normalizeOrder);
      setOrders(norm);
      dataCache.setCache('orders', norm);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  }, []);

  const loadAllData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh || !dataCache.getCache('orders')) {
      setLoading(true);
    }
    try {
      await Promise.allSettled([
        (async () => {
          const data = await styleService.fetchStyles();
          setStyles(data || []);
          if (data) dataCache.setCache('styles', data);
          setPhotoMap((data || []).reduce((map, style) => {
            map[style._id || style.id] = getStylePhoto(style);
            return map;
          }, {}));
        })(),
        (async () => {
          const [fetchedVendors, fetchedStocks] = await Promise.all([
            stockService.fetchVendors(),
            stockService.fetchStocks()
          ]);
          setVendors(fetchedVendors || []);
          setStocks(fetchedStocks || []);
          if (fetchedVendors) dataCache.setCache('vendors', fetchedVendors);
          if (fetchedStocks) dataCache.setCache('stocks', fetchedStocks);
        })(),
        fetchOrders()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  useEffect(() => {
    loadAllData();

    const handleGlobalRefresh = () => {
      loadAllData();
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('app:refresh', handleGlobalRefresh);
  }, [loadAllData]);

  const selectedStyle = styles.find((style) => style._id === selectedStyleId || style.id === selectedStyleId);

  const availableFabrics = useMemo(() => {
    if (!selectedVendor) return [];
    const matching = stocks.filter(
      (s) => (s.vendor || '').trim().toLowerCase() === (selectedVendor || '').trim().toLowerCase() && s.fabric
    );
    const fabricList = Array.from(new Set(matching.map((s) => s.fabric.trim()))).filter(Boolean);
    return fabricList;
  }, [stocks, selectedVendor]);

  const stats = useMemo(() => {
    const normalized = orders.map(normalizeOrder);
    const completed = normalized.filter((order) => calculateProgress(order) >= 100).length;
    const delayed = normalized.filter((order) => getStageLabel(order).toLowerCase().includes('delay')).length;
    const inProgress = normalized.filter((order) => {
      const progress = calculateProgress(order);
      return progress > 0 && progress < 100 && !getStageLabel(order).toLowerCase().includes('delay');
    }).length;

    return { total: normalized.length, inProgress, completed, delayed };
  }, [orders]);

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems: paginatedOrders,
    handlePageChange
  } = useClientPagination(orders, 8);

  const resetForm = () => {
    setEditingOrder(null);
    setSelectedStyleId('');
    setSelectedVendor('');
    setSelectedFabric('');
    setPieces({});
    setRequiredKgInput('');
    setDeadlineInput('');
    setPriorityInput('Normal');
  };

  const closeOrderForm = () => {
    if (isSubmitting) return;
    setShowOrderForm(false);
    resetForm();
  };

  const initializePiecesForStyle = (style) => {
    const nextPieces = {};
    (style?.colors || []).forEach((color) => {
      nextPieces[color] = {};
      (style?.sizes || []).forEach((size) => {
        nextPieces[color][size] = '';
      });
    });
    setPieces(nextPieces);
  };

  const handleStyleChange = (styleId) => {
    setSelectedStyleId(styleId);
    const style = styles.find((item) => item._id === styleId || item.id === styleId);
    initializePiecesForStyle(style);
  };

  const handleVendorChange = (vendorValue) => {
    setSelectedVendor(vendorValue);
    setSelectedFabric('');
  };

  const openCreateOrder = () => {
    resetForm();
    setShowOrderForm(true);
  };

  const openEditOrder = (order) => {
    const normalized = normalizeOrder(order);
    setEditingOrder(normalized);
    setSelectedStyleId(normalized.style?._id || normalized.style || '');
    setSelectedVendor(normalized.vendor || '');
    setSelectedFabric(normalized.fabric || '');

    const existingPieces = normalized.pieces || {};
    const formattedPieces = {};
    for (const color of Object.keys(existingPieces)) {
      formattedPieces[color] = {};
      for (const size of Object.keys(existingPieces[color] || {})) {
        const val = existingPieces[color][size];
        formattedPieces[color][size] = (val === 0 || val === '0' || val === null || val === undefined) ? '' : val;
      }
    }
    setPieces(formattedPieces);

    setRequiredKgInput(normalized.requiredKg ?? '');
    setDeadlineInput(normalized.deadline ? new Date(normalized.deadline).toISOString().slice(0, 10) : '');
    setPriorityInput(normalized.priority || 'Normal');
    setShowOrderForm(true);
  };

  const updatePiece = (color, size, value) => {
    setPieces((prev) => ({
      ...prev,
      [color]: {
        ...(prev[color] || {}),
        [size]: value === '' ? '' : Math.max(0, Number(value) || 0)
      }
    }));
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (!editingOrder && !selectedStyleId) return alert('Select a style first');

    const payload = {
      pieces,
      requiredKg: requiredKgInput ? Number(requiredKgInput) : undefined,
      deadline: deadlineInput ? new Date(deadlineInput).toISOString() : undefined,
      priority: priorityInput || 'Normal',
      vendor: selectedVendor || undefined,
      fabric: selectedFabric || undefined
    };

    try {
      setIsSubmitting(true);

      if (editingOrder) {
        const updated = normalizeOrder(await orderService.updateOrder(getOrderId(editingOrder), payload));
        setOrders((prev) => prev.map((order) => (getOrderId(order) === getOrderId(updated) ? { ...order, ...updated } : order)));
      } else {
        const data = await orderService.createOrder({ ...payload, styleId: selectedStyleId });
        const created = normalizeOrder(data?.order || data?.data?.order || data?.data || data);
        if (!created?._id && !created?.id) throw new Error('No created order returned from API');
        setOrders((prev) => [created, ...prev]);
      }

      setShowOrderForm(false);
      resetForm();
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Unknown error';
      console.error('Error saving order:', err);
      alert(`Failed to save order: ${serverMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    const id = getOrderId(order);
    if (!id) return;
    try {
      await orderService.deleteOrder(id);
      setOrders((prev) => prev.filter((item) => getOrderId(item) !== id));
    } catch (err) {
      console.error('Failed to delete order:', err);
      alert('Failed to delete order.');
    }
  };

  const getOrderPhoto = (order) => {
    const styleId = order.style?._id || order.style;
    return photoMap[styleId] || null;
  };

  const statCards = [
    { label: 'All Orders', count: stats.total, icon: ShoppingCart, color: 'violet' },
    { label: 'In Progress', count: stats.inProgress, icon: Hourglass, color: 'blue' },
    { label: 'Completed', count: stats.completed, icon: CheckCircle2, color: 'green' },
    { label: 'Delayed', count: stats.delayed, icon: Clock3, color: 'orange' }
  ];

  const colorClasses = {
    violet: 'bg-violet-100 text-violet-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="mt-1 text-gray-600">Create and track production orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadAllData(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateOrder}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Create Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {statCards.map(({ label, count, icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-3.5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className={`flex h-10 w-10 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl ${colorClasses[color]}`}>
                {React.createElement(icon, { className: 'h-5 w-5 sm:h-8 sm:w-8' })}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-base font-medium text-gray-600 truncate">{label}</p>
                <p className="mt-0.5 sm:mt-1 text-xl sm:text-3xl font-bold text-gray-900">{count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>


      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-200 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Active Orders</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed">
            <colgroup>
              <col className="w-[72px]" />
              <col className="w-[150px]" />
              <col className="w-[130px]" />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[160px]" />
              <col className="w-[100px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                {['Photos', 'Order ID', 'Design', 'Vendor', 'Required KG', 'Progress', 'Priority', 'Deadline', 'Actions'].map((head) => (
                  <th key={head} className="px-3 py-3 text-left text-[11px] font-semibold uppercase text-gray-500">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3 py-3"><div className="h-12 w-12 bg-slate-200 rounded-md" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    No orders available
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((orderRaw) => {
                  const order = normalizeOrder(orderRaw);
                  const progress = calculateProgress(order);
                  const photo = getOrderPhoto(order);
                  return (
                    <tr key={order.orderId || order._id || order.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-3 py-2">
                        {photo ? (
                          <img src={photo} alt={order.styleSnapshot?.name || 'Style'} className="h-12 w-12 rounded-md border border-gray-200 object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-center text-[11px] leading-tight text-gray-500">
                            No image
                          </div>
                        )}
                      </td>
                      <td className="break-words px-3 py-2 text-xs font-bold leading-snug text-gray-900">{order.orderId || '—'}</td>
                      <td className="px-3 py-2 text-sm leading-snug text-gray-800">{order.styleSnapshot?.name || order.style?.name || order.design || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-gray-800">
                        <div>{order.vendor || 'N/A'}</div>
                        {order.fabric && (
                          <span className="inline-block mt-0.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                            {order.fabric}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-800">{order.requiredKg ?? 0} kg</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                            <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="w-9 text-sm font-semibold text-gray-600">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${getPriorityColor(order.priority)}`}>
                          {order.priority || 'Normal'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-800">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-violet-600" />
                          {order.deadline ? new Date(order.deadline).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleOpenViewModal(order)} className="rounded-md border border-blue-100 bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100" aria-label="View order">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => openEditOrder(order)} className="rounded-md border border-green-100 bg-green-50 p-1.5 text-green-600 hover:bg-green-100" aria-label="Edit order">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => handleDeleteOrder(order)} className="rounded-md border border-red-100 bg-red-50 p-1.5 text-red-600 hover:bg-red-100" aria-label="Delete order">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 pb-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            itemLabel="orders"
          />
        </div>
      </div>

      {showOrderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3 backdrop-blur-sm sm:p-5">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="max-h-[92vh] overflow-y-auto p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    {editingOrder ? <Edit3 className="h-8 w-8" /> : <ShoppingCart className="h-8 w-8" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{editingOrder ? 'Edit Order' : 'Create New Order'}</h2>
                    <p className="mt-1 text-sm text-gray-500">{editingOrder ? 'Update production order details' : 'Fill the details below to create a new production order'}</p>
                  </div>
                </div>
                <button type="button" onClick={closeOrderForm} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close order form">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSaveOrder}>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Style</label>
                  <div className="relative">
                    <Shirt className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-600" />
                    <select
                      value={selectedStyleId}
                      onChange={(e) => handleStyleChange(e.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 pl-11 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      disabled={isSubmitting || !!editingOrder}
                      required={!editingOrder}
                    >
                      <option value="">Select style</option>
                      {styles.map((style) => (
                        <option key={style._id || style.id} value={style._id || style.id}>
                          {style.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Vendor</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-600" />
                    <select
                      value={selectedVendor}
                      onChange={(e) => handleVendorChange(e.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 pl-11 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      disabled={isSubmitting}
                    >
                      <option value="">Select vendor (optional)</option>
                      {vendors.map((vendor) => (
                        <option key={vendor} value={vendor}>
                          {vendor}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedVendor && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Fabric</label>
                    <div className="relative">
                      <Shirt className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-600" />
                      {availableFabrics.length > 0 ? (
                        <select
                          value={selectedFabric}
                          onChange={(e) => setSelectedFabric(e.target.value)}
                          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 pl-11 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitting}
                        >
                          <option value="">Select fabric for {selectedVendor}</option>
                          {availableFabrics.map((fabric) => (
                            <option key={fabric} value={fabric}>
                              {fabric}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={selectedFabric}
                          onChange={(e) => setSelectedFabric(e.target.value)}
                          placeholder="Enter fabric name (e.g. Cotton, Silk)"
                          className="h-11 w-full rounded-lg border border-gray-300 px-3 pl-11 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Required Kg (Optional)</label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-600" />
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={requiredKgInput}
                        onChange={(e) => setRequiredKgInput(e.target.value)}
                        className="h-11 w-full rounded-lg border border-gray-300 px-3 pl-11 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 12.5"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Deadline</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-red-500" />
                      <input
                        type="date"
                        value={deadlineInput}
                        onChange={(e) => setDeadlineInput(e.target.value)}
                        className="h-11 w-full rounded-lg border border-gray-300 px-3 pl-11 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Priority</label>
                    <div className="relative">
                      <Flag className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-orange-500" />
                      <select
                        value={priorityInput}
                        onChange={(e) => setPriorityInput(e.target.value)}
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 pl-11 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitting}
                      >
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                </div>

                {(selectedStyle || Object.keys(pieces || {}).length > 0) && (
                  <div className="overflow-hidden rounded-md border border-gray-200">
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2">
                      <PackageCheck className="h-4 w-4 text-gray-700" />
                      <h3 className="text-sm font-bold text-gray-900">Color & Size</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[420px]">
                        {(() => {
                          const sizeColumns = selectedStyle?.sizes || Object.keys(Object.values(pieces || {})[0] || {});
                          const colorRows = selectedStyle?.colors || Object.keys(pieces || {});
                          const gridTemplateColumns = `minmax(150px, 1.2fr) repeat(${Math.max(sizeColumns.length, 1)}, minmax(96px, 1fr))`;

                          return (
                            <>
                              <div className="grid bg-white" style={{ gridTemplateColumns }}>
                                <div className="px-3 py-2 text-left text-sm font-bold text-gray-700">Color</div>
                                {sizeColumns.map((size) => (
                                  <div key={size} className="px-3 py-2 text-center text-sm font-bold text-gray-700">
                                    {size}
                                  </div>
                                ))}
                              </div>
                              {colorRows.map((color) => (
                                <div key={color} className="grid border-t border-gray-100" style={{ gridTemplateColumns }}>
                                  <div className="px-3 py-2 text-sm text-gray-800">
                                    <span className="inline-flex items-center gap-2">
                                      <span className="h-3.5 w-3.5 rounded border border-gray-200" style={{ backgroundColor: getColorValue(color) }} />
                                      {color}
                                    </span>
                                  </div>
                                  {sizeColumns.map((size) => {
                                     const rawVal = pieces?.[color]?.[size];
                                     const displayVal = (rawVal === 0 || rawVal === '0' || rawVal === null || rawVal === undefined) ? '' : rawVal;
                                     return (
                                       <div key={size} className="flex justify-center px-3 py-1.5">
                                         <input
                                           type="number"
                                           min={0}
                                           value={displayVal}
                                           onChange={(e) => updatePiece(color, size, e.target.value)}
                                           placeholder="0"
                                           className="h-9 w-20 rounded-md border border-gray-300 px-2 text-center text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                           disabled={isSubmitting}
                                         />
                                       </div>
                                     );
                                   })}
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeOrderForm}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-70"
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    disabled={isSubmitting}
                  >
                    {editingOrder ? <Save className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    {isSubmitting ? 'Saving...' : editingOrder ? 'Save Changes' : 'Create Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewingOrder && (() => {
        const fullOrder = viewingDetails?.order ? normalizeOrder(viewingDetails.order) : viewingOrder;
        const subOrders = viewingDetails?.subOrders || fullOrder?.subOrders || [];
        const styleObj = styles.find((s) => (s._id || s.id) === (fullOrder.style?._id || fullOrder.style)) || fullOrder.style;
        const photo = getOrderPhoto(fullOrder) || getStylePhoto(styleObj) || resolvePhotoUrl(fullOrder.styleSnapshot?.photo || fullOrder.styleSnapshot?.photos?.[0]);
        const skuId = styleObj?.skuId || fullOrder.styleSnapshot?.skuId || fullOrder.skuId;
        const styleName = fullOrder.styleSnapshot?.name || fullOrder.style?.name || styleObj?.name;
        const progress = calculateProgress(fullOrder);
        const stageLabel = getStageLabel(fullOrder);

        // Compute total quantity & check pieces breakdown
        const piecesObj = fullOrder.pieces || {};
        const colors = Object.keys(piecesObj).filter(c => Object.values(piecesObj[c] || {}).some(val => Number(val) > 0));
        const hasPiecesBreakdown = colors.length > 0;
        const allSizesSet = new Set();
        colors.forEach(c => {
          Object.keys(piecesObj[c] || {}).forEach(s => {
            if (Number(piecesObj[c][s]) > 0) allSizesSet.add(s);
          });
        });
        const sizes = Array.from(allSizesSet);

        // Stages / steps
        const steps = fullOrder.styleSnapshot?.steps?.length ? fullOrder.styleSnapshot.steps : (styleObj?.steps || []);
        const stagesList = fullOrder.stages?.length ? fullOrder.stages : (steps.map(s => s.label) || []);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5 backdrop-blur-sm">
            <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  {photo ? (
                    <img src={photo} alt={styleName || 'Product photo'} className="h-12 w-12 rounded-xl object-cover border border-slate-200 shadow-xs" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold text-lg shadow-xs">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">{fullOrder.orderId || 'Production Order'}</h2>
                      {viewingLoading && <RotateCw className="h-4 w-4 text-blue-600 animate-spin" />}
                    </div>
                    {styleName && <p className="text-xs font-semibold text-slate-500">{styleName}{skuId ? ` • SKU: ${skuId}` : ''}</p>}
                  </div>
                </div>
                <button type="button" onClick={closeViewModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Close modal">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Key Attributes Grid (Strictly Conditional: ONLY show if present in backend) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {fullOrder.vendor && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor</span>
                      <p className="mt-1 font-bold text-slate-900 text-sm">{fullOrder.vendor}</p>
                    </div>
                  )}

                  {fullOrder.fabric && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fabric</span>
                      <p className="mt-1 font-bold text-purple-700 text-sm">{fullOrder.fabric}</p>
                    </div>
                  )}

                  {fullOrder.priority && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</span>
                      <div className="mt-1">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${getPriorityColor(fullOrder.priority)}`}>
                          {fullOrder.priority}
                        </span>
                      </div>
                    </div>
                  )}

                  {fullOrder.requiredKg != null && Number(fullOrder.requiredKg) > 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Required KG</span>
                      <p className="mt-1 font-bold text-slate-900 text-sm">{fullOrder.requiredKg} kg</p>
                    </div>
                  )}

                  {fullOrder.totalQuantity != null && Number(fullOrder.totalQuantity) > 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Quantity</span>
                      <p className="mt-1 font-bold text-slate-900 text-sm">{fullOrder.totalQuantity} pcs</p>
                    </div>
                  )}

                  {progress != null && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Progress</span>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{progress}%</span>
                      </div>
                    </div>
                  )}

                  {stageLabel && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Stage</span>
                      <p className="mt-1 font-bold text-slate-900 text-sm">{stageLabel}</p>
                    </div>
                  )}

                  {fullOrder.deadline && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deadline</span>
                      <p className="mt-1 flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                        <Calendar className="h-4 w-4 text-violet-600" />
                        {new Date(fullOrder.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {fullOrder.createdAt && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Order Date</span>
                      <p className="mt-1 font-bold text-slate-900 text-sm">{new Date(fullOrder.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {/* Color & Size Pieces Breakdown Table (ONLY if present in backend) */}
                {hasPiecesBreakdown && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-blue-600" />
                        Color & Size Breakdown
                      </span>
                      {fullOrder.totalQuantity > 0 && (
                        <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          Total: {fullOrder.totalQuantity} pcs
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Color</th>
                            {sizes.map(s => (
                              <th key={s} className="px-3 py-2.5 text-center">{s}</th>
                            ))}
                            <th className="px-4 py-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                          {colors.map(color => {
                            const rowTotal = sizes.reduce((sum, s) => sum + (Number(piecesObj[color]?.[s]) || 0), 0);
                            return (
                              <tr key={color} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5">
                                  <span className="inline-flex items-center gap-2 font-bold">
                                    <span className="h-3 w-3 rounded-full border border-slate-300 shadow-xs" style={{ backgroundColor: getColorValue(color) }} />
                                    {color}
                                  </span>
                                </td>
                                {sizes.map(s => {
                                  const cnt = Number(piecesObj[color]?.[s]) || 0;
                                  return (
                                    <td key={s} className={`px-3 py-2.5 text-center ${cnt > 0 ? 'font-bold text-slate-900' : 'text-slate-300'}`}>
                                      {cnt > 0 ? cnt : '—'}
                                    </td>
                                  );
                                })}
                                <td className="px-4 py-2.5 text-right font-bold text-blue-600">{rowTotal}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Production Workflow Stages (ONLY if present in backend) */}
                {stagesList.length > 0 && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Hourglass className="h-4 w-4 text-violet-600" />
                        Production Stages & Rate
                      </span>
                    </div>
                    <div className="p-4 bg-white">
                      <div className="flex flex-wrap gap-2">
                        {stagesList.map((st, idx) => {
                          const stepInfo = steps.find(s => String(s.label).toLowerCase() === String(st).toLowerCase());
                          const price = stepInfo?.price;
                          return (
                            <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-800">{st}</span>
                              {price != null && Number(price) > 0 && (
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  ₹{price}/pc
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Orders / Production Batches (ONLY if present in backend) */}
                {subOrders.length > 0 && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-emerald-600" />
                        Sub-Orders / Batches ({subOrders.length})
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 bg-white">
                      {subOrders.map((so) => (
                        <div key={so._id || so.id} className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{so.subOrderCode || so.name || 'Batch'}</span>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                so.status === 'completed' || so.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                so.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {so.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              {so.currentStage && <span>Stage: <strong className="text-slate-700">{so.currentStage}</strong></span>}
                              {so.submittedPieces > 0 && <span>Submitted: <strong className="text-slate-700">{so.submittedPieces} pcs</strong></span>}
                              {so.approvedPieces > 0 && <span>Approved: <strong className="text-emerald-700">{so.approvedPieces} pcs</strong></span>}
                              {so.assignedWorkers > 0 && <span>Workers: <strong className="text-slate-700">{so.assignedWorkers}</strong></span>}
                            </div>
                          </div>
                          {so.progress != null && (
                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <div className="h-2 w-20 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${clampProgress(so.progress)}%` }} />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{clampProgress(so.progress)}%</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/50 flex justify-end">
                <button
                  type="button"
                  onClick={closeViewModal}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
