import React, { useEffect, useState } from 'react';
import { History, CheckCircle, XCircle, Clock, TrendingUp, RotateCw, Eye, X, User, DollarSign, Package, AlertCircle, FileText } from 'lucide-react';
import { fetchWorkerApprovalHistory } from '../services/approvalServices';
import { dataCache } from '../../utils/dataCache';

export const WorkerApprovalHistory = () => {
  const cachedWorkerHistory = dataCache.getCache('workerApprovalHistory');
  const [history, setHistory] = useState(cachedWorkerHistory || []);
  const [loading, setLoading] = useState(!cachedWorkerHistory);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalEarnings: 0
  });
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  const loadHistory = async (page = 1, isManualRefresh = false) => {
    if (isManualRefresh || !dataCache.getCache('workerApprovalHistory')) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetchWorkerApprovalHistory({ page, limit: 20 });
      const fetched = res.history || [];
      setHistory(fetched);
      dataCache.setCache('workerApprovalHistory', fetched);
      setPagination(res.pagination);
      setStats(res.stats || {
        totalSubmissions: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalEarnings: 0
      });
    } catch (e) {
      console.error('Failed to load approval history', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(currentPage);

    const handleGlobalRefresh = () => {
      loadHistory(currentPage);
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('app:refresh', handleGlobalRefresh);
  }, [currentPage]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Approval History</h1>
          <p className="text-gray-600 mt-1">Track your submissions and approval status</p>
        </div>
        <button
          type="button"
          onClick={() => loadHistory(currentPage, true)}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Submissions</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Approved</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.approvedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.rejectedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{stats.totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{String(error)}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded-full" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/5 ml-auto" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No approval history yet</p>
            <p className="text-sm text-gray-500 mt-1">Your approval actions will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map(item => (
              <div key={item._id} className="border border-gray-200 hover:border-blue-200 rounded-2xl p-4 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getActionIcon(item.action)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getActionColor(item.action)}`}>
                          {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-gray-600 mb-2">
                        <div>
                          <span className="font-semibold text-slate-800">SubOrder:</span> {getSubOrderCode(item)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800">Order ID:</span> {getOrderId(item)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800">Stage:</span> {item.metadata?.stage || '—'}
                        </div>
                      </div>

                      {item.amount > 0 && (
                        <div className="text-xs text-emerald-600 font-bold mb-1">
                          Payment Amount: ₹{item.amount.toFixed(2)}
                        </div>
                      )}

                      {item.reason && (
                        <div className="text-xs text-rose-600 font-medium mb-1">
                          <strong>Reason:</strong> {item.reason}
                        </div>
                      )}

                      <div className="text-xs text-slate-500">
                        <strong>Work Done By:</strong> {getWorkerName(item)} ({getWorkerType(item)})
                        {item.actorRole === 'admin' && item.actor?.name && (
                          <span className="text-slate-400 font-medium ml-1">
                            • Action: {item.actor.name} ({item.actorRole})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailItem(item)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer ml-3"
                    title="View Detail"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
              disabled={currentPage >= pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submission Details</h3>
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

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
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

export default WorkerApprovalHistory;
