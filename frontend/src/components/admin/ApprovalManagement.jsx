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
    } catch (e) {
      return 0;
    }
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
        <div className="fixed inset-0 bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 shadow-2xl">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedApproval(null)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Work Review & Approval
            </h3>

            {/* Order Information */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Order Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Order ID:</span>
                  <div className="font-medium">{selectedApproval.order?.orderId || selectedApproval.orderId}</div>
                </div>
                <div>
                  <span className="text-gray-600">SubOrder ID:</span>
                  <div className="font-medium">{getSubOrderCode(selectedApproval)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Style:</span>
                  <div className="font-medium">{selectedApproval.order?.style?.name || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Stage:</span>
                  <div className="font-medium">{selectedApproval.currentStage}</div>
                </div>
                <div>
                  <span className="text-gray-600">SubOrder:</span>
                  <div className="font-medium">{selectedApproval.name}</div>
                </div>
              </div>
            </div>

            {/* Worker Information */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Worker Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <div className="font-medium">{selectedApproval.completedBy?.name || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <div className="font-medium">{selectedApproval.completedBy?.workerType || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <div className="font-medium">{selectedApproval.completedBy?.email || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Work Submission Details */}
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium mb-3">Work Submission Details</h4>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-2xl font-bold text-blue-600">
                    {computePiecesTotal(selectedApproval.pieces)}
                  </div>
                  <div className="text-sm text-gray-600">Total Submitted</div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-2xl font-bold text-green-600">{selectedApproval.approvedPieces || 0}</div>
                  <div className="text-sm text-gray-600">Completed Pieces</div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-2xl font-bold text-red-600">{selectedApproval.faultyPieces || 0}</div>
                  <div className="text-sm text-gray-600">Damaged Pieces</div>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-lg font-bold text-gray-600">
                    {(() => {
                      const totalSubmitted = computePiecesTotal(selectedApproval.pieces);
                      return selectedApproval.faultyPieces > 0 && totalSubmitted > 0
                        ? `${((selectedApproval.faultyPieces / totalSubmitted) * 100).toFixed(1)}%`
                        : '0%';
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">Damage Rate</div>
                </div>
              </div>
            </div>

            {/* Payment Calculation */}
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                Payment Calculation (Auto-Calculated)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Price per Piece ({selectedApproval.currentStage}):</span>
                  <div className="font-bold text-lg">₹{selectedApproval.pricePerPiece || 0}</div>
                </div>
                <div>
                  <span className="text-gray-600">Calculation:</span>
                  <div className="font-medium">{selectedApproval.approvedPieces || 0} × ₹{selectedApproval.pricePerPiece || 0}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Payment:</span>
                  <div className="font-bold text-xl text-green-600">₹{selectedApproval.calculatedPayment || 0}</div>
                </div>
              </div>
              <div className="mt-3 p-3 bg-white rounded border border-yellow-200">
                <div className="text-sm text-yellow-800">
                  💡 This amount will be automatically added to the worker's account upon approval
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t pt-6">
              {!showRejectionForm ? (
                <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedApproval._id)}
                      disabled={loading.action}
                      className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-sm transition-colors w-full sm:w-auto cursor-pointer"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {loading.action ? 'Processing...' : 'Approve & Process Payment'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRejectionForm(true)}
                      disabled={loading.action}
                      className="border border-red-200 hover:border-red-300 text-red-600 bg-red-50/50 hover:bg-red-50 py-3 px-6 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition-colors w-full sm:w-auto cursor-pointer"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject Work...
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedApproval(null)}
                    disabled={loading.action}
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors w-full sm:w-auto text-center cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="bg-red-50/30 border border-red-100 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 text-red-800 font-semibold text-base">
                    <XCircle className="w-5 h-5 text-red-600" />
                    Provide Rejection Details
                  </div>
                  
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Describe why the work is being rejected (e.g. faulty stitches, wrong size)..."
                    className="w-full border border-gray-300 focus:border-red-400 focus:ring-1 focus:ring-red-400 rounded-lg p-3 outline-none resize-none bg-white transition-shadow shadow-sm"
                    rows="3"
                  />

                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectionForm(false);
                        setRejectReason('');
                      }}
                      disabled={loading.action}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg disabled:opacity-50 transition-colors order-2 sm:order-1 text-center cursor-pointer"
                    >
                      Back to Options
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedApproval._id)}
                      disabled={loading.action || !rejectReason.trim()}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2 order-1 sm:order-2 text-center cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
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
