import React, { useState, useEffect } from "react";
import AvailableTasksTable from "./AvailableTasksTable";
import AssignedTasksTable from "./AssignedTasksTable";
import { useUser } from "../context/UserContext";
import { fetchWorkerPendingApprovals, fetchWorkerCompletedWork, fetchWorkerApprovalHistory } from "../services/approvalServices";
import { fetchAssignedForMe } from "../services/assignmentServices";
import { Clock, CheckCircle, DollarSign, TrendingUp, Target, Award, Activity } from "lucide-react";
import { toast } from "react-toastify";
import { useSocket } from "../../hooks/useSocket";
import { motion } from "framer-motion";
import { StatsCard, Card, EmptyState, Spinner } from "../ui/UIComponents";

export default function WorkerOverview() {
  const { user } = useUser();
  const workerId = user?._id;
  const workerCategory = user?.workerType || user?.worker_type;
  const [tab, setTab] = useState("available");
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [completedWork, setCompletedWork] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [todaysTasks, setTodaysTasks] = useState(0);

  // Initialize Socket.IO connection
  useSocket();

  // Listen for real-time approval updates
  useEffect(() => {
    const handleApprovalUpdate = (event) => {
      const { detail } = event;
      if (detail.type === 'APPROVAL_APPROVED') {
        toast.success(`Work approved! +₹${detail.subOrder.amount} added to your account`);
        // Refresh all data
        loadTodaysTasks();
        loadPendingApprovals();
        loadCompletedWork();
      }
    };

    window.addEventListener('approvalUpdate', handleApprovalUpdate);
    return () => window.removeEventListener('approvalUpdate', handleApprovalUpdate);
  }, []);

  const loadTodaysTasks = async () => {
    try {
      const res = await fetchAssignedForMe();
      const list = Array.isArray(res) ? res : (res?.assignments ?? (res?.data ?? []));
      setTodaysTasks(list.length);
    } catch (error) {
      console.error('Error loading todays tasks:', error);
    }
  };

  useEffect(() => {
    loadTodaysTasks();
    loadPendingApprovals();
    loadCompletedWork();
  }, []);

  useEffect(() => {
    if (tab === "approval") {
      loadPendingApprovals();
    } else if (tab === "added") {
      loadCompletedWork();
    }
  }, [tab]);

  // Real-time updates every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadTodaysTasks();
      loadPendingApprovals();
      loadCompletedWork();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const res = await fetchWorkerPendingApprovals();
      if (res.success) {
        setPendingApprovals(res.approvals || []);
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedWork = async () => {
    try {
      setLoading(true);
      const res = await fetchWorkerCompletedWork();
      if (res.success) {
        setCompletedWork(res.completedWork || []);
      }
    } catch (error) {
      console.error('Error loading completed work:', error);
      toast.error('Failed to load completed work');
    } finally {
      setLoading(false);
    }
  };

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
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your tasks and earnings</p>
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
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          icon={<DollarSign className="w-6 h-6" />}
          color="purple"
          trend="up"
        />
      </div>

      {/* Main Content */}
      <Card className="p-6">
        {/* Enhanced Tabs */}
        <div className="flex flex-wrap justify-center mb-6 gap-2">
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  tab === tabItem.id
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-105"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 hover:scale-105"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <motion.div 
          key={tab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
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
                    <motion.div 
                      key={approval._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-white border border-orange-200 rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{approval.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Order: {approval.order?.orderId || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted: {new Date(approval.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">₹{approval.amount || 0}</p>
                      </div>
                    </motion.div>
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
                    <motion.div 
                      key={work._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-white border border-green-200 rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{work.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Order: {work.order?.orderId || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Completed: {new Date(work.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">+₹{work.amount || 0}</p>
                      </div>
                    </motion.div>
                  ))}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
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
                  </motion.div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </Card>
    </div>
  );
}

