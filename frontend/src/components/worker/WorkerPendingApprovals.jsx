import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle, RotateCw } from 'lucide-react';
import { fetchWorkerPendingApprovals } from '../services/approvalServices';
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';

export const WorkerPendingApprovals = () => {
  const [pendingWork, setPendingWork] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPendingWork = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorkerPendingApprovals();
      setPendingWork(res.approvals || []);
    } catch (e) {
      console.error('Failed to load pending approvals', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingWork();

    const handleGlobalRefresh = () => {
      loadPendingWork();
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('app:refresh', handleGlobalRefresh);
  }, []);

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems,
    handlePageChange
  } = useClientPagination(pendingWork, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-600 mt-1">Work submitted for admin review</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadPendingWork}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="text-sm text-gray-600">{pendingWork.length} pending</div>
        </div>
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
            {paginatedItems.map(item => (
              <div key={item._id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{item.name}</h4>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Awaiting Approval
                      </span>
                      <span className="ml-auto text-lg font-bold text-green-600">₹{item.calculatedPayment ?? item.amount ?? 0}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Order ID:</span> {item.order?.orderId || item.orderId}
                      </div>
                      <div>
                        <span className="font-medium">Stage:</span> {item.currentStage}
                      </div>
                      <div>
                        <span className="font-medium">Completed:</span> {item.approvedPieces || 0}
                      </div>
                      <div>
                        <span className="font-medium">Submitted:</span> {new Date(item.updatedAt).toLocaleDateString()}
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

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          itemLabel="pending approvals"
        />
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
