  // src/components/AvailableTasks.jsx
  import React, { useEffect, useState, useMemo } from 'react';
  import PropTypes from 'prop-types';
  import { Package, AlertCircle, Plus, Filter } from 'lucide-react';
  import {
    fetchAvailableAssignments,
    fetchAvailableForMe,
    claimAssignment,
    fetchAssignedForMe
  } from '../services/assignmentServices';
  import { getWorker } from '../services/workerService';
  import { toast } from 'react-toastify';

  export const AvailableTasks = ({ workerId, workerCategory: initialWorkerCategory = null }) => {
    console.log('[AvailableTasks] render - workerId=', workerId, 'initialWorkerCategory=', initialWorkerCategory);

    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProcess, setSelectedProcess] = useState('all');
    const [selectedPriority, setSelectedPriority] = useState('all');
    const [claimingId, setClaimingId] = useState(null);

    const [workerCategory, setWorkerCategory] = useState(initialWorkerCategory);
    // start workerLoading only if we need to fetch worker
    const [workerLoading, setWorkerLoading] = useState(!initialWorkerCategory && Boolean(workerId));

    const [activeAssigned, setActiveAssigned] = useState(null);
    const [assignedLoading, setAssignedLoading] = useState(true);

    const normalize = (s) => (s === null || s === undefined ? '' : String(s).trim().toLowerCase());

    // load worker profile
    const loadWorker = async () => {
      console.log('loadWorker called. initialWorkerCategory=', initialWorkerCategory, 'workerId=', workerId);

      if (initialWorkerCategory) {
        console.log('loadWorker: using initialWorkerCategory prop ->', initialWorkerCategory);
        setWorkerCategory(initialWorkerCategory);
        setWorkerLoading(false);
        return;
      }

      if (!workerId) {
        console.log('loadWorker: no workerId provided, skipping getWorker fetch');
        setWorkerCategory(null);
        setWorkerLoading(false);
        return;
      }

      try {
        setWorkerLoading(true);
        const w = await getWorker(workerId);
        console.log('loadWorker: raw response from getWorker ->', w);
        const workerObj = w?.data || w?.worker || w;
        const wt = workerObj?.workerType || workerObj?.category || workerObj?.type || workerObj?.worker_type || null;

        if (wt) {
          console.log('loadWorker: resolved workerType ->', wt);
          setWorkerCategory(wt);
        } else {
          console.log('loadWorker: workerType not found; keys:', Object.keys(workerObj || {}));
          setWorkerCategory(null);
        }
      } catch (err) {
        console.error('loadWorker error', err);
        toast.error('Failed to load worker profile — showing all tasks');
        setWorkerCategory(null);
      } finally {
        setWorkerLoading(false);
      }
    };

    // load available tasks with robust fallbacks
    const load = async () => {
      // If we're still resolving worker info, skip fetch (avoid setting loading stuck)
      if (workerLoading) {
        console.log('load: workerLoading true — skipping fetch for now');
        // ensure UI doesn't show permanent loading
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        let data = null;

        if (workerCategory) {
          try {
            console.log('load: calling fetchAvailableForMe with category=', workerCategory);
            data = await fetchAvailableForMe({ category: workerCategory });
          } catch (err) {
            console.warn('fetchAvailableForMe(category) failed, will try server-side no-category fallback', err);
            data = null;
          }
        }

        if (!data) {
          try {
            console.log('load: calling fetchAvailableForMe() without category to let server infer user from JWT');
            data = await fetchAvailableForMe();
          } catch (err) {
            console.warn('fetchAvailableForMe() (no category) failed, falling back to fetchAvailableAssignments', err);
            data = null;
          }
        }

        if (!data) {
          console.log('load: calling fetchAvailableAssignments() as last resort');
          data = await fetchAvailableAssignments();
        }

        const arr = Array.isArray(data) ? data : (data?.assignments || data?.tasks || data?.data || []);
        console.log('load: fetched assignments count=', arr.length);

        const wanted = normalize(workerCategory);
        const filteredByCategory = wanted
          ? arr.filter(a => {
              const stage = normalize(a.stage || a.process || a.stageName || a.stage_type);
              const cat = normalize(a.category || a.order?.category || a.orderCategory);
              const requiredRole = a.requiredRole ? normalize(a.requiredRole) : '';
              const requiredRoles = Array.isArray(a.requiredRoles) ? a.requiredRoles.map(r => normalize(r)) : (a.requiredRoles ? [normalize(a.requiredRoles)] : []);
              const orderName = normalize(a.order?.styleSnapshot?.name);

              if (stage && stage.includes(wanted)) return true;
              if (cat && cat.includes(wanted)) return true;
              if (requiredRole && requiredRole.includes(wanted)) return true;
              if (requiredRoles.some(r => r.includes(wanted))) return true;
              if (orderName && orderName.includes(wanted)) return true;
              return false;
            })
          : arr;

        setAssignments(filteredByCategory);
      } catch (err) {
        console.error('Failed to load available assignments', err);
        toast.error('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    const loadAssignedForMe = async () => {
      try {
        setAssignedLoading(true);
        const data = await fetchAssignedForMe({ status: 'assigned' });
        const assigned = Array.isArray(data) ? data : (data?.assignments || data?.tasks || data?.data || []);
        setActiveAssigned(assigned.length > 0 ? assigned[0] : null);
        console.log('loadAssignedForMe: found assigned count=', assigned.length);
      } catch (err) {
        console.error('Failed to load assigned for me', err);
        setActiveAssigned(null);
      } finally {
        setAssignedLoading(false);
      }
    };

    // bootstrap: run when workerId or initialWorkerCategory changes
    useEffect(() => {
      let mounted = true;
      const bootstrap = async () => {
        console.log('bootstrap start');
        await loadWorker();
        if (!mounted) return;
        await load();
        await loadAssignedForMe();
      };
      bootstrap();
      return () => { mounted = false; };
    }, [workerId, initialWorkerCategory]);

    // polling/refresh: start only after workerLoading resolves
    useEffect(() => {
      if (workerLoading) return;

      // immediate refresh
      load();
      loadAssignedForMe();

      const t = setInterval(() => {
        load();
        loadAssignedForMe();
      }, 7000);

      return () => clearInterval(t);
    }, [workerCategory, workerId, workerLoading]);

    // derive UI lists (filter out falsy)
    const processes = useMemo(() => {
      return Array.from(new Set(assignments.map(a => a.stage || a.process).filter(Boolean)));
    }, [assignments]);

    const grouped = useMemo(() => {
      const map = new Map();
      for (const a of assignments) {
        const orderKey = a.order?.orderId || String(a.order || a.orderId || 'unknown');
        const group = map.get(orderKey) ?? {
          orderKey,
          orderLabel: orderKey,
          design: a.order?.styleSnapshot?.name || '—',
          priority: normalize(a.order?.priority || a.priority || 'Normal'),
          deadline: a.order?.deadline || a.deadline || null,
          process: a.stage || a.process || 'Unknown',
          chunks: []
        };
        group.chunks.push(a);
        map.set(orderKey, group);
      }
      return Array.from(map.values());
    }, [assignments]);

    const filtered = grouped.filter(g =>
      (selectedProcess === 'all' || g.process === selectedProcess) &&
      (selectedPriority === 'all' || g.priority === selectedPriority)
    );

    const getPriorityColor = (priority) => {
      switch ((priority || '').toLowerCase()) {
        case 'high': return 'bg-red-100 text-red-800 border-red-200';
        case 'normal':
        case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'low': return 'bg-green-100 text-green-800 border-green-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getTimeRemaining = (deadline) => {
      if (!deadline) return { text: 'No deadline', color: 'text-gray-500' };
      const now = new Date();
      const diffMs = new Date(deadline).getTime() - now.getTime();
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      if (diffHours < 0) return { text: 'Overdue', color: 'text-red-600' };
      if (diffHours < 24) return { text: `${diffHours}h left`, color: 'text-orange-600' };
      const diffDays = Math.ceil(diffHours / 24);
      return { text: `${diffDays}d left`, color: 'text-gray-600' };
    };

    const handleClaim = async (chunkId) => {
      if (!workerId) {
        toast.error('Worker not identified — cannot claim. Please login or provide workerId.');
        return;
      }

      if (activeAssigned) {
        toast.error('Please complete your current assignment before claiming another.');
        return;
      }

      setClaimingId(chunkId);
      try {
        const updated = await claimAssignment(chunkId, workerId);
        console.log('Claimed assignment:', updated);
        toast.success('Claimed successfully');
        setAssignments(prev => prev.filter(p => p._id !== chunkId));
        await loadAssignedForMe();
      } catch (err) {
        if (err?.response?.status === 409) {
          toast.error('Chunk already taken by someone else');
        } else {
          toast.error('Failed to claim chunk');
        }
        await load();
        await loadAssignedForMe();
      } finally {
        setClaimingId(null);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Available Tasks</h1>
            <p className="text-gray-600 mt-1">
              {workerLoading ? 'Determining your worker type…' : workerCategory ? `Showing tasks for: ${workerCategory}` : 'Showing tasks (all categories)'}
            </p>
          </div>
          <div className="text-sm text-gray-600">{loading ? 'Loading…' : `${assignments.length} chunk(s) available`}</div>
        </div>

        {activeAssigned && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-yellow-800">You have an active assignment</p>
                <p className="text-sm text-yellow-700">
                  Please complete the current assignment for order <strong>{activeAssigned.order?.orderId || activeAssigned.order}</strong> (Chunk: {activeAssigned._id}) before claiming another.
                </p>
                <p className="text-xs text-gray-500 mt-1">You can view it in <em>My Tasks</em> or complete it from there.</p>
              </div>
              <div>
                <button
                  onClick={() => toast.info('Open My Tasks to complete current assignment')}
                  className="px-3 py-1 bg-yellow-600 text-white rounded"
                >
                  View My Task
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select value={selectedProcess} onChange={(e) => setSelectedProcess(e.target.value)} className="px-4 py-2 border rounded">
              <option value="all">All Processes</option>
              {processes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="px-4 py-2 border rounded">
              <option value="all">All Priorities</option>
              {['high','normal','low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="ml-auto text-sm text-gray-500">{filtered.length} order(s)</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {filtered.map(group => {
            const timeRemaining = getTimeRemaining(group.deadline);
            return (
              <div key={group.orderKey} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Package className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{group.orderLabel}</h3>
                      <p className="text-sm text-gray-600">{group.design}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityColor(group.priority)}`}>{group.priority} priority</span>
                    <span className={`text-sm font-medium ${timeRemaining.color}`}>{timeRemaining.text}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Process</p>
                    <p className="text-lg font-semibold text-gray-900">{group.process}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Available Chunks</p>
                    <p className="text-lg font-semibold text-gray-900">{group.chunks.length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Example Pieces (chunk)</p>
                    <p className="text-lg font-semibold text-gray-900">{group.chunks[0]?.totalPieces ?? '—'}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Chunks</p>
                  <div className="flex flex-wrap gap-2">
                    {group.chunks.map(chunk => {
                      const disabled = Boolean(activeAssigned) || claimingId === chunk._id || !workerId;
                      return (
                        <div key={chunk._id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
                          <div className="text-sm">
                            <div className="font-medium">Chunk</div>
                            <div className="text-xs text-gray-600">{chunk.totalPieces} pieces</div>
                          </div>
                          <div className="ml-4 text-xs text-gray-500 max-w-xs">
                            <div>Preview:</div>
                            <pre className="text-xs max-w-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(chunk.pieces, null, 0)}</pre>
                          </div>
                          <div className="ml-auto">
                            <button
                              onClick={() => handleClaim(chunk._id)}
                              disabled={disabled}
                              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${disabled ? 'bg-gray-300 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                              <Plus className="w-4 h-4" />
                              <span>{claimingId === chunk._id ? 'Claiming…' : (!workerId ? 'Sign in to claim' : 'Claim')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Deadline: {group.deadline ? new Date(group.deadline).toLocaleString() : '—'}</span>
                  </div>
                  <div className="text-sm text-gray-500">Click a chunk to claim one — other workers will no longer see that chunk after claim.</div>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Tasks</h3>
            <p className="text-gray-600">All tasks matching your filters are currently assigned.</p>
          </div>
        )}
      </div>
    );
  };

  AvailableTasks.propTypes = {
    workerId: PropTypes.string,
    workerCategory: PropTypes.string
  };

  AvailableTasks.defaultProps = {
    workerId: undefined,
    workerCategory: null
  };

  export default AvailableTasks;
