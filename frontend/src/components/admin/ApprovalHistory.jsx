import React, { useCallback, useEffect, useState } from 'react';
import { History, CheckCircle, XCircle, Clock, Filter, Search, X, RotateCcw, RotateCw } from 'lucide-react';
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
                  <th className="py-3.5 px-4">Completed By</th>
                  <th className="py-3.5 px-4 text-right">Est. Payment</th>
                  <th className="py-3.5 px-4">Action</th>
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

                    {/* Completed By */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {item.actor?.name || 'System'}
                      </div>
                      <div className="text-[10px] text-slate-500 capitalize">
                        {item.actorRole || item.actor?.workerType || 'Worker'}
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
    </div>
  );
};

export default ApprovalHistory;
