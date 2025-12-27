import React, { useState, useEffect } from "react";
import AvailableTasksTable from "./AvailableTasksTable";
import AssignedTasksTable from "./AssignedTasksTable";
import { useUser } from "../context/UserContext";
import { fetchWorkerPendingApprovals, fetchWorkerCompletedWork, fetchWorkerApprovalHistory } from "../services/approvalServices";
import { fetchAssignedForMe } from "../services/assignmentServices";
import { Clock, CheckCircle, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "react-toastify";

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
    if (tab === "approval" && pendingApprovals.length === 0) {
      loadPendingApprovals();
    } else if (tab === "added" && completedWork.length === 0) {
      loadCompletedWork();
    }
  }, [tab]);

  useEffect(() => {
    loadTodaysTasks();
  }, []);

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <div className="text-sm text-gray-600">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card title="Today's Tasks" value={todaysTasks} color="blue" />
        <Card title="Pending Approvals" value={pendingApprovals.length} color="orange" icon={<Clock className="w-4 h-4" />} />
        <Card title="Completed Work" value={completedWork.length} color="green" icon={<CheckCircle className="w-4 h-4" />} />
        <Card title="Total Earnings" value={`$${totalEarnings}`} color="purple" icon={<DollarSign className="w-4 h-4" />} />
      </div>

      {/* Box Container */}
      <div className=" rounded-2xl p-6 shadow-md bg-white">
        {/* Tabs */}
        <div className="flex justify-center mb-4 gap-3">
          {["available", "current", "approval", "added"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 border rounded-lg capitalize ${
                tab === t
                  ? "bg-green-100 border-green-500 text-green-600 font-semibold"
                  : "bg-gray-50 border-gray-300"
              }`}
            >
              {t === "available" && "available task"}
              {t === "current" && "current task"}
              {t === "approval" && "approval"}
              {t === "added" && "added to acc."}
            </button>
          ))}
        </div>

        {/* Table Area */}
        <div className=" rounded-xl p-4">
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading pending approvals...</p>
                </div>
              ) : pendingApprovals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p>No pending approvals</p>
                  <p className="text-sm">Your completed work will appear here once submitted for approval</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.map((approval) => (
                    <div key={approval._id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{approval.name}</p>
                        <p className="text-sm text-gray-600">
                          Order: {approval.order?.orderId || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Submitted: {new Date(approval.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                        <p className="text-sm font-semibold text-green-600 mt-1">${approval.amount || 0}</p>
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
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading completed work...</p>
                </div>
              ) : completedWork.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p>No completed work yet</p>
                  <p className="text-sm">Approved work will appear here with your earnings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedWork.map((work) => (
                    <div key={work._id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{work.name}</p>
                        <p className="text-sm text-gray-600">
                          Order: {work.order?.orderId || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Completed: {new Date(work.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approved
                        </span>
                        <p className="text-sm font-semibold text-green-600 mt-1">+${work.amount || 0}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-900">Total Earnings</span>
                      <span className="text-lg font-bold text-blue-600">${totalEarnings}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Small card component */
const Card = ({ title, value, color, icon }) => {
  const colorMap = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
  };

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className={`w-6 h-6 rounded flex items-center justify-center ${colorMap[color]}`}>
        {icon || <div className="w-2 h-2 bg-white rounded-full"></div>}
      </div>
    </div>
  );
};
