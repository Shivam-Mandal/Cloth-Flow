import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { fetchAssignedForMe } from '../services/assignmentServices';

export const WorkerPendingApprovals = () => {
  const [pendingWork, setPendingWork] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPendingWork = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all assigned work and filter for completed assignments where suborder is pending approval
      const res = await fetchAssignedForMe();
      const assignments = Array.isArray(res) ? res : (res?.assignments ?? []);

      // Filter for completed assignments
      const completedAssignments = assignments.filter(a => a.status === 'completed');

      // Group by suborder and check status
      const subOrderMap = new Map();

      for (const assignment of completedAssignments) {
        if (assignment.subOrder) {
          const subOrderId = assignment.subOrder._id || assignment.subOrder;
          if (!subOrderMap.has(subOrderId)) {
            subOrderMap.set(subOrderId, {
              subOrder: assignment.subOrder,
              assignments: [],
              order: assignment.order
            });
          }
          subOrderMap.get(subOrderId).assignments.push(assignment);
        }
      }

      // Filter suborders that are pending approval
      const pendingSubOrders = Array.from(subOrderMap.values()).filter(
        item => item.subOrder.status === 'pending_approval'
      );

      setPendingWork(pendingSubOrders);
    } catch (e) {
      console.error('Failed to load pending approvals', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPendingWork(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-600 mt-1">Work submitted for admin review</p>
        </div>
        <div className="text-sm text-gray-600">{pendingWork.length} pending</div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{String(error)}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-sm text-gray-500">Loading pending approvals...</div>
          </div>
        ) : pendingWork.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No work pending approval</p>
            <p className="text-sm text-gray-500 mt-1">Completed work awaiting admin review will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingWork.map(item => (
              <div key={item.subOrder._id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{item.subOrder.name}</h4>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Awaiting Approval
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Order ID:</span> {item.subOrder.orderId}
                      </div>
                      <div>
                        <span className="font-medium">Stage:</span> {item.subOrder.currentStage}
                      </div>
                      <div>
                        <span className="font-medium">Assignments:</span> {item.assignments.length}
                      </div>
                      <div>
                        <span className="font-medium">Submitted:</span> {new Date(item.subOrder.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      <strong>Note:</strong> Your work has been submitted and is waiting for admin approval.
                      Once approved, you'll receive payment and the next stage will begin.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={loadPendingWork}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default WorkerPendingApprovals;