// src/components/admin/OrderManagement.jsx
import React, { useEffect, useMemo, useState } from 'react';
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
  X
} from 'lucide-react';
import * as orderService from '../services/orderServices';
import * as styleService from '../services/styleServices';
import stockService from '../services/stockServices';
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';

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

const getStatusColor = (order = {}) => {
  const label = getStageLabel(order).toLowerCase();
  if (label.includes('complete')) return 'bg-green-100 text-green-700';
  if (label.includes('delay')) return 'bg-red-100 text-red-700';
  if (label.includes('progress')) return 'bg-blue-100 text-blue-700';
  return 'bg-blue-50 text-blue-700';
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
  const [orders, setOrders] = useState([]);
  const [styles, setStyles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [selectedStyleId, setSelectedStyleId] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [pieces, setPieces] = useState({});
  const [requiredKgInput, setRequiredKgInput] = useState('');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [priorityInput, setPriorityInput] = useState('Normal');
  const [photoMap, setPhotoMap] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const data = await styleService.fetchStyles();
        setStyles(data || []);
        setPhotoMap((data || []).reduce((map, style) => {
          map[style._id || style.id] = getStylePhoto(style);
          return map;
        }, {}));
      } catch (err) {
        console.error('Failed to fetch styles:', err);
      }
    };
    fetchStyles();
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setVendors((await stockService.fetchVendors()) || []);
      } catch (err) {
        console.error('Failed to fetch vendors:', err);
      }
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await orderService.getOrders();
        setOrders(normalizeOrdersResponse(res).map(normalizeOrder));
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      }
    };
    fetchOrders();
  }, []);

  const selectedStyle = styles.find((style) => style._id === selectedStyleId || style.id === selectedStyleId);

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
        nextPieces[color][size] = 0;
      });
    });
    setPieces(nextPieces);
  };

  const handleStyleChange = (styleId) => {
    setSelectedStyleId(styleId);
    const style = styles.find((item) => item._id === styleId || item.id === styleId);
    initializePiecesForStyle(style);
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
    setPieces(normalized.pieces || {});
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
        [size]: Number(value)
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
      vendor: selectedVendor || undefined
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
        <button
          type="button"
          onClick={openCreateOrder}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Create Order
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-5">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${colorClasses[color]}`}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-base font-medium text-gray-600">{label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{count}</p>
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
              <col className="w-[100px]" />
              <col className="w-[86px]" />
              <col className="w-[140px]" />
              <col className="w-[150px]" />
              <col className="w-[76px]" />
              <col className="w-[100px]" />
              <col className="w-[118px]" />
              <col className="w-[120px]" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                {['Photos', 'Order ID', 'Design', 'Vendor', 'Required KG', 'Current Stage', 'Progress', 'Workers', 'Priority', 'Deadline', 'Actions'].map((head) => (
                  <th key={head} className="px-3 py-3 text-left text-[11px] font-semibold uppercase text-gray-500">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-gray-500">
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
                      <td className="px-3 py-2 text-sm text-gray-800">{order.vendor || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-gray-800">{order.requiredKg ?? 0} kg</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold ${getStatusColor(order)}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {getStageLabel(order)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                            <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="w-9 text-sm font-semibold text-gray-600">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-800">{order.assignedWorkers || 0}</td>
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
                          <button type="button" onClick={() => setViewingOrder(order)} className="rounded-md border border-blue-100 bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100" aria-label="View order">
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
                      onChange={(e) => setSelectedVendor(e.target.value)}
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
                                  {sizeColumns.map((size) => (
                                    <div key={size} className="flex justify-center px-3 py-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        value={pieces?.[color]?.[size] ?? 0}
                                        onChange={(e) => updatePiece(color, size, e.target.value)}
                                        className="h-9 w-20 rounded-md border border-gray-300 px-2 text-center text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                        disabled={isSubmitting}
                                      />
                                    </div>
                                  ))}
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

      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{viewingOrder.orderId || 'Order Details'}</h2>
                <p className="mt-1 text-sm text-gray-500">{viewingOrder.styleSnapshot?.name || viewingOrder.style?.name || 'Production order'}</p>
              </div>
              <button type="button" onClick={() => setViewingOrder(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close details">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Vendor</p>
                <p className="mt-1 font-bold text-gray-900">{viewingOrder.vendor || 'N/A'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Priority</p>
                <p className="mt-1 font-bold text-gray-900">{viewingOrder.priority || 'Normal'}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Required KG</p>
                <p className="mt-1 font-bold text-gray-900">{viewingOrder.requiredKg ?? 0} kg</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Progress</p>
                <p className="mt-1 font-bold text-gray-900">{calculateProgress(viewingOrder)}%</p>
              </div>
              <div className="col-span-2 rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Current Stage</p>
                <p className="mt-1 font-bold text-gray-900">{getStageLabel(viewingOrder)}</p>
              </div>
              <div className="col-span-2 rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Deadline</p>
                <p className="mt-1 inline-flex items-center gap-2 font-bold text-gray-900">
                  <Timer className="h-4 w-4 text-violet-600" />
                  {viewingOrder.deadline ? new Date(viewingOrder.deadline).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
