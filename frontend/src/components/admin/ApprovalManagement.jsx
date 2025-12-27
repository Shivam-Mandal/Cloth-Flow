import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react';
import {
  fetchPendingApprovals,
  approveSubOrder,
  rejectSubOrder
} from '../services/approvalServices';
import { toast } from 'react-toastify';

export const ApprovalManagement = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState({ fetch: false, action: false });
  const [error, setError] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [amount, setAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');

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

  const handleApprove = async (subOrderId) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(l => ({ ...l, action: true }));
    try {
      await approveSubOrder(subOrderId, parseFloat(amount));
      toast.success('SubOrder approved successfully');
      setSelectedApproval(null);
      setAmount('');
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
    setAmount('');
    setRejectReason('');
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
            {pendingApprovals.map(approval => (
              <div key={approval._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{approval.name}</h3>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        {approval.currentStage}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Order ID:</span> {approval.orderId}
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

                  <div className="flex gap-2">
                    <button
                      onClick={() => openApprovalModal(approval)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2"
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
      </div>

      {/* Approval Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Review SubOrder</h3>

            <div className="mb-6">
              <h4 className="font-medium mb-2">{selectedApproval.name}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>Order ID: {selectedApproval.orderId}</div>
                <div>Stage: {selectedApproval.currentStage}</div>
                <div>Progress: {selectedApproval.progress}%</div>
                <div>Completed By: {selectedApproval.completedBy?.name || 'Unknown'}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (₹)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10 w-full border border-gray-300 rounded-md shadow-sm p-3"
                    placeholder="Enter payment amount"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Decision</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedApproval._id)}
                    disabled={loading.action || !amount}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve & Pay
                  </button>

                  <div className="flex-1">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="w-full border border-gray-300 rounded-md shadow-sm p-3 mb-2"
                      rows="2"
                    />
                    <button
                      onClick={() => handleReject(selectedApproval._id)}
                      disabled={loading.action || !rejectReason.trim()}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedApproval(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalManagement;