// src/components/AssignedTasks.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, Play, Pause } from 'lucide-react';
import {
  fetchAssignedForMe,
  releaseAssignment,
  completeAssignment,
  patchAssignment
} from '../services/assignmentServices.jsx'; // keep your existing import path

/**
 * AssignedTasks (shows only assignments claimed by current worker)
 *
 * - Loads only assignments for the authenticated worker (GET /assignments/for-me)
 * - Allows worker to Pause/Resume, Deselect (release), Complete, and update progress
 * - Refreshes list after each server action
 *
 * NOTE: axios auth (cookies / Authorization header) must be set in your api client
 * so backend can read req.user and return the correct "for-me" list.
 */
export const AssignedTasks = () => {
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState({ fetch: false, action: false });
  const [error, setError] = useState(null);

  const loadMine = useCallback(async () => {
    setLoading(l => ({ ...l, fetch: true }));
    setError(null);
    try {
      const res = await fetchAssignedForMe();
      // tolerate different response shapes: array or { assignments: [...] }
      const list = Array.isArray(res) ? res : (res?.assignments ?? (res?.data ?? []));
      setMine(list);
    } catch (e) {
      console.error('Failed to load my assignments', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load assignments');
    } finally {
      setLoading(l => ({ ...l, fetch: false }));
    }
  }, []);

  useEffect(() => { loadMine(); }, [loadMine]);

  const handleTogglePause = async (assignment) => {
    setLoading(l => ({ ...l, action: true }));
    setError(null);
    try {
      const nextStatus = assignment.status === 'in_progress' ? 'paused' : 'in_progress';
      await patchAssignment(assignment._id || assignment.id, { status: nextStatus });
      await loadMine();
    } catch (e) {
      console.error('toggle pause failed', e);
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to update status');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const handleDeselect = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to release this task? It will return to available tasks.')) return;
    setLoading(l => ({ ...l, action: true }));
    setError(null);
    try {
      await releaseAssignment(assignmentId);
      await loadMine();
    } catch (e) {
      console.error('release failed', e);
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to release assignment');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const handleComplete = async (assignmentId) => {
    if (!window.confirm('Mark this assignment as completed?')) return;
    setLoading(l => ({ ...l, action: true }));
    setError(null);
    try {
      await completeAssignment(assignmentId);
      await loadMine();
    } catch (e) {
      console.error('complete failed', e);
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to complete assignment');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const handleUpdateProgress = async (assignment, newCompleted) => {
    setLoading(l => ({ ...l, action: true }));
    setError(null);
    try {
      // backend must support PATCH /assignments/:id with completedPieces
      await patchAssignment(assignment._id || assignment.id, { completedPieces: newCompleted });
      await loadMine();
    } catch (e) {
      console.error('update progress failed', e);
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to update progress');
      await loadMine();
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
            {mine.map(task => {
              const progress = ((task.completedPieces || 0) / (task.totalPieces || 1)) * 100;
              const timeRemaining = getTimeRemaining(task.order?.deadline || task.deadline);
              return (
                <div key={task._id || task.id} className="p-4 rounded-md border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <div className="font-medium">{task._id || task.id} — {task.order?.orderId || task.orderId}</div>
                      <div className="text-xs text-gray-600">{task.stage || task.process} • {Math.round(progress)}% • {task.totalPieces} pcs</div>
                      <div className={`text-xs ${timeRemaining.color}`}>{timeRemaining.text}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePause(task)}
                      disabled={loading.action}
                      className="px-3 py-1 rounded bg-gray-100 text-sm"
                    >
                      {task.status === 'in_progress' ? 'Pause' : 'Resume'}
                    </button>

                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Completed:</label>
                      <input
                        type="number"
                        min="0"
                        max={task.totalPieces || 0}
                        value={task.completedPieces ?? 0}
                        onChange={(e) => handleUpdateProgress(task, parseInt(e.target.value || '0', 10))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={loadMine} disabled={loading.fetch} className="px-4 py-2 rounded bg-gray-100 text-sm">Refresh</button>
        {loading.fetch && <div className="text-sm text-gray-500">Loading...</div>}
        {loading.action && <div className="text-sm text-gray-500">Processing...</div>}
      </div>
    </div>
  );
};

export default AssignedTasks;
