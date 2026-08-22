import React, { useState, useEffect, useCallback, useRef } from "react";
import AvailableTasksTable from "./AvailableTasksTable";
import AssignedTasksTable from "./AssignedTasksTable";
import { useUser } from "../context/UserContext";
import { fetchWorkerPendingApprovals, fetchWorkerCompletedWork } from "../services/approvalServices";
import { fetchAssignedForMe, fetchAvailableForMe } from "../services/assignmentServices";
import { Clock, CheckCircle, IndianRupee, Target, Award, Activity, RotateCw } from "lucide-react";
import { toast } from "react-toastify";
import { useSocket } from "../../hooks/useSocket";
// motion removed
import { StatsCard, Card, EmptyState, Spinner } from "../ui/UIComponents";
import { subscribeWorkerDataRefresh } from "../../utils/workerRefresh";
import { dataCache } from "../../utils/dataCache";

const colorMap = {
  black: '#111827',
  blue: '#2563eb',
  green: '#16a34a',
  orange: '#f97316',
  purple: '#7c3aed',
  red: '#ef4444',
  white: '#ffffff',
  yellow: '#eab308',
  navy: '#1e3a8a',
  pink: '#ec4899',
  gray: '#6b7280',
  grey: '#6b7280',
  brown: '#78350f',
  beige: '#f5f5dc',
  maroon: '#800000',
  cyan: '#06b6d4',
  teal: '#0d9488',
  indigo: '#4f46e5',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  emerald: '#10b981',
  sky: '#0284c7'
};

const getColorHex = (name) => {
  if (!name || name === '—') return null;
  const key = String(name).trim().toLowerCase();
  if (colorMap[key]) return colorMap[key];
  if (/^#([0-9a-f]{3}){1,2}$/i.test(key)) return key;
  if (/^rgb/i.test(key)) return key;
  return key;
};

const ColorBadge = ({ color }) => {
  if (!color || color === '—') return <span>—</span>;
  const hex = getColorHex(color);
  const isLight = hex && (hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === 'white' || hex.toLowerCase() === '#f8fafc');

  return (
    <div className="inline-flex items-center gap-1.5 font-medium">
      {hex && (
        <span
          className={`h-3 w-3 rounded-full shrink-0 ${
            isLight ? 'border border-gray-300' : 'border border-black/10'
          }`}
          style={{ backgroundColor: hex }}
          title={color}
        />
      )}
      <span>{color}</span>
    </div>
  );
};

const extractCompletedWorkDetails = (work) => {
  let color = '—';
  let size = '—';

  try {
    if (work?.color || work?.size) {
      color = work?.color || '—';
      size = work?.size || '—';
    } else if (work && work.pieces && typeof work.pieces === 'object' && !Array.isArray(work.pieces)) {
      const colors = Object.keys(work.pieces);
      if (colors.length > 0) {
        color = colors[0];
        const sizesObj = work.pieces[color] || {};
        const sizes = Object.keys(sizesObj);
        if (sizes.length > 0) size = sizes.join(', ');
      }
    } else if (Array.isArray(work?.pieces) && work.pieces.length > 0) {
      const p = work.pieces[0];
      color = p.color ?? p.colour ?? p.colorName ?? '—';
      size = p.size ?? p.sizeName ?? '—';
    } else if (work?.color) {
      color = work.color;
      size = work?.size || '—';
    } else if (typeof work?.name === 'string') {
      const parts = work.name.split('-');
      if (parts.length >= 3) {
        color = parts[1].trim();
        size = parts[2].trim();
      } else if (parts.length === 2) {
        color = parts[1].trim();
      }
    }
  } catch {
    // ignore
  }

  const styleName = work?.styleName
    || work?.order?.style?.name
    || work?.order?.styleSnapshot?.name
    || (typeof work?.name === 'string' && work.name.includes('-') ? work.name.split('-')[0] : work?.name)
    || '—';

  const fabricName = work?.fabric
    || work?.order?.fabric
    || work?.order?.styleSnapshot?.fabric
    || work?.order?.style?.fabric
    || '—';

  const orderId = work?.order?.orderId || work?.orderId || '—';
  const subOrderCode = work?.subOrderCode || work?.code || (work?._id ? String(work._id).slice(-6) : '—');
  const stage = work?.currentStage || work?.stage || '—';

  const completedPcs = work?.completedPieces ?? work?.approvedPieces ?? 0;
  const damagedPcs = work?.damagedPieces ?? work?.faultyPieces ?? 0;

  let totalTargetPcs = work?.totalPieces ?? work?.targetPieces ?? work?.totalPlannedPieces ?? 0;
  if (!totalTargetPcs && work?.pieces) {
    if (typeof work.pieces === 'number' && work.pieces > 0) {
      totalTargetPcs = work.pieces;
    } else if (Array.isArray(work.pieces) && work.pieces.length > 0) {
      totalTargetPcs = work.pieces.reduce((acc, p) => acc + Number(p.count ?? p.qty ?? p.quantity ?? p.pieces ?? 0), 0);
    } else if (typeof work.pieces === 'object') {
      let sum = 0;
      for (const col of Object.keys(work.pieces)) {
        const sizes = work.pieces[col];
        if (typeof sizes === 'number') sum += sizes;
        else if (sizes && typeof sizes === 'object') {
          for (const s of Object.keys(sizes)) {
            sum += Number(sizes[s]) || 0;
          }
        }
      }
      if (sum > 0) totalTargetPcs = sum;
    }
  }

  if (!totalTargetPcs && typeof work?.submittedPieces === 'number' && work.submittedPieces > 0) {
    totalTargetPcs = work.submittedPieces;
  }

  if (!totalTargetPcs && (completedPcs + damagedPcs) > 0) {
    totalTargetPcs = completedPcs + damagedPcs;
  }

  const donePcsDisplay = totalTargetPcs > 0 ? `${completedPcs} / ${totalTargetPcs}` : `${completedPcs}`;

  const earnings = work?.calculatedPayment ?? work?.amount ?? work?.workerEarnings ?? 0;
  const dateStr = work?.updatedAt || work?.approvedAt || work?.createdAt
    ? new Date(work.updatedAt || work.approvedAt || work.createdAt).toLocaleDateString()
    : '—';
  const statusLabel = work?.statusLabel || (work?.status === 'pending_approval' ? 'Pending' : work?.status || '—');

  return {
    color: String(color),
    size: String(size),
    styleName,
    fabricName,
    orderId,
    subOrderCode,
    stage,
    completedPcs,
    totalTargetPcs,
    donePcsDisplay,
    damagedPcs,
    earnings,
    dateStr,
    statusLabel
  };
};

export default function WorkerOverview() {
  const { user } = useUser();
  const workerId = user?._id;
  const workerCategory = user?.workerType || user?.worker_type;
  const [tab, setTab] = useState("available");
  const cachedPending = dataCache.getCache('workerPending');
  const [pendingApprovals, setPendingApprovals] = useState(cachedPending || []);
  const cachedCompleted = dataCache.getCache('workerCompleted');
  const [completedWork, setCompletedWork] = useState(cachedCompleted || []);
  const [loading, setLoading] = useState(!cachedPending);
  const [todaysTasks, setTodaysTasks] = useState(0);
  const [availableTasksCount, setAvailableTasksCount] = useState(0);
  const lastRefreshRef = useRef({ available: 0, assigned: 0, pending: 0, completed: 0 });
  const inFlightRef = useRef({ available: false, assigned: false, pending: false, completed: false });

  useSocket();

  const isFresh = useCallback((key, maxAgeMs) => {
    return Date.now() - lastRefreshRef.current[key] < maxAgeMs;
  }, []);

  const loadAvailableTasksCount = useCallback(async ({ force = false } = {}) => {
    if (inFlightRef.current.available) return;
    if (!force && isFresh("available", 30000)) return;

    inFlightRef.current.available = true;
    try {
      const res = await fetchAvailableForMe(workerCategory ? { category: workerCategory } : {});
      const list = Array.isArray(res) ? res : (res?.assignments ?? (res?.data ?? []));
      setAvailableTasksCount(list.length);
      lastRefreshRef.current.available = Date.now();
    } catch (error) {
      console.error("Error loading available tasks:", error);
    } finally {
      inFlightRef.current.available = false;
    }
  }, [isFresh, workerCategory]);

  const loadTodaysTasks = useCallback(async ({ force = false } = {}) => {
    if (inFlightRef.current.assigned) return;
    if (!force && isFresh("assigned", 30000)) return;

    inFlightRef.current.assigned = true;
    try {
      const res = await fetchAssignedForMe();
      const list = Array.isArray(res) ? res : (res?.assignments ?? (res?.data ?? []));
      setTodaysTasks(list.length);
      lastRefreshRef.current.assigned = Date.now();
    } catch (error) {
      console.error("Error loading todays tasks:", error);
    } finally {
      inFlightRef.current.assigned = false;
    }
  }, [isFresh]);

  const loadPendingApprovals = useCallback(async ({ force = false, silent = false } = {}) => {
    if (inFlightRef.current.pending) return;
    if (!force && isFresh("pending", 45000)) return;

    inFlightRef.current.pending = true;
    if (!silent) setLoading(true);
    try {
      const res = await fetchWorkerPendingApprovals();
      if (res.success) {
        const list = res.approvals || [];
        setPendingApprovals(list);
        dataCache.setCache('workerPending', list);
      }
      lastRefreshRef.current.pending = Date.now();
    } catch (error) {
      console.error("Error loading pending:", error);
      if (!silent) toast.error("Failed to load pending");
    } finally {
      inFlightRef.current.pending = false;
      if (!silent) setLoading(false);
    }
  }, [isFresh]);

  const loadCompletedWork = useCallback(async ({ force = false, silent = false } = {}) => {
    if (inFlightRef.current.completed) return;
    if (!force && isFresh("completed", 45000)) return;

    inFlightRef.current.completed = true;
    if (!silent) setLoading(true);
    try {
      const res = await fetchWorkerCompletedWork();
      if (res.success) {
        const list = res.completedWork || [];
        setCompletedWork(list);
        dataCache.setCache('workerCompleted', list);
      }
      lastRefreshRef.current.completed = Date.now();
    } catch (error) {
      console.error("Error loading completed work:", error);
      if (!silent) toast.error("Failed to load completed work");
    } finally {
      inFlightRef.current.completed = false;
      if (!silent) setLoading(false);
    }
  }, [isFresh]);

  const refreshOverview = useCallback(async ({ force = false, silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      await Promise.allSettled([
        loadAvailableTasksCount({ force }),
        loadTodaysTasks({ force }),
        loadPendingApprovals({ force, silent: true }),
        loadCompletedWork({ force, silent: true })
      ]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadAvailableTasksCount, loadCompletedWork, loadPendingApprovals, loadTodaysTasks]);

  useEffect(() => {
    const handleApprovalUpdate = (event) => {
      const detail = event?.detail || {};
      if (detail.type === "APPROVAL_APPROVED") {
        const amount = detail?.subOrder?.amount || 0;
        toast.success(`Work approved! +₹${amount} added to your account`);
        refreshOverview({ force: true, silent: true });
      }
    };

    window.addEventListener("approvalUpdate", handleApprovalUpdate);
    return () => window.removeEventListener("approvalUpdate", handleApprovalUpdate);
  }, [refreshOverview]);

  useEffect(() => {
    refreshOverview({ force: true });
  }, [refreshOverview]);

  useEffect(() => {
    if (tab === "available") {
      loadAvailableTasksCount({ force: true });
    } else if (tab === "approval") {
      loadPendingApprovals({ silent: false });
    } else if (tab === "added") {
      loadCompletedWork({ silent: false });
    } else if (tab === "current") {
      loadTodaysTasks();
    }
  }, [tab, loadAvailableTasksCount, loadCompletedWork, loadPendingApprovals, loadTodaysTasks]);

  useEffect(() => {
    const unsubscribe = subscribeWorkerDataRefresh(({ scope, force }) => {
      if (!scope || scope === "worker" || scope === "approvals") {
        refreshOverview({ force: Boolean(force), silent: true });
        return;
      }

      if (scope === "assignments") {
        loadAvailableTasksCount({ force: Boolean(force) });
        loadTodaysTasks({ force: Boolean(force) });
      }
    });

    const handleGlobalRefresh = () => {
      refreshOverview({ force: true });
    };
    window.addEventListener("app:refresh", handleGlobalRefresh);

    const revalidateVisibleState = () => {
      if (document.visibilityState === "visible") {
        refreshOverview({ silent: true });
      }
    };

    window.addEventListener("focus", revalidateVisibleState);
    document.addEventListener("visibilitychange", revalidateVisibleState);

    return () => {
      unsubscribe();
      window.removeEventListener("app:refresh", handleGlobalRefresh);
      window.removeEventListener("focus", revalidateVisibleState);
      document.removeEventListener("visibilitychange", revalidateVisibleState);
    };
  }, [loadAvailableTasksCount, loadTodaysTasks, refreshOverview]);

  const totalEarnings = completedWork.reduce((sum, work) => sum + (work.amount || 0), 0);
  const completionRate = todaysTasks > 0 ? Math.round((completedWork.length / todaysTasks) * 100) : 0;

  const tabs = [
    { id: "available", label: "Available Tasks", icon: Target, count: availableTasksCount },
    { id: "current", label: "Current Tasks", icon: Activity, count: todaysTasks },
    { id: "approval", label: "Pending", icon: Clock, count: pendingApprovals.length },
    { id: "added", label: "Completed Work", icon: CheckCircle, count: completedWork.length },
  ];

  return (
    <div className="space-y-8">
      <div
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1 sm:mt-2">Track your tasks and earnings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refreshOverview({ force: true })}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="text-right">
            <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Today's Tasks"
          value={todaysTasks}
          change="Active assignments"
          icon={<Target className="w-6 h-6" />}
          color="blue"
          trend="neutral"
        />
        <StatsCard
          title="Pending"
          value={pendingApprovals.length}
          change="Awaiting review"
          icon={<Clock className="w-6 h-6" />}
          color="yellow"
          trend={pendingApprovals.length > 0 ? "up" : "neutral"}
        />
        <StatsCard
          title="Completed Work"
          value={completedWork.length}
          change={`${completionRate}% completion rate`}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          trend="up"
        />
        <StatsCard
          title="Total Earnings"
          value={`₹${totalEarnings.toLocaleString()}`}
          change="This month"
          icon={<IndianRupee className="w-6 h-6" />}
          color="purple"
          trend="up"
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap justify-center mb-6 gap-2">
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = tab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${isActive
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tabItem.label}</span>
                {tabItem.count !== undefined && (
                  <span
                    className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tabItem.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          className="bg-gray-50 rounded-2xl p-6"
        >
          {tab === "available" && (
            <AvailableTasksTable
              workerId={workerId}
              workerCategory={workerCategory}
            />
          )}

          {tab === "current" && <AssignedTasksTable />}

          {tab === "approval" && (
            <div>
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <div className="text-sm text-gray-500">Loading pending...</div>
                </div>
              ) : pendingApprovals.length === 0 ? (
                <EmptyState
                  icon={<Clock className="w-8 h-8 text-gray-400" />}
                  title="No pending"
                  description="Your completed work will appear here once submitted for approval"
                />
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <th className="px-3 py-3">SubOrder</th>
                        <th className="px-3 py-3">Order ID</th>
                        <th className="px-3 py-3">Style</th>
                        <th className="px-3 py-3">Fabric</th>
                        <th className="px-3 py-3 text-center">Done Pcs</th>
                        <th className="px-3 py-3 text-center">Total Pcs</th>
                        <th className="px-3 py-3 text-center">Damaged</th>
                        <th className="px-3 py-3">Color</th>
                        <th className="px-3 py-3">Size</th>
                        <th className="px-3 py-3">Submitted On</th>
                        <th className="px-3 py-3 text-right">Est. Earnings</th>
                        <th className="px-3 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {pendingApprovals.map((approval) => {
                        const details = extractCompletedWorkDetails(approval);
                        return (
                          <tr key={approval._id} className="hover:bg-amber-50/50 transition-colors">
                            <td className="px-3 py-3 font-mono font-medium text-gray-900">{details.subOrderCode}</td>
                            <td className="px-3 py-3 font-medium text-gray-800">{details.orderId}</td>
                            <td className="px-3 py-3 font-medium text-gray-900">{details.styleName}</td>
                            <td className="px-3 py-3 text-gray-700">{details.fabricName}</td>
                            <td className="px-3 py-3 text-center font-semibold text-gray-900">{details.completedPcs}</td>
                            <td className="px-3 py-3 text-center font-semibold text-gray-900">{details.totalTargetPcs}</td>
                            <td className="px-3 py-3 text-center text-red-600 font-medium">{details.damagedPcs}</td>
                            <td className="px-3 py-3">
                              <ColorBadge color={details.color} />
                            </td>
                            <td className="px-3 py-3 text-gray-700">{details.size}</td>
                            <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{details.dateStr}</td>
                            <td className="px-3 py-3 text-right font-bold text-amber-700">
                              ₹{Number(details.earnings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                {details.statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "added" && (
            <div>
              {loading ? (
                <div className="space-y-4 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-white border border-gray-200 rounded-xl animate-pulse flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-16" />
                    </div>
                  ))}
                </div>
              ) : completedWork.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle className="w-8 h-8 text-gray-400" />}
                  title="No completed work yet"
                  description="Approved work will appear here with your earnings"
                />
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <th className="px-3 py-3">SubOrder</th>
                          <th className="px-3 py-3">Order ID</th>
                          <th className="px-3 py-3">Style</th>
                          <th className="px-3 py-3">Fabric</th>
                          <th className="px-3 py-3 text-center">Done Pcs</th>
                          <th className="px-3 py-3 text-center">Total Pcs</th>
                          <th className="px-3 py-3 text-center">Damaged</th>
                          <th className="px-3 py-3">Color</th>
                          <th className="px-3 py-3">Size</th>
                          <th className="px-3 py-3">Completed On</th>
                          <th className="px-3 py-3 text-right">Earnings</th>
                          <th className="px-3 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {completedWork.map((work) => {
                          const details = extractCompletedWorkDetails(work);
                          return (
                            <tr key={work._id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-3 py-3 font-mono font-medium text-gray-900">{details.subOrderCode}</td>
                              <td className="px-3 py-3 font-medium text-gray-800">{details.orderId}</td>
                              <td className="px-3 py-3 font-medium text-gray-900">{details.styleName}</td>
                              <td className="px-3 py-3 text-gray-700">{details.fabricName}</td>
                              <td className="px-3 py-3 text-center font-semibold text-gray-900">{details.completedPcs}</td>
                              <td className="px-3 py-3 text-center font-semibold text-gray-900">{details.totalTargetPcs}</td>
                              <td className="px-3 py-3 text-center text-red-600 font-medium">{details.damagedPcs}</td>
                              <td className="px-3 py-3">
                                <ColorBadge color={details.color} />
                              </td>
                              <td className="px-3 py-3 text-gray-700">{details.size}</td>
                              <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{details.dateStr}</td>
                              <td className="px-3 py-3 text-right font-bold text-green-600">
                                +₹{Number(details.earnings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  Approved
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div
                    className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Award className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-semibold text-blue-900">Total Approved Earnings</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
