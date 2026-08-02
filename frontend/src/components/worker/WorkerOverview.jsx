import React, { useState, useEffect, useCallback, useRef } from "react";
import AvailableTasksTable from "./AvailableTasksTable";
import AssignedTasksTable from "./AssignedTasksTable";
import { useUser } from "../context/UserContext";
import { fetchWorkerPendingApprovals, fetchWorkerCompletedWork } from "../services/approvalServices";
import { fetchAssignedForMe } from "../services/assignmentServices";
import { Clock, CheckCircle, IndianRupee, Target, Award, Activity } from "lucide-react";
import { toast } from "react-toastify";
import { useSocket } from "../../hooks/useSocket";
// motion removed
import { StatsCard, Card, EmptyState, Spinner } from "../ui/UIComponents";
import { subscribeWorkerDataRefresh } from "../../utils/workerRefresh";

export default function WorkerOverview() {
  const { user } = useUser();
  const workerId = user?._id;
  const workerCategory = user?.workerType || user?.worker_type;
  const [tab, setTab] = useState("available");
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [completedWork, setCompletedWork] = useState([]);
  const [loading, setLoading] = useState(false);
  const [todaysTasks, setTodaysTasks] = useState(0);
  const lastRefreshRef = useRef({ assigned: 0, pending: 0, completed: 0 });
  const inFlightRef = useRef({ assigned: false, pending: false, completed: false });

  useSocket();

  const isFresh = useCallback((key, maxAgeMs) => {
    return Date.now() - lastRefreshRef.current[key] < maxAgeMs;
  }, []);

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
        setPendingApprovals(res.approvals || []);
      }
      lastRefreshRef.current.pending = Date.now();
    } catch (error) {
      console.error("Error loading pending approvals:", error);
      if (!silent) toast.error("Failed to load pending approvals");
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
        setCompletedWork(res.completedWork || []);
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
        loadTodaysTasks({ force }),
        loadPendingApprovals({ force, silent: true }),
        loadCompletedWork({ force, silent: true })
      ]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadCompletedWork, loadPendingApprovals, loadTodaysTasks]);

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
    if (tab === "approval") {
      loadPendingApprovals({ silent: false });
    } else if (tab === "added") {
      loadCompletedWork({ silent: false });
    } else if (tab === "current") {
      loadTodaysTasks();
    }
  }, [tab, loadCompletedWork, loadPendingApprovals, loadTodaysTasks]);

  useEffect(() => {
    const unsubscribe = subscribeWorkerDataRefresh(({ scope, force }) => {
      if (!scope || scope === "worker" || scope === "approvals") {
        refreshOverview({ force: Boolean(force), silent: true });
        return;
      }

      if (scope === "assignments") {
        loadTodaysTasks({ force: Boolean(force) });
      }
    });

    const revalidateVisibleState = () => {
      if (document.visibilityState === "visible") {
        refreshOverview({ silent: true });
      }
    };

    window.addEventListener("focus", revalidateVisibleState);
    document.addEventListener("visibilitychange", revalidateVisibleState);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", revalidateVisibleState);
      document.removeEventListener("visibilitychange", revalidateVisibleState);
    };
  }, [loadTodaysTasks, refreshOverview]);

  const totalEarnings = completedWork.reduce((sum, work) => sum + (work.amount || 0), 0);
  const completionRate = todaysTasks > 0 ? Math.round((completedWork.length / todaysTasks) * 100) : 0;

  const tabs = [
    { id: "available", label: "Available Tasks", icon: Target },
    { id: "current", label: "Current Tasks", icon: Activity },
    { id: "approval", label: "Pending Approval", icon: Clock },
    { id: "added", label: "Completed Work", icon: CheckCircle },
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
          title="Pending Approvals"
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
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-3 rounded-xl text-xs sm:text-sm font-medium ${
                  tab === tabItem.id
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tabItem.label}</span>
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
                <div className="text-center py-12">
                  <Spinner size="lg" className="mx-auto mb-4" />
                  <p className="text-gray-500">Loading pending approvals...</p>
                </div>
              ) : pendingApprovals.length === 0 ? (
                <EmptyState
                  icon={<Clock className="w-8 h-8 text-gray-400" />}
                  title="No pending approvals"
                  description="Your completed work will appear here once submitted for approval"
                />
              ) : (
                <div className="space-y-4">
                  {pendingApprovals.map((approval, index) => (
                    <div
                      key={approval._id}
                      className="flex items-center justify-between p-4 bg-white border border-orange-200 rounded-xl hover:shadow-md"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{approval.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Order: {approval.order?.orderId || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted: {new Date(approval.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">₹{approval.calculatedPayment ?? approval.amount ?? 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "added" && (
            <div>
              {loading ? (
                <div className="text-center py-12">
                  <Spinner size="lg" className="mx-auto mb-4" />
                  <p className="text-gray-500">Loading completed work...</p>
                </div>
              ) : completedWork.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle className="w-8 h-8 text-gray-400" />}
                  title="No completed work yet"
                  description="Approved work will appear here with your earnings"
                />
              ) : (
                <div className="space-y-4">
                  {completedWork.map((work, index) => (
                    <div
                      key={work._id}
                      className="flex items-center justify-between p-4 bg-white border border-green-200 rounded-xl hover:shadow-md"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{work.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Order: {work.order?.orderId || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Completed: {new Date(work.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">+₹{work.amount || 0}</p>
                      </div>
                    </div>
                  ))}
                  <div
                    className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Award className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-semibold text-blue-900">Total Earnings</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">₹{totalEarnings.toLocaleString()}</span>
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
