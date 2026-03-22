// src/components/AssignedTasks.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, Clock, Play, Pause } from 'lucide-react';
import {
  fetchAssignedForMe,
  releaseAssignment,
  completeAssignment,
  patchAssignment
} from '../services/assignmentServices.jsx'; // keep your existing import path
import { emitWorkerDataRefresh, subscribeWorkerDataRefresh } from '../../utils/workerRefresh';
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';

export const AssignedTasks = () => {
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState({ fetch: false, action: false });
  const [error, setError] = useState(null);
  const [completionModal, setCompletionModal] = useState({ open: false, assignment: null });
  const [completionData, setCompletionData] = useState({ completedPieces: '', damagedPieces: '', damagedReason: '' });
  const lastRefreshRef = useRef(0);

  const loadMine = useCallback(async () => {
    setLoading(l => ({ ...l, fetch: true }));
    setError(null);
    try {
      const res = await fetchAssignedForMe();
      const list = Array.isArray(res) ? res : (res?.assignments ?? (res?.data ?? []));
      setMine(list);
      lastRefreshRef.current = Date.now();
    } catch (e) {
      console.error('Failed to load my assignments', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load assignments');
    } finally {
      setLoading(l => ({ ...l, fetch: false }));
    }
  }, []);

  useEffect(() => { loadMine(); }, [loadMine]);

  useEffect(() => {
    const refreshIfStale = ({ force = false } = {}) => {
      if (!force && Date.now() - lastRefreshRef.current < 20000) return;
      loadMine();
    };

    const unsubscribe = subscribeWorkerDataRefresh(({ scope, force }) => {
      if (!scope || scope === 'worker' || scope === 'assignments') {
        refreshIfStale({ force: Boolean(force) });
      }
    });

    const revalidateVisibleState = () => {
      if (document.visibilityState === 'visible') {
        refreshIfStale();
      }
    };

    window.addEventListener('focus', revalidateVisibleState);
    document.addEventListener('visibilitychange', revalidateVisibleState);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', revalidateVisibleState);
      document.removeEventListener('visibilitychange', revalidateVisibleState);
    };
  }, [loadMine]);

  const handleDeselect = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to release this task? It will return to available tasks.')) return;
    setLoading(l => ({ ...l, action: true }));
    setError(null);
    try {
      await releaseAssignment(assignmentId);
      await loadMine();
      emitWorkerDataRefresh({ scope: 'assignments', reason: 'release', force: true });
    } catch (e) {
      console.error('release failed', e);
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to release assignment');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const handleComplete = async (assignmentId) => {
    const assignment = mine.find(a => (a._id || a.id) === assignmentId);
    if (!assignment) return;
    setCompletionData({ completedPieces: String(assignment.totalPieces ?? ''), damagedPieces: '', damagedReason: '' });
    setCompletionModal({ open: true, assignment });
  };

  const submitCompletion = async () => {
    const { assignment } = completionModal;
    if (!assignment) return;
    setLoading(l => ({ ...l, action: true }));
    setError(null);
    try {
      const payload = {
        completedPieces: Number(completionData.completedPieces || 0),
        damagedPieces: Number(completionData.damagedPieces || 0),
        damagedReason: completionData.damagedReason
      };
      await completeAssignment(assignment._id || assignment.id, payload);
      setCompletionModal({ open: false, assignment: null });
      await loadMine();
      emitWorkerDataRefresh({ scope: 'worker', reason: 'complete-assignment', force: true });
    } catch (e) {
      console.error('complete failed', e);
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to complete assignment');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  // (kept for compatibility in case you still use it elsewhere)
  const handleTogglePause = async (assignment) => {
    setLoading(l => ({ ...l, action: true }));
    setError(null);
    try {
      const nextStatus = assignment.status === 'in_progress' ? 'paused' : 'in_progress';
      await patchAssignment(assignment._id || assignment.id, { status: nextStatus });
      await loadMine();
      emitWorkerDataRefresh({ scope: 'assignments', reason: 'patch-assignment', force: true });
    } catch (e) {
      console.error('toggle pause failed', e);
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to update status');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Play className="w-5 h-5 text-blue-600" />;
      case 'paused': return <Pause className="w-5 h-5 text-yellow-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTimeRemaining = (deadline) => {
    if (!deadline) return { text: '—', color: 'text-gray-500' };
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (diffHours < 0) return { text: 'Overdue', color: 'text-red-600' };
    if (diffHours < 24) return { text: `${diffHours}h left`, color: 'text-orange-600' };
    const diffDays = Math.ceil(diffHours / 24);
    return { text: `${diffDays}d left`, color: 'text-gray-600' };
  };

  const getSubOrderCode = (task) => {
    const sub = task?.subOrder;
    if (sub && typeof sub === 'object') {
      return sub.subOrderCode || sub.code || sub.suborderCode || null;
    }
    return null;
  };

  const shortId = (val) => {
    if (!val) return '—';
    const s = String(val);
    return s.length <= 6 ? s : s.slice(-6);
  };

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems,
    handlePageChange
  } = useClientPagination(mine, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Selected Tasks</h1>
          <p className="text-gray-600 mt-1">Tasks you have claimed</p>
        </div>
        <div className="text-sm text-gray-600">{mine.length} tasks</div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{String(error)}</div>}

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        {loading.fetch ? (
          <div className="text-sm text-gray-500">Loading your tasks...</div>
        ) : mine.length === 0 ? (
          <p className="text-sm text-gray-600">You haven't selected any tasks yet.</p>
        ) : (
          <div className="space-y-3">
            {paginatedItems.map(task => {
              const progress = ((task.completedPieces || 0) / (task.totalPieces || 1)) * 100;
              const timeRemaining = getTimeRemaining(task.order?.deadline || task.deadline);

              // Consider the task (or its parent order) completed if any common flag says so
              const isCompleted =
                task.status === 'completed' ||
                task.order?.status === 'completed' ||
                task.order?.isCompleted === true ||
                task.isCompleted === true;

              return (
                <div key={task._id || task.id} className="p-4 rounded-md border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <div className="font-medium">
                        {getSubOrderCode(task) || shortId(task?.subOrder?._id || task?.subOrder || task?._id)} — {task.order?.orderId || task.orderId || '—'}
                      </div>
                      <div className="text-xs text-gray-600">{task.stage || task.process}  • {task.totalPieces} pcs</div>
                      <div className={`text-xs ${timeRemaining.color}`}>{timeRemaining.text}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Show only Complete + Deselect and hide them when the task/order is completed */}
                    {!isCompleted ? (
                      <>
                        <button
                          onClick={() => handleComplete(task._id || task.id)}
                          disabled={loading.action}
                          className="px-3 py-1 rounded bg-green-50 text-sm"
                        >
                          Complete
                        </button>

                        <button
                          onClick={() => handleDeselect(task._id || task.id)}
                          disabled={loading.action}
                          className="px-3 py-1 rounded bg-yellow-50 text-sm"
                        >
                          Deselect
                        </button>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">Completed</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          itemLabel="tasks"
        />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={loadMine} disabled={loading.fetch} className="px-4 py-2 rounded bg-gray-100 text-sm">Refresh</button>
        {loading.fetch && <div className="text-sm text-gray-500">Loading...</div>}
        {loading.action && <div className="text-sm text-gray-500">Processing...</div>}
      </div>

      {/* Completion Modal */}
      {completionModal.open && completionModal.assignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Complete Assignment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Assignment: {getSubOrderCode(completionModal.assignment) || shortId(completionModal.assignment?.subOrder?._id || completionModal.assignment?.subOrder || completionModal.assignment?._id)} — {completionModal.assignment.stage || completionModal.assignment.process}
            </p>
            <p className="text-sm text-gray-600 mb-4">Total Pieces: {completionModal.assignment.totalPieces}</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Completed Pieces</label>
                <input
                  type="number"
                  min="0"
                  value={completionData.completedPieces}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, completedPieces: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Damaged Pieces</label>
                <input
                  type="number"
                  min="0"
                  value={completionData.damagedPieces}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, damagedPieces: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason for Damaged Pieces (optional)</label>
                <textarea
                  value={completionData.damagedReason}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, damagedReason: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  rows="3"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCompletionModal({ open: false, assignment: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={submitCompletion}
                disabled={loading.action || ((Number(completionData.completedPieces || 0) + Number(completionData.damagedPieces || 0)) < completionModal.assignment.totalPieces)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedTasks;
