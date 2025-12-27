// src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../utils/Sidebar';
import Topbar from '../utils/Topbar';
import { useUser } from '../context/UserContext';
import { ShoppingCart, Package, Users, CheckCircle, Clock, BarChart3, Check, X } from 'lucide-react';
import { fetchPendingApprovals, fetchApprovalHistory } from '../services/approvalServices';
import { getActiveWorkersCount } from '../services/workerService';
import { toast } from 'react-toastify';


export const Overview = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [activeWorkersCount, setActiveWorkersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [pendingRes, historyRes, workersRes] = await Promise.all([
        fetchPendingApprovals(),
        fetchApprovalHistory({ limit: 5 }),
        getActiveWorkersCount()
      ]);

      if (pendingRes.success) {
        setPendingApprovals(pendingRes.approvals || []);
      }

      if (historyRes.success) {
        setRecentHistory(historyRes.history || []);
      }

      if (workersRes.success) {
        setActiveWorkersCount(workersRes.activeWorkersCount || 0);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Orders"
          value="24"
          changeText="+12% from last week"
          icon={<ShoppingCart className="w-6 h-6 text-blue-600" />}
        />

        <StatCard
          title="Total Stock (kg)"
          value="1,250"
          changeText="Updated today"
          icon={<Package className="w-6 h-6 text-green-600" />}
        />

        <StatCard
          title="Active Workers"
          value={activeWorkersCount}
          changeText="Currently logged in"
          icon={<Users className="w-6 h-6 text-yellow-600" />}
        />

        <StatCard
          title="Pending Approvals"
          value={pendingApprovals.length}
          changeText="Requires attention"
          icon={<Clock className="w-6 h-6 text-orange-600" />}
        />
      </div>

      {/* Approval Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 text-orange-600 mr-2" />
              Pending Approvals
            </h2>
            <span className="text-sm text-gray-500">{pendingApprovals.length} items</span>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading...</p>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p>No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {pendingApprovals.slice(0, 5).map((approval) => (
                <div key={approval._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{approval.name}</p>
                    <p className="text-sm text-gray-600">
                      Worker: {approval.completedBy?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Submitted: {new Date(approval.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${approval.amount || 0}</p>
                  </div>
                </div>
              ))}
              {pendingApprovals.length > 5 && (
                <div className="text-center pt-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View all {pendingApprovals.length} approvals →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Approval History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
              Recent Activity
            </h2>
            <span className="text-sm text-gray-500">{recentHistory.length} actions</span>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading...</p>
            </div>
          ) : recentHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentHistory.map((item) => (
                <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.action === 'approved' ? 'bg-green-100' :
                        item.action === 'rejected' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                      {item.action === 'approved' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : item.action === 'rejected' ? (
                        <X className="w-4 h-4 text-red-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{item.action}</p>
                      <p className="text-sm text-gray-600">{item.subOrderName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.amount > 0 && (
                      <p className="font-semibold text-green-600">Rs.{item.amount}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, changeText, icon }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-start space-x-4">
    {icon && <div>{icon}</div>}
    <div>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <div className="mt-2 text-green-600 text-sm">{changeText}</div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const { user, loading, initialLoadDone, logout } = useUser();
  console.log('[AdminDashboard] render', { user, loading, initialLoadDone });
  // Show loading only until first fetch is done
  if (!initialLoadDone) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar user={user} onLogout={logout} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
