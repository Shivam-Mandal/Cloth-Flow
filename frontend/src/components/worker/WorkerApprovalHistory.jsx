import React, { useEffect, useState } from 'react';
import { History, CheckCircle, XCircle, Clock, TrendingUp, RotateCw } from 'lucide-react';
import { fetchWorkerApprovalHistory } from '../services/approvalServices';
import { toast } from 'react-toastify';
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

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <span className="font-medium">SubOrder:</span> {item.metadata?.subOrderName || item.subOrder?.name}
                        </div>
                        <div>
                          <span className="font-medium">Order ID:</span> {item.metadata?.orderId || item.order?.orderId}
                        </div>
                        <div>
                          <span className="font-medium">Stage:</span> {item.metadata?.stage}
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

                      <div className="text-sm text-gray-500">
                        <strong>By:</strong> {item.actor?.name} ({item.actorRole})
                      </div>
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
    </div>
  );
};

export default WorkerApprovalHistory;