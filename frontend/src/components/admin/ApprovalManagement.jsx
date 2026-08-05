import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, User, Package, IndianRupee, X } from 'lucide-react';
import {
  fetchPendingApprovals,
  approveSubOrder,
  rejectSubOrder
} from '../services/approvalServices';
import { toast } from 'react-toastify';
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';

export const ApprovalManagement = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState({ fetch: false, action: false });
  const [error, setError] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const loadPendingApprovals = async () => {
    setLoading(l => ({ ...l, fetch: true }));
    setError(null);
    try {
      const res = await fetchPendingApprovals();
      setPendingApprovals(res.approvals || []);
    } catch (e) {
      console.error('Failed to load pending approvals', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load approvals');
    } finally {
      setLoading(l => ({ ...l, fetch: false }));
    }
  };

  useEffect(() => { loadPendingApprovals(); }, []);

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems: paginatedApprovals,
    handlePageChange
  } = useClientPagination(pendingApprovals, 6);

  const handleApprove = async (subOrderId) => {
    setLoading(l => ({ ...l, action: true }));
    try {
      await approveSubOrder(subOrderId); // No amount needed - auto-calculated
      toast.success('SubOrder approved and payment processed automatically');
      setSelectedApproval(null);
      await loadPendingApprovals();
    } catch (e) {
      console.error('Approval failed', e);
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Failed to approve');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const handleReject = async (subOrderId) => {
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
      await loadPendingApprovals();
    } catch (e) {
      console.error('Rejection failed', e);
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Failed to reject');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const openApprovalModal = (approval) => {
    setSelectedApproval(approval);
    setRejectReason('');
    setShowRejectionForm(false);
  };

  const getSubOrderCode = (approval) => {
    const val = approval?.subOrderCode || approval?.suborderCode || approval?.code;
    return val ? String(val) : '—';
  };

  const computePiecesTotal = (pieces) => {
    try {
      let total = 0;
      if (!pieces || typeof pieces !== 'object') return 0;
      for (const color of Object.keys(pieces)) {
        const sizes = pieces[color] || {};
        if (typeof sizes === 'number') {
          total += Number(sizes) || 0;
        } else if (sizes && typeof sizes === 'object') {
          for (const size of Object.keys(sizes)) {
            total += Number(sizes[size]) || 0;
          }
        }
      }
      return total;
    } catch {
      return 0;
    }
  };

  const getSubmittedPiecesTotal = (approval) => {
    const completedPieces = Number(approval?.approvedPieces) || 0;
    if (completedPieces > 0) return completedPieces;

    const submittedPieces = Number(approval?.submittedPieces);
    if (Number.isFinite(submittedPieces) && submittedPieces > 0) {
      const damagedPieces = Number(approval?.faultyPieces) || 0;
      return Math.max(0, submittedPieces - damagedPieces);
    }

    return computePiecesTotal(approval?.pieces);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approval Management</h1>
          <p className="text-gray-600 mt-1">Review and approve completed work</p>
        </div>
        <div className="text-sm text-gray-600">{pendingApprovals.length} pending approvals</div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{String(error)}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {loading.fetch ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-sm text-gray-500">Loading pending approvals...</div>
          </div>
        ) : pendingApprovals.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">No pending approvals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedApprovals.map(approval => (
              <div key={approval._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{approval.name}</h3>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        {approval.currentStage}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Order ID:</span> {approval.orderId}
                      </div>
                      <div>
                        <span className="font-medium">SubOrder ID:</span> {getSubOrderCode(approval)}
                      </div>
                      <div>
                        <span className="font-medium">Progress:</span> {approval.progress}%
                      </div>
                      <div>
                        <span className="font-medium">Completed By:</span> {approval.completedBy?.name || 'Unknown'}
                      </div>
                      <div>
                        <span className="font-medium">Submitted:</span> {new Date(approval.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      Priority: <span className={`px-2 py-1 rounded text-xs ${
                        approval.priority === 'High' ? 'bg-red-100 text-red-800' :
                        approval.priority === 'Normal' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{approval.priority}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => openApprovalModal(approval)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          itemLabel="approvals"
        />
      </div>

      {/* Approval Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto relative border border-slate-100 flex flex-col space-y-3.5 sm:space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Work Review & Approval
              </h3>
              <button
                type="button"
                onClick={() => setSelectedApproval(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close modal"
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
                    {getSubmittedPiecesTotal(selectedApproval)}
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
                    {(() => {
                      const totalSubmitted = getSubmittedPiecesTotal(selectedApproval);
                      return selectedApproval.faultyPieces > 0 && totalSubmitted > 0
                        ? `${((selectedApproval.faultyPieces / totalSubmitted) * 100).toFixed(1)}%`
                        : '0%';
                    })()}
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
                  Payment Calculation (Auto-Calculated)
                </h4>
                <span className="text-[10px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md font-medium">
                  💡 Auto-added on approval
                </span>
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

            {/* Action Buttons */}
            <div className="border-t border-slate-100 pt-3">
              {!showRejectionForm ? (
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedApproval._id)}
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
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
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
                    placeholder="Describe why work is being rejected (e.g. faulty stitches)..."
                    className="w-full border border-slate-200 focus:border-red-400 rounded-xl p-2.5 text-xs outline-none resize-none bg-white shadow-2xs"
                    rows="2"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectionForm(false);
                        setRejectReason('');
                      }}
                      disabled={loading.action}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedApproval._id)}
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
    </div>
  );
};

export default ApprovalManagement;
