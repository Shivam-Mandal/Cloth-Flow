import React, { useEffect, useState, useCallback } from 'react';
import { Users, Award, AlertTriangle, Wallet, Search, RotateCw, Shield, ChevronRight, X, CheckCircle, Package } from 'lucide-react';
import { fetchWorkerPerformance } from '../services/workerService';
import { toast } from 'react-toastify';

export const WorkerPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    activeWorkers: 0,
    totalWorkers: 0,
    totalPieces: 0,
    totalDamagedPieces: 0,
    totalPayout: 0
  });
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedWorker, setSelectedWorker] = useState(null);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchWorkerPerformance();
      if (res.success) {
        setSummary(res.summary || {});
        setWorkers(res.workers || []);
      }
    } catch (err) {
      console.error("Failed to load worker performance:", err);
      toast.error(err?.message || "Failed to load worker performance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      loadData(true);
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('app:refresh', handleGlobalRefresh);
  }, [loadData]);

  const handleRefresh = () => {
    loadData(true);
  };

  const departments = Array.from(new Set(workers.map(w => w.department).filter(Boolean)));

  const filteredWorkers = workers.filter(worker => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (worker.name || '').toLowerCase().includes(term) ||
      (worker.email || '').toLowerCase().includes(term) ||
      (worker.department || '').toLowerCase().includes(term) ||
      (String(worker.id || '')).toLowerCase().includes(term);

    const matchesDepartment = selectedDepartment === 'all' || worker.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'break': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'offline': return 'bg-slate-100 text-slate-700 border border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Worker Performance</h1>
          <p className="text-sm text-slate-600 mt-1">Real-time task tracking, productivity metrics, and payout summaries</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">Active Workers</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {summary.activeWorkers} <span className="text-xs font-normal text-slate-500">/ {summary.totalWorkers || workers.length}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">Total Completed Pieces</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{(summary.totalPieces || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">Total Damaged Pieces</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{(summary.totalDamagedPieces || 0).toLocaleString()} pcs</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">Total Payout</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                ₹{(summary.totalPayout || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Worker Task & Performance Details</h3>
              <p className="text-xs sm:text-sm text-slate-500">Click any worker row to inspect assigned active tasks</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search worker name, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3.5">Worker</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Pieces Completed</th>
                <th className="px-6 py-3.5">Damaged Pieces</th>
                <th className="px-6 py-3.5">Active Tasks</th>
                <th className="px-6 py-3.5">Total Salary / Payout</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 w-44 bg-slate-200 rounded-xl" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-12 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-200 rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-6 w-16 bg-slate-200 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No workers found matching specified criteria.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => {
                  const initials = (worker.name || 'W')
                    .split(' ')
                    .filter(Boolean)
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr
                      key={worker.id}
                      onClick={() => setSelectedWorker(worker)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold rounded-xl flex items-center justify-center shadow-xs text-xs">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{worker.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{worker.email || `ID: ${String(worker.id).slice(-6)}`}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg">
                          {worker.department}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-900">{worker.piecesCompleted.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 ml-1">pcs</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg ${
                          worker.damagedPieces > 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {worker.damagedPieces} pcs
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg ${
                          worker.activeTasksCount > 0 ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Package className="w-3.5 h-3.5" />
                          {worker.activeTasksCount} Active
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-900">₹{(worker.salary || 0).toLocaleString()}</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(worker.status)}`}>
                          {worker.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorker(worker);
                          }}
                          className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors gap-0.5"
                        >
                          Details <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worker Task Details Modal / Drawer */}
      {selectedWorker && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end transition-all">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600 text-white font-bold text-base rounded-2xl flex items-center justify-center shadow-md">
                  {(selectedWorker.name || 'W').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedWorker.name}</h3>
                  <p className="text-xs text-slate-500">{selectedWorker.department} Worker • {selectedWorker.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorker(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Pieces Completed</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{selectedWorker.piecesCompleted.toLocaleString()} pcs</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Total Payout</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">₹{(selectedWorker.salary || 0).toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Damaged Pieces</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{selectedWorker.damagedPieces} pcs</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Active Tasks</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{selectedWorker.activeTasksCount}</p>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Permissions & Settings</h4>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    selectedWorker.permissions?.autoApprove ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    <Shield className="w-3.5 h-3.5" />
                    Auto Approve: {selectedWorker.permissions?.autoApprove ? 'ON' : 'OFF'}
                  </span>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    selectedWorker.permissions?.increasePieces ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    <Shield className="w-3.5 h-3.5" />
                    Increase Pcs: {selectedWorker.permissions?.increasePieces ? 'YES' : 'NO'}
                  </span>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    selectedWorker.permissions?.allowMultipleClaims ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    <Shield className="w-3.5 h-3.5" />
                    Multiple Claims: {selectedWorker.permissions?.allowMultipleClaims ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>

              {/* Active Task Details */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Currently Assigned Tasks ({selectedWorker.activeTaskDetails?.length || 0})
                </h4>

                {(!selectedWorker.activeTaskDetails || selectedWorker.activeTaskDetails.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No active tasks assigned</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Worker is available for new assignments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedWorker.activeTaskDetails.map((task) => (
                      <div key={task.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                            {task.subOrderCode}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            {task.assignedAt ? new Date(task.assignedAt).toLocaleDateString() : ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-700">
                          <div>
                            <span className="font-semibold text-slate-900">{task.styleName}</span>
                            <span className="text-slate-400 mx-1.5">•</span>
                            <span className="text-slate-600">Stage: {task.stage}</span>
                          </div>
                          <span className="font-bold text-slate-900">{task.pieces} pcs</span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono">
                          Order ID: {task.orderId}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedWorker(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
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
