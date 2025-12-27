import React, { useEffect, useState } from 'react';
import { History, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { fetchApprovalHistory } from '../services/approvalServices';
import { toast } from 'react-toastify';

export const ApprovalHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const res = await fetchApprovalHistory(params);
      setHistory(res.history || []);
      setPagination(res.pagination);
    } catch (e) {
      console.error('Failed to load approval history', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [filters]);

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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approval History</h1>
          <p className="text-gray-600 mt-1">Complete audit trail of all approval actions</p>
        </div>
        <div className="text-sm text-gray-600">{pagination?.total || 0} total actions</div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex gap-4">
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Actions</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{String(error)}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-sm text-gray-500">Loading history...</div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No approval history found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map(item => (
              <div key={item._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getActionIcon(item.action)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getActionColor(item.action)}`}>
                          {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <span className="font-medium">SubOrder:</span> {item.metadata?.subOrderName || item.subOrder?.name}
                        </div>
                        <div>
                          <span className="font-medium">Order ID:</span> {item.metadata?.orderId || item.order?.orderId}
                        </div>
                        <div>
                          <span className="font-medium">Stage:</span> {item.metadata?.stage}
                        </div>
                        <div>
                          <span className="font-medium">Actor:</span> {item.actor?.name} ({item.actorRole})
                        </div>
                      </div>

                      {item.amount > 0 && (
                        <div className="text-sm text-green-600 font-medium mb-2">
                          Payment Amount: ₹{item.amount.toFixed(2)}
                        </div>
                      )}

                      {item.reason && (
                        <div className="text-sm text-red-600 mb-2">
                          <strong>Reason:</strong> {item.reason}
                        </div>
                      )}

                      {item.notes && (
                        <div className="text-sm text-gray-500">
                          <strong>Notes:</strong> {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalHistory;