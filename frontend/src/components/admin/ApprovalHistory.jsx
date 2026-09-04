import React, { useCallback, useEffect, useState } from 'react';
import { History, CheckCircle, XCircle, Clock, Filter, Search, X, RotateCcw, RotateCw, Eye, User, DollarSign, Package, AlertCircle, FileText } from 'lucide-react';
import { fetchApprovalHistory } from '../services/approvalServices';
import { dataCache } from '../../utils/dataCache';

export const ApprovalHistory = () => {
  const cachedHistory = dataCache.getCache('approvalHistory');
  const [history, setHistory] = useState(cachedHistory || []);
  const [loading, setLoading] = useState(!cachedHistory);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    stage: '',
    actorRole: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  const loadHistory = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh || !dataCache.getCache('approvalHistory')) {
      setLoading(true);
    }
    setError(null);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const res = await fetchApprovalHistory(params);
      const fetched = res.history || [];
      setHistory(fetched);
      dataCache.setCache('approvalHistory', fetched);
      setPagination(res.pagination);
    } catch (e) {
      console.error('Failed to load approval history', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 300);

    const handleGlobalRefresh = () => {
      loadHistory();
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('app:refresh', handleGlobalRefresh);
    };
  }, [loadHistory]);

  const getActionIcon = (action) => {
    switch (action) {
      case 'submitted': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <History className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubOrderCode = (item) => {
    return (
      item.subOrder?.subOrderCode ||
      item.subOrder?.code ||
      item.metadata?.subOrderName ||
      item.subOrder?.name ||
      '—'
    );
  };

  const getOrderId = (item) => {
    return (
      item.metadata?.orderId ||
      item.order?.orderId ||
      item.subOrder?.orderId ||
      '—'
    );
  };

  const getStyleName = (item) => {
    const snap = item.order?.styleSnapshot || item.subOrder?.order?.styleSnapshot;
    const style = item.order?.style || item.subOrder?.order?.style;
    return (
      snap?.name ||
      snap?.styleName ||
      style?.name ||
      style?.styleName ||
      item.order?.styleName ||
      item.metadata?.styleName ||
      '—'
    );
  };

  const getSizes = (item) => {
    if (item.subOrder?.size) return item.subOrder.size;
    const subName = item.metadata?.subOrderName || item.subOrder?.name || '';
    if (subName) {
      const parts = subName.split('-');
      if (parts.length >= 3) return parts[parts.length - 1];
    }
    if (item.subOrder?.pieces && typeof item.subOrder.pieces === 'object') {
      const sizes = [];
      Object.values(item.subOrder.pieces).forEach((szObj) => {
        if (typeof szObj === 'object') {
          Object.keys(szObj).forEach((sz) => {
            if (!sizes.includes(sz)) sizes.push(sz);
          });
        }
      });
      if (sizes.length > 0) return sizes.join(', ');
    }
    return '—';
  };

  const getPiecesBreakdown = (item) => {
    const pieces = item?.stageAssignment?.pieces || item?.metadata?.pieces || item?.subOrder?.pieces;
    if (!pieces || typeof pieces !== 'object') return [];
    const list = [];
    Object.entries(pieces).forEach(([color, sizes]) => {
      if (typeof sizes === 'number') {
        list.push({ color, size: 'Standard', count: sizes });
      } else if (typeof sizes === 'object' && sizes !== null) {
        Object.entries(sizes).forEach(([size, qty]) => {
          list.push({ color, size, count: Number(qty) || 0 });
        });
      }
    });
    return list;
  };

  const getPricePerPiece = (item) => {
    if (item?.metadata?.pricePerPiece && Number(item.metadata.pricePerPiece) > 0) {
      return Number(item.metadata.pricePerPiece);
    }
    const stage = item?.metadata?.stage || item?.subOrder?.currentStage;
    const styleObj = item?.order?.style || item?.subOrder?.order?.style || item?.order?.styleSnapshot;
    const steps = styleObj?.steps || item?.subOrder?.order?.styleSnapshot?.steps;
    if (stage && Array.isArray(steps)) {
      const step = steps.find(s => s.name?.toLowerCase() === stage?.toLowerCase());
      if (step && Number(step.pricePerPiece) > 0) {
        return Number(step.pricePerPiece);
      }
    }
    if (item?.subOrder?.pricePerPiece && Number(item.subOrder.pricePerPiece) > 0) {
      return Number(item.subOrder.pricePerPiece);
    }
    return 0;
  };

  const getDonePieces = (item) => {
    if (item?.stageAssignment?.completedPieces !== undefined && item?.stageAssignment?.completedPieces !== null) {
      return Number(item.stageAssignment.completedPieces);
    }
    if (item?.metadata?.approvedPieces !== undefined && item?.metadata?.approvedPieces !== null && Number(item.metadata.approvedPieces) > 0) {
      return Number(item.metadata.approvedPieces);
    }
    const amount = Number(item?.amount) || 0;
    const rate = getPricePerPiece(item);
    if (amount > 0 && rate > 0) {
      return Math.round(amount / rate);
    }
    if (item?.action === 'submitted') return 'Pending';
    if (item?.action === 'rejected') return 0;
    if (item?.subOrder?.approvedPieces !== undefined && item?.subOrder?.approvedPieces !== null) {
      return Number(item.subOrder.approvedPieces);
    }
    return '—';
  };

  const getFaultyPieces = (item) => {
    if (item?.stageAssignment?.damagedPieces !== undefined && item?.stageAssignment?.damagedPieces !== null) {
      return Number(item.stageAssignment.damagedPieces);
    }
    if (item?.metadata?.faultyPieces !== undefined && item?.metadata?.faultyPieces !== null) {
      return Number(item.metadata.faultyPieces);
    }
    if (item?.action === 'submitted') return 0;
    return 0;
  };

  const getTotalPieces = (item) => {
    if (item?.stageAssignment?.totalPieces && Number(item.stageAssignment.totalPieces) > 0) {
      return Number(item.stageAssignment.totalPieces);
    }
    const done = getDonePieces(item);
    const faulty = getFaultyPieces(item);
    if (typeof done === 'number' && typeof faulty === 'number') {
      const sum = done + faulty;
      if (sum > 0) return sum;
    }
    if (item?.metadata?.submittedPieces && Number(item.metadata.submittedPieces) > 0) {
      return Number(item.metadata.submittedPieces);
    }
    const pieces = item?.stageAssignment?.pieces || item?.metadata?.pieces || item?.subOrder?.pieces;
    if (pieces && typeof pieces === 'object') {
      let sum = 0;
      Object.values(pieces).forEach(val => {
        if (typeof val === 'number') sum += val;
        else if (typeof val === 'object' && val !== null) {
          Object.values(val).forEach(q => { sum += (Number(q) || 0); });
        }
      });
      if (sum > 0) return sum;
    }
    if (item?.subOrder?.submittedPieces && Number(item.subOrder.submittedPieces) > 0) {
      return Number(item.subOrder.submittedPieces);
    }
    return '—';
  };

  const getWorkerName = (item) => {
    const stageWorker = item?.stageWorker || item?.subOrder?.completedBy;
    if (stageWorker && typeof stageWorker === 'object' && stageWorker.name) {
      return stageWorker.name;
    }
    if (typeof stageWorker === 'string' && stageWorker.trim()) {
      return stageWorker;
    }
    if (item?.actorRole === 'worker' && item?.actor?.name) {
      return item.actor.name;
    }
    if (item?.metadata?.completedByName) {
      return item.metadata.completedByName;
    }
    if (item?.metadata?.workerName) {
      return item.metadata.workerName;
    }
    const stage = item?.metadata?.stage || item?.subOrder?.currentStage;
    return stage ? `${stage} Worker` : 'Assigned Worker';
  };

  const getWorkerType = (item) => {
    const stageWorker = item?.stageWorker || item?.subOrder?.completedBy;
    if (stageWorker && typeof stageWorker === 'object' && stageWorker.workerType) {
      return stageWorker.workerType;
    }
    if (item?.actorRole === 'worker' && item?.actor?.workerType) {
      return item.actor.workerType;
    }
    return item?.metadata?.stage || 'Worker';
  };

  const getWorkerEmail = (item) => {
    const stageWorker = item?.stageWorker || item?.subOrder?.completedBy;
    if (stageWorker && typeof stageWorker === 'object' && stageWorker.email) {
      return stageWorker.email;
    }
    if (item?.actorRole === 'worker' && item?.actor?.email) {
      return item.actor.email;
    }
    return '—';
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      action: '',
      stage: '',
      actorRole: '',
      page: 1,
      limit: 20
    });
  };

  const hasActiveFilters = Boolean(filters.search || filters.action || filters.stage || filters.actorRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approval History</h1>
          <p className="text-gray-600 mt-1">Complete audit trail of all approval actions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadHistory(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Force refresh approval history"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="text-sm text-gray-600">{pagination?.total || 0} total actions</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search SubOrder code, Order ID, Stage, notes..."
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {filters.search && (
              <button
                onClick={() => handleFilterChange('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Action Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Action:</span>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="">All Actions</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Stage Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Stage:</span>
              <select
                value={filters.stage}
                onChange={(e) => handleFilterChange('stage', e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="">All Stages</option>
                <option value="Cutting">Cutting</option>
                <option value="Printing">Printing</option>
                <option value="Stitching">Stitching</option>
                <option value="Finishing">Finishing</option>
                <option value="Packing">Packing</option>
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Role:</span>
              <select
                value={filters.actorRole}
                onChange={(e) => handleFilterChange('actorRole', e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="worker">Worker</option>
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{String(error)}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3.5 px-4 bg-slate-50 rounded-xl animate-pulse">
                <div className="w-1/4 h-4 bg-slate-200 rounded" />
                <div className="w-1/4 h-4 bg-slate-200 rounded" />
                <div className="w-1/6 h-4 bg-slate-200 rounded" />
                <div className="w-1/5 h-4 bg-slate-200 rounded" />
                <div className="w-1/6 h-4 bg-slate-200 rounded" />
                <div className="w-24 h-6 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 px-4">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No approval history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">SubOrder</th>
                  <th className="py-3.5 px-4">Style & Size</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">Worker / Completed By</th>
                  <th className="py-3.5 px-4 text-right">Est. Payment</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs text-slate-700">
                {history.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* SubOrder */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs tracking-tight">
                        {getSubOrderCode(item)}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Order ID: {getOrderId(item)}
                      </div>
                    </td>

                    {/* Style & Size */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 text-xs">
                        {getStyleName(item)}
                      </div>
                      <div className="text-[11px] font-medium text-blue-700 mt-0.5">
                        Size: {getSizes(item)}
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-lg font-semibold text-[11px]">
                        {item.metadata?.stage || item.subOrder?.currentStage || '—'}
                      </span>
                    </td>

                    {/* Worker / Completed By */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {getWorkerName(item)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        <span className="capitalize">{getWorkerType(item)}</span>
                        {item.actorRole === 'admin' && item.actor?.name && (
                          <span className="text-slate-400 font-medium ml-1">
                            • Action: {item.actor.name} ({item.actorRole})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Est. Payment */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {item.amount > 0 ? (
                        <span className="font-bold text-emerald-600 text-sm">₹{item.amount.toFixed(2)}</span>
                      ) : item.reason ? (
                        <span className="text-rose-600 font-medium text-[11px]">{item.reason}</span>
                      ) : item.notes ? (
                        <span className="text-slate-500 text-[11px]">{item.notes}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Action & Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getActionIcon(item.action)}
                        <div>
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getActionColor(item.action)}`}>
                            {item.action ? item.action.charAt(0).toUpperCase() + item.action.slice(1) : '—'}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(item.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* View Details Eye Icon Button */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailItem(item)}
                        className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                        title="View Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-xs"
              >
                Previous
              </button>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Approval Action Details</h3>
                  <p className="text-xs text-slate-500">
                    Code: <span className="font-semibold text-slate-700">{getSubOrderCode(selectedDetailItem)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${getActionColor(selectedDetailItem.action)}`}>
                  {selectedDetailItem.action ? selectedDetailItem.action.toUpperCase() : '—'}
                </span>
                <button
                  onClick={() => setSelectedDetailItem(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SubOrder</span>
                  <span className="text-xs font-bold text-slate-900 truncate block mt-0.5">{getSubOrderCode(selectedDetailItem)}</span>
                </div>
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order ID</span>
                  <span className="text-xs font-bold text-slate-900 truncate block mt-0.5">{getOrderId(selectedDetailItem)}</span>
                </div>
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Style Name</span>
                  <span className="text-xs font-bold text-slate-900 truncate block mt-0.5">{getStyleName(selectedDetailItem)}</span>
                </div>
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stage</span>
                  <span className="text-xs font-bold text-amber-700 truncate block mt-0.5">
                    {selectedDetailItem.metadata?.stage || selectedDetailItem.subOrder?.currentStage || '—'}
                  </span>
                </div>
              </div>

              {/* Personnel & Status Information */}
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-500" />
                  Personnel & Audit Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Worker Box */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                      Stage Worker (Work Done By)
                    </span>
                    <div className="font-bold text-slate-900">{getWorkerName(selectedDetailItem)}</div>
                    <div className="text-[11px] text-slate-500">Role / Stage: <span className="font-medium text-slate-700">{getWorkerType(selectedDetailItem)}</span></div>
                    {getWorkerEmail(selectedDetailItem) !== '—' && (
                      <div className="text-[11px] text-slate-500">Email: <span className="font-medium text-slate-700">{getWorkerEmail(selectedDetailItem)}</span></div>
                    )}
                  </div>

                  {/* Reviewer / Action Box */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                      Action Performed By ({selectedDetailItem.action ? selectedDetailItem.action.toUpperCase() : 'ACTION'})
                    </span>
                    <div className="font-bold text-slate-900">{selectedDetailItem.actor?.name || 'System'}</div>
                    <div className="text-[11px] text-slate-500">Role: <span className="font-medium text-slate-700 capitalize">{selectedDetailItem.actorRole || 'System'}</span></div>
                    {selectedDetailItem.actor?.email && (
                      <div className="text-[11px] text-slate-500">Email: <span className="font-medium text-slate-700">{selectedDetailItem.actor.email}</span></div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400">Status Change: </span>
                    <span className="font-semibold text-slate-700">
                      {selectedDetailItem.previousStatus || 'in_progress'} → {selectedDetailItem.newStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Timestamp: </span>
                    <span className="font-semibold text-slate-700">{new Date(selectedDetailItem.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Production & Financial Summary */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-md space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Production & Financial Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
                    <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">Total Pieces</span>
                    <span className="text-base font-bold text-white mt-1 block">
                      {getTotalPieces(selectedDetailItem)} {typeof getTotalPieces(selectedDetailItem) === 'number' ? 'Pcs' : ''}
                    </span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
                    <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider block">Done Pcs (Submitted)</span>
                    <span className="text-base font-bold text-emerald-400 mt-1 block">
                      {getDonePieces(selectedDetailItem)} {typeof getDonePieces(selectedDetailItem) === 'number' ? 'Pcs' : ''}
                    </span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
                    <span className="text-[10px] font-semibold text-rose-300 uppercase tracking-wider block">Damaged / Faulty</span>
                    <span className="text-base font-bold text-rose-400 mt-1 block">
                      {getFaultyPieces(selectedDetailItem)} Pcs
                    </span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs">
                    <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-wider block">Stage Rate / Piece</span>
                    <span className="text-base font-bold text-blue-300 mt-1 block">
                      ₹{getPricePerPiece(selectedDetailItem).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Calculated Worker Earnings / Payment:</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    ₹{Number(selectedDetailItem.amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>


              {/* Reason / Notes */}
              {selectedDetailItem.reason && (
                <div className="bg-rose-50 border border-rose-200/80 p-3.5 rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Rejection Reason
                  </span>
                  <p className="text-xs text-rose-700 font-medium">{selectedDetailItem.reason}</p>
                </div>
              )}

              {selectedDetailItem.notes && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Notes / Remarks
                  </span>
                  <p className="text-xs text-slate-600 font-medium">{selectedDetailItem.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalHistory;
