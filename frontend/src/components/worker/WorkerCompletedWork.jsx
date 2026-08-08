import React, { useEffect, useState } from 'react';
import { CheckCircle, IndianRupee, Calendar, TrendingUp, RotateCw } from 'lucide-react';
import { fetchWorkerCompletedWork } from '../services/approvalServices';
import { toast } from 'react-toastify';
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';

export const WorkerCompletedWork = () => {
  const [completedWork, setCompletedWork] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    workCount: 0,
    averagePerTask: 0
  });

  const loadCompletedWork = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorkerCompletedWork();
      setCompletedWork(res.completedWork || []);
      setStats({
        totalEarnings: res.totalEarnings || 0,
        workCount: res.workCount || 0,
        averagePerTask: res.workCount > 0 ? (res.totalEarnings || 0) / res.workCount : 0
      });
    } catch (e) {
      console.error('Failed to load completed work', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load completed work');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompletedWork();

    const handleGlobalRefresh = () => {
      loadCompletedWork();
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
  } = useClientPagination(completedWork, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Completed Work</h1>
          <p className="text-gray-600 mt-1">Approved work and earnings</p>
        </div>
        <button
          type="button"
          onClick={loadCompletedWork}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <IndianRupee className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{stats.totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Completed Tasks</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.workCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Average per Task</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{stats.averagePerTask.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{String(error)}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-sm text-gray-500">Loading completed work...</div>
          </div>
        ) : completedWork.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No completed work yet</p>
            <p className="text-sm text-gray-500 mt-1">Your approved work will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Work History</h3>
            {paginatedItems.map(work => (
              <div key={work._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{work.name}</h4>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Approved
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Order ID:</span> {work.orderId}
                      </div>
                      <div>
                        <span className="font-medium">Stage:</span> {work.currentStage}
                      </div>
                      <div>
                        <span className="font-medium">Progress:</span> {work.progress}%
                      </div>
                      <div>
                        <span className="font-medium">Approved:</span> {work.approvedAt ? new Date(work.approvedAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">₹{work.amount?.toFixed(2) || '0.00'}</div>
                    <div className="text-sm text-gray-500">Payment</div>
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
          itemLabel="completed tasks"
        />
      </div>

      <div className="flex justify-center">
        <button
          onClick={loadCompletedWork}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default WorkerCompletedWork;
