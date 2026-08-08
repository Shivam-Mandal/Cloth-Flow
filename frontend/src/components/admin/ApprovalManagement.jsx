import React, { useEffect, useState, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  Eye,
  User,
  Package,
  IndianRupee,
  X,
  CheckSquare,
  Square,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  MinusSquare,
  Check
} from 'lucide-react';
import {
  fetchPendingApprovals,
  approveSubOrder,
  rejectSubOrder,
  fetchBulkApprovalSummary,
  bulkApproveSubOrders,
  bulkRejectSubOrders
} from '../services/approvalServices';
import { toast } from 'react-toastify';
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';

const extractSizesFromPieces = (pieces, name) => {
  const sizes = new Set();
  const parseObj = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'number' && v > 0) {
        sizes.add(k);
      } else if (typeof v === 'object' && v !== null) {
        parseObj(v);
      }
    }
  };
  parseObj(pieces);

  if (sizes.size === 0 && typeof name === 'string') {
    const parts = name.split('-');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart && !/batch|suborder/i.test(lastPart)) {
        sizes.add(lastPart);
      }
    }
  }

  return sizes.size > 0 ? Array.from(sizes).join(', ') : '—';
};

const getStyleName = (item) => {
  return item?.styleName
    || item?.order?.style?.name
    || item?.order?.styleSnapshot?.name
    || item?.order?.styleName
    || item?.style
    || '—';
};

export const ApprovalManagement = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState({ fetch: false, action: false, summary: false });
  const [error, setError] = useState(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [backendSummary, setBackendSummary] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Single review modal state
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  // Bulk action modals
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  const loadPendingApprovals = async () => {
    setLoading(l => ({ ...l, fetch: true }));
    setError(null);
    try {
      const res = await fetchPendingApprovals();
      setPendingApprovals(res.approvals || []);
      // Reset selections that are no longer pending
      setSelectedIds(prev => prev.filter(id => (res.approvals || []).some(a => a._id === id)));
    } catch (e) {
      console.error('Failed to load pending approvals', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load approvals');
    } finally {
      setLoading(l => ({ ...l, fetch: false }));
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  // Fetch server-calculated summary whenever selectedIds changes
  useEffect(() => {
    let isMounted = true;
    if (selectedIds.length === 0) {
      setBackendSummary(null);
      return;
    }

    const loadSummary = async () => {
      setLoading(l => ({ ...l, summary: true }));
      try {
        const res = await fetchBulkApprovalSummary(selectedIds);
        if (isMounted && res.success) {
          setBackendSummary(res.summary);
        }
      } catch (err) {
        console.error('Error fetching bulk summary:', err);
        if (isMounted) {
          toast.error(err?.response?.data?.error || 'Failed to calculate backend summary');
        }
      } finally {
        if (isMounted) setLoading(l => ({ ...l, summary: false }));
      }
    };

    const timer = setTimeout(loadSummary, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedIds]);

  // Unique stage options for filtering
  const stageOptions = useMemo(() => {
    const set = new Set();
    pendingApprovals.forEach(item => {
      if (item.currentStage) set.add(item.currentStage);
    });
    return Array.from(set);
  }, [pendingApprovals]);

  // Filtered approvals list
  const filteredApprovals = useMemo(() => {
    return pendingApprovals.filter(item => {
      if (selectedStage !== 'all' && item.currentStage !== selectedStage) return false;
      if (selectedPriority !== 'all' && item.priority !== selectedPriority) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const subOrderCode = (item.subOrderCode || item.suborderCode || item.code || '').toLowerCase();
        const orderId = (item.orderId || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const workerName = (item.completedBy?.name || '').toLowerCase();
        return (
          subOrderCode.includes(query) ||
          orderId.includes(query) ||
          name.includes(query) ||
          workerName.includes(query)
        );
      }
      return true;
    });
  }, [pendingApprovals, selectedStage, selectedPriority, searchTerm]);

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems: paginatedApprovals,
    handlePageChange
  } = useClientPagination(filteredApprovals, 10);

  // Checkbox Selection Logic
  const visibleItemIds = useMemo(() => paginatedApprovals.map(item => item._id), [paginatedApprovals]);
  const isAllVisibleSelected = visibleItemIds.length > 0 && visibleItemIds.every(id => selectedIds.includes(id));
  const isSomeVisibleSelected = visibleItemIds.some(id => selectedIds.includes(id)) && !isAllVisibleSelected;

  const toggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleItemIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleItemIds])));
    }
  };

  const toggleSelectAllFiltered = () => {
    const allFilteredIds = filteredApprovals.map(item => item._id);
    if (selectedIds.length === allFilteredIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Single Item Handlers
  const handleSingleApprove = async (subOrderId) => {
    setLoading(l => ({ ...l, action: true }));
    try {
      await approveSubOrder(subOrderId);
      toast.success('SubOrder approved successfully');
      setSelectedApproval(null);
      setSelectedIds(prev => prev.filter(id => id !== subOrderId));
      await loadPendingApprovals();
    } catch (e) {
      console.error('Approval failed', e);
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Failed to approve');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const handleSingleReject = async (subOrderId) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setLoading(l => ({ ...l, action: true }));
    try {
      await rejectSubOrder(subOrderId, rejectReason);
      toast.success('SubOrder rejected and sent back to worker');
      setSelectedApproval(null);
      setRejectReason('');
      setSelectedIds(prev => prev.filter(id => id !== subOrderId));
      await loadPendingApprovals();
    } catch (e) {
      console.error('Rejection failed', e);
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Failed to reject');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  // Bulk Handlers (Core logic handled entirely on backend)
  const handleConfirmBulkApprove = async () => {
    if (selectedIds.length === 0) return;

    setLoading(l => ({ ...l, action: true }));
    try {
      const res = await bulkApproveSubOrders(selectedIds);
      if (res.success) {
        toast.success(res.message || `Successfully approved ${res.approvedCount} items`);
        setSelectedIds([]);
        setBackendSummary(null);
        setShowBulkApproveModal(false);
        await loadPendingApprovals();
      } else {
        toast.error(res.error || 'Bulk approval failed');
      }
    } catch (e) {
      console.error('Bulk approval failed', e);
      toast.error(e?.response?.data?.error || e?.message || 'Failed to process bulk approval');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const handleConfirmBulkReject = async () => {
    if (selectedIds.length === 0) return;
    if (!bulkRejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setLoading(l => ({ ...l, action: true }));
    try {
      const res = await bulkRejectSubOrders(selectedIds, bulkRejectReason);
      if (res.success) {
        toast.success(res.message || `Successfully rejected ${res.rejectedCount} items`);
        setSelectedIds([]);
        setBackendSummary(null);
        setBulkRejectReason('');
        setShowBulkRejectModal(false);
        await loadPendingApprovals();
      } else {
        toast.error(res.error || 'Bulk rejection failed');
      }
    } catch (e) {
      console.error('Bulk rejection failed', e);
      toast.error(e?.response?.data?.error || e?.message || 'Failed to process bulk rejection');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const getSubOrderCode = (approval) => {
    const val = approval?.subOrderCode || approval?.suborderCode || approval?.code;
    return val ? String(val) : '—';
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Approval Management</h1>
          <p className="text-sm text-slate-500 mt-1">Review, verify, and execute bulk approvals for completed work</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPendingApprovals}
            disabled={loading.fetch}
            className="p-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh pending list"
          >
            <RefreshCw className={`w-4 h-4 ${loading.fetch ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>
          <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold px-3 py-2 rounded-xl">
            {pendingApprovals.length} Pending Approvals
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{String(error)}</span>
          </div>
          <button onClick={loadPendingApprovals} className="text-xs font-bold underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* Selected Approvals Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-blue-800 animate-fadeIn space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-bold text-blue-300 text-lg">
                {selectedIds.length}
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                  <span>Selected Approvals</span>
            
                </h3>
                <p className="text-xs text-slate-300">
                  {backendSummary
                    ? `Total calculated payment: ₹${backendSummary.totalCalculatedPayment?.toLocaleString() || 0}`
                    : 'Calculating totals...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setShowBulkApproveModal(true)}
                disabled={loading.action || loading.summary}
                className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                View Detailed Summary & Approve ({selectedIds.length})
              </button>

              <button
                onClick={() => setShowBulkRejectModal(true)}
                disabled={loading.action || loading.summary}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200 font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4 text-red-400" />
                Reject Selected
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Quick Summary Grid */}
          {loading.summary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-pulse">
              <div className="bg-white/10 border border-white/10 p-2.5 rounded-xl backdrop-blur-xs space-y-2">
                <div className="h-3 bg-white/20 rounded-md w-20"></div>
                <div className="h-5 bg-emerald-400/40 rounded-md w-24"></div>
              </div>
              <div className="bg-white/10 border border-white/10 p-2.5 rounded-xl backdrop-blur-xs space-y-2">
                <div className="h-3 bg-white/20 rounded-md w-24"></div>
                <div className="h-5 bg-blue-300/40 rounded-md w-20"></div>
              </div>
              <div className="bg-white/10 border border-white/10 p-2.5 rounded-xl backdrop-blur-xs space-y-2">
                <div className="h-3 bg-white/20 rounded-md w-24"></div>
                <div className="h-5 bg-red-400/40 rounded-md w-16"></div>
              </div>
              <div className="bg-white/10 border border-white/10 p-2.5 rounded-xl backdrop-blur-xs space-y-2">
                <div className="h-3 bg-white/20 rounded-md w-24"></div>
                <div className="flex gap-1.5 pt-0.5">
                  <div className="h-4 bg-white/20 rounded-md w-12"></div>
                  <div className="h-4 bg-white/20 rounded-md w-12"></div>
                </div>
              </div>
            </div>
          ) : backendSummary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/10 border border-white/10 p-2.5 rounded-xl backdrop-blur-xs">
                <span className="text-slate-300 block text-[11px] mb-0.5">Total Payment</span>
                <div className="text-base sm:text-lg font-extrabold text-emerald-400 flex items-center gap-0.5">
                  <IndianRupee className="w-4 h-4" />
                  {backendSummary.totalCalculatedPayment?.toLocaleString() || 0}
                </div>
              </div>

              <div className="bg-white/10 border border-white/10 p-2.5 rounded-xl backdrop-blur-xs">
                <span className="text-slate-300 block text-[11px] mb-0.5">Approved Pieces</span>
                <div className="text-base sm:text-lg font-bold text-blue-300">
                  {backendSummary.totalApprovedPieces || 0} <span className="text-xs font-normal text-slate-300">/ {backendSummary.totalSubmittedPieces || 0}</span>
                </div>
              </div>

              <div className="bg-white/10 border border-white/10 p-2.5 rounded-xl backdrop-blur-xs">
                <span className="text-slate-300 block text-[11px] mb-0.5">Damaged Pieces</span>
                <div className="text-base sm:text-lg font-bold text-red-400">
                  {backendSummary.totalFaultyPieces || 0}
                  <span className="text-xs font-medium text-slate-300 ml-1">({backendSummary.overallDamageRate || 0}%)</span>
                </div>
              </div>

              <div className="bg-white/10 border border-white/10 p-2.5 rounded-xl backdrop-blur-xs">
                <span className="text-slate-300 block text-[11px] mb-0.5">Stage Breakdown</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {Object.entries(backendSummary.stageBreakdown || {}).map(([stage, count]) => (
                    <span key={stage} className="bg-white/15 px-2 py-0.5 rounded text-[10px] font-semibold text-white">
                      {stage}: {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by SubOrder ID, Order ID, Style, or Worker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs sm:text-sm outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Stages</option>
              {stageOptions.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Normal">Normal Priority</option>
            </select>
          </div>

          {/* Select All Filtered Shortcut */}
          <button
            onClick={toggleSelectAllFiltered}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {selectedIds.length === filteredApprovals.length && filteredApprovals.length > 0
              ? 'Deselect All'
              : `Select All (${filteredApprovals.length})`}
          </button>
        </div>
      </div>

      {/* Main Tabular View */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading.fetch ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-500">Loading pending approvals...</div>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="text-center py-12 px-4">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-bold text-slate-800">No Pending Approvals</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {pendingApprovals.length === 0
                ? 'All completed work has been reviewed and approved.'
                : 'No approvals match your current search and filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-4 w-10">
                    <button
                      onClick={toggleSelectAllVisible}
                      className="flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title={isAllVisibleSelected ? "Deselect visible" : "Select all visible"}
                    >
                      {isAllVisibleSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : isSomeVisibleSelected ? (
                        <MinusSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">SubOrder</th>
                  <th className="py-3.5 px-4">Style & Size</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">Completed By</th>
                  <th className="py-3.5 px-4 text-center">Pieces</th>
                  <th className="py-3.5 px-4 text-right">Est. Payment</th>
                  <th className="py-3.5 px-4">Priority / Date</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedApprovals.map(approval => {
                  const isSelected = selectedIds.includes(approval._id);
                  const subOrderCode = getSubOrderCode(approval);
                  const approvedPieces = Number(approval.approvedPieces) || 0;
                  const faultyPieces = Number(approval.faultyPieces) || 0;
                  const submittedPieces = Number(approval.submittedPieces) || (approvedPieces + faultyPieces);
                  const calculatedPayment = Number(approval.calculatedPayment) || 0;

                  return (
                    <tr
                      key={approval._id}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleSelectRow(approval._id)}
                          className="flex items-center justify-center text-slate-400 hover:text-blue-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* SubOrder */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs tracking-tight">
                          {subOrderCode}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                          ID: {approval.orderId}
                        </div>
                      </td>

                      {/* Style & Size */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          {getStyleName(approval)}
                        </div>
                        <div className="text-[11px] font-medium text-blue-700 mt-0.5">
                          Size: {extractSizesFromPieces(approval.pieces, approval.name)}
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-lg font-semibold text-[11px]">
                          {approval.currentStage}
                        </span>
                      </td>

                      {/* Completed By */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {approval.completedBy?.name || 'Unknown'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {approval.completedBy?.workerType || 'Worker'}
                        </div>
                      </td>

                      {/* Pieces Breakdown */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-900">
                          {approvedPieces} <span className="text-[10px] text-slate-400 font-normal">/ {submittedPieces}</span>
                        </div>
                        {faultyPieces > 0 && (
                          <span className="inline-block text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-0.5">
                            {faultyPieces} damaged
                          </span>
                        )}
                      </td>

                      {/* Estimated Payment */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-extrabold text-emerald-600 text-sm">
                          ₹{calculatedPayment.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ₹{approval.pricePerPiece || 0} / pc
                        </div>
                      </td>

                      {/* Priority / Date */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          approval.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {approval.priority || 'Normal'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(approval.updatedAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Actions - Quick Approval Button Removed as requested */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => {
                              setSelectedApproval(approval);
                              setRejectReason('');
                              setShowRejectionForm(false);
                            }}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Review details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-100">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            itemLabel="approvals"
          />
        </div>
      </div>

      {/* Single Item Review Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto relative border border-slate-100 flex flex-col space-y-3.5 sm:space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Work Review & Single Approval
              </h3>
              <button
                type="button"
                onClick={() => setSelectedApproval(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Combined Order & Worker Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Order Info */}
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                <h4 className="font-semibold text-xs text-slate-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  Order Info
                </h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Order ID</span>
                    <span className="font-semibold text-slate-900 truncate block">{selectedApproval.order?.orderId || selectedApproval.orderId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SubOrder ID</span>
                    <span className="font-semibold text-slate-900 truncate block">{getSubOrderCode(selectedApproval)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Style</span>
                    <span className="font-semibold text-slate-900 truncate block">{selectedApproval.order?.style?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Stage</span>
                    <span className="font-semibold text-blue-700 truncate block">{selectedApproval.currentStage}</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/60 pt-1 mt-0.5">
                    <span className="text-slate-500 inline-block text-[10px] mr-1">SubOrder:</span>
                    <span className="font-semibold text-slate-900 inline-block">{selectedApproval.name}</span>
                  </div>
                </div>
              </div>

              {/* Worker Info */}
              <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl">
                <h4 className="font-semibold text-xs text-blue-900 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Worker Info
                </h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Name</span>
                    <span className="font-semibold text-slate-900 truncate block">{selectedApproval.completedBy?.name || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Type</span>
                    <span className="font-semibold text-slate-900 truncate block">{selectedApproval.completedBy?.workerType || 'N/A'}</span>
                  </div>
                  <div className="col-span-2 border-t border-blue-100 pt-1 mt-0.5">
                    <span className="text-slate-500 block text-[10px]">Email</span>
                    <span className="font-semibold text-slate-900 truncate block">{selectedApproval.completedBy?.email || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Work Submission Details */}
            <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl">
              <h4 className="font-semibold text-xs text-emerald-900 mb-2 uppercase tracking-wider">Work Submission Details</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="text-center p-2 bg-white rounded-lg border border-emerald-100 shadow-2xs">
                  <div className="text-lg sm:text-xl font-bold text-blue-600">
                    {selectedApproval.submittedPieces || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Total Submitted</div>
                </div>
                <div className="text-center p-2 bg-white rounded-lg border border-emerald-100 shadow-2xs">
                  <div className="text-lg sm:text-xl font-bold text-emerald-600">{selectedApproval.approvedPieces || 0}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Completed Pieces</div>
                </div>
                <div className="text-center p-2 bg-white rounded-lg border border-emerald-100 shadow-2xs">
                  <div className="text-lg sm:text-xl font-bold text-red-600">{selectedApproval.faultyPieces || 0}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Damaged Pieces</div>
                </div>
                <div className="text-center p-2 bg-white rounded-lg border border-emerald-100 shadow-2xs">
                  <div className="text-base sm:text-lg font-bold text-slate-700">
                    {selectedApproval.submittedPieces > 0 && selectedApproval.faultyPieces > 0
                      ? `${((selectedApproval.faultyPieces / selectedApproval.submittedPieces) * 100).toFixed(1)}%`
                      : '0%'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Damage Rate</div>
                </div>
              </div>
            </div>

            {/* Payment Calculation */}
            <div className="bg-amber-50/70 border border-amber-200/70 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <IndianRupee className="w-3.5 h-3.5 text-amber-600" />
                  Payment Calculation (Backend Auto-Calculated)
                </h4>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs items-center bg-white p-2 rounded-lg border border-amber-100">
                <div>
                  <span className="text-slate-500 block text-[10px]">Rate ({selectedApproval.currentStage})</span>
                  <span className="font-bold text-slate-900">₹{selectedApproval.pricePerPiece || 0} / pc</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Calculation</span>
                  <span className="font-medium text-slate-700">{selectedApproval.approvedPieces || 0} × ₹{selectedApproval.pricePerPiece || 0}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Total Payment</span>
                  <span className="font-extrabold text-sm sm:text-base text-emerald-600">₹{selectedApproval.calculatedPayment || 0}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 pt-3">
              {!showRejectionForm ? (
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                    <button
                      type="button"
                      onClick={() => handleSingleApprove(selectedApproval._id)}
                      disabled={loading.action}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {loading.action ? 'Processing...' : 'Approve & Process Payment'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRejectionForm(true)}
                      disabled={loading.action}
                      className="border border-red-200 hover:border-red-300 text-red-600 bg-red-50/50 hover:bg-red-50 py-2.5 px-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject...
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedApproval(null)}
                    disabled={loading.action}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="bg-red-50/40 border border-red-100 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-red-800 font-semibold text-xs uppercase tracking-wider">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Provide Rejection Reason
                  </div>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Describe why work is being rejected..."
                    className="w-full border border-slate-200 focus:border-red-400 rounded-xl p-2.5 text-xs outline-none resize-none bg-white"
                    rows="2"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectionForm(false);
                        setRejectReason('');
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSingleReject(selectedApproval._id)}
                      disabled={loading.action || !rejectReason.trim()}
                      className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {loading.action ? 'Processing...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* DETAILED APPROVAL SUMMARY & FINAL CONFIRMATION MODAL */}
      {showBulkApproveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 md:p-5">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
            
            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg font-bold flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span>Approval Summary & Final Verification</span>
                    <span className="text-[10px] uppercase tracking-wider bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 font-semibold">
                      {selectedIds.length} Orders
                    </span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                    Review each order's details and financials before confirming final approval.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkApproveModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-3 sm:p-6 overflow-y-auto space-y-4">
              
              {/* Aggregated Totals Grid */}
              {backendSummary ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
                  <div className="bg-emerald-50 border border-emerald-200/80 p-2.5 sm:p-3 rounded-xl">
                    <span className="text-slate-600 block text-[10px] sm:text-[11px] font-medium mb-0.5">Total Payment</span>
                    <div className="text-base sm:text-xl font-extrabold text-emerald-700 flex items-center gap-0.5">
                      <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {backendSummary.totalCalculatedPayment?.toLocaleString() || 0}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200/80 p-2.5 sm:p-3 rounded-xl">
                    <span className="text-slate-600 block text-[10px] sm:text-[11px] font-medium mb-0.5">Total Approved Pieces</span>
                    <div className="text-base sm:text-xl font-bold text-blue-800">
                      {backendSummary.totalApprovedPieces || 0} <span className="text-xs font-normal text-slate-500">/ {backendSummary.totalSubmittedPieces || 0}</span>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200/80 p-2.5 sm:p-3 rounded-xl">
                    <span className="text-slate-600 block text-[10px] sm:text-[11px] font-medium mb-0.5">Damaged Pieces</span>
                    <div className="text-base sm:text-xl font-bold text-red-700">
                      {backendSummary.totalFaultyPieces || 0}
                      <span className="text-xs font-semibold text-red-600 ml-1">({backendSummary.overallDamageRate || 0}%)</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3 rounded-xl">
                    <span className="text-slate-600 block text-[10px] sm:text-[11px] font-medium mb-0.5">Breakdown</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {Object.entries(backendSummary.stageBreakdown || {}).map(([stage, count]) => (
                        <span key={stage} className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                          {stage}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs animate-pulse">
                  <div className="bg-emerald-50/60 border border-emerald-200/60 p-2.5 sm:p-3 rounded-xl space-y-2">
                    <div className="h-3 bg-emerald-200/60 rounded-md w-20"></div>
                    <div className="h-5 bg-emerald-300/60 rounded-md w-24"></div>
                  </div>
                  <div className="bg-blue-50/60 border border-blue-200/60 p-2.5 sm:p-3 rounded-xl space-y-2">
                    <div className="h-3 bg-blue-200/60 rounded-md w-24"></div>
                    <div className="h-5 bg-blue-300/60 rounded-md w-20"></div>
                  </div>
                  <div className="bg-red-50/60 border border-red-200/60 p-2.5 sm:p-3 rounded-xl space-y-2">
                    <div className="h-3 bg-red-200/60 rounded-md w-24"></div>
                    <div className="h-5 bg-red-300/60 rounded-md w-16"></div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-3 rounded-xl space-y-2">
                    <div className="h-3 bg-slate-200 rounded-md w-24"></div>
                    <div className="flex gap-1.5 pt-0.5">
                      <div className="h-4 bg-slate-200 rounded-md w-12"></div>
                      <div className="h-4 bg-slate-200 rounded-md w-12"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Itemized SubOrders Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-600" />
                    Itemized Order Breakdown ({selectedIds.length} SubOrders)
                  </h4>
                </div>

                {/* Mobile View Cards (< 768px screens) */}
                <div className="block md:hidden space-y-2">
                  {backendSummary?.items?.map((item) => (
                    <div key={item._id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                            {item.subOrderCode || item.name}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded font-semibold text-[10px]">
                            {item.stage}
                          </span>
                        </div>
                        <div className="font-extrabold text-emerald-600 text-sm">
                          ₹{item.calculatedPayment?.toLocaleString() || 0}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Order ID</span>
                          <span className="font-semibold text-slate-800 truncate block">{item.orderId || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Worker</span>
                          <span className="font-semibold text-slate-800 truncate block">{item.workerName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Style</span>
                          <span className="font-semibold text-slate-800 truncate block">{item.styleName || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Size(s)</span>
                          <span className="font-semibold text-blue-700 truncate block">{item.size || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Pieces (Appr / Sub)</span>
                          <span className="font-bold text-slate-900">
                            <span className="text-emerald-600">{item.approvedPieces}</span> / {item.submittedPieces}
                            {item.faultyPieces > 0 && <span className="text-red-600 font-normal"> ({item.faultyPieces} dmg)</span>}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Rate</span>
                          <span className="font-semibold text-slate-700">₹{item.pricePerPiece || 0} / pc</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Data Table (>= 768px screens) */}
                <div className="hidden md:block border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3">SubOrder Code</th>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Style</th>
                        <th className="py-2.5 px-3">Size(s)</th>
                        <th className="py-2.5 px-3">Stage</th>
                        <th className="py-2.5 px-3">Worker</th>
                        <th className="py-2.5 px-3 text-center">Pieces (Appr/Sub/Dmg)</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3 text-right">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {backendSummary?.items?.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {item.subOrderCode || item.name}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-600">
                            {item.orderId || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {item.styleName || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-blue-700">
                            {item.size || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded font-semibold text-[10px]">
                              {item.stage}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {item.workerName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-900">
                            <span className="text-emerald-600 font-bold">{item.approvedPieces}</span>
                            <span className="text-slate-400 font-normal"> / {item.submittedPieces}</span>
                            {item.faultyPieces > 0 && (
                              <span className="text-red-600 text-[10px] ml-1">({item.faultyPieces} dmg)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                            ₹{item.pricePerPiece || 0}/pc
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600">
                            ₹{item.calculatedPayment?.toLocaleString() || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informational Alert */}
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[11px] uppercase tracking-wider mb-0.5">Important Workflow Action</span>
                  <span>
                    Confirming this approval will immediately update the status of all {selectedIds.length} suborders, log approval history records, credit total worker payments (₹{backendSummary?.totalCalculatedPayment?.toLocaleString() || 0}), and trigger next stage suborders automatically.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkApproveModal(false)}
                disabled={loading.action}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmBulkApprove}
                disabled={loading.action || !backendSummary}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {loading.action ? 'Processing Bulk Approval...' : `Confirm Final Approval (${selectedIds.length} Orders)`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BULK REJECTION MODAL */}
      {showBulkRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Bulk Rejection Confirmation
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkRejectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                You are about to reject <span className="font-bold text-red-600">{selectedIds.length} suborders</span>. These tasks will be returned to assigned workers for revision.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={bulkRejectReason}
                  onChange={(e) => setBulkRejectReason(e.target.value)}
                  placeholder="Enter reason for bulk rejection (e.g., quality inspection failed for batch)..."
                  className="w-full border border-slate-200 focus:border-red-500 rounded-xl p-3 text-xs outline-none resize-none bg-slate-50"
                  rows="3"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowBulkRejectModal(false);
                  setBulkRejectReason('');
                }}
                disabled={loading.action}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmBulkReject}
                disabled={loading.action || !bulkRejectReason.trim()}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                {loading.action ? 'Processing Rejection...' : 'Confirm Bulk Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalManagement;
