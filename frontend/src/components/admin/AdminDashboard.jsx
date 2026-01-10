// src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../utils/Sidebar';
import Topbar from '../utils/Topbar';
import { useUser } from '../context/UserContext';
import { motion } from 'framer-motion';
import { ShoppingCart, Package, Users, CheckCircle, Clock, BarChart3, Check, X, TrendingUp, TrendingDown } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-2">Monitor your manufacturing operations in real-time</p>
        </div>
        <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
          Last updated: {new Date().toLocaleString()}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Orders"
          value="24"
          changeText="+12% from last week"
          icon={<ShoppingCart className="w-6 h-6" />}
          trend="up"
          color="blue"
        />

        <StatCard
          title="Total Stock (kg)"
          value="1,250"
          changeText="Updated today"
          icon={<Package className="w-6 h-6" />}
          trend="neutral"
          color="green"
        />

        <StatCard
          title="Active Workers"
          value={activeWorkersCount}
          changeText="Currently logged in"
          icon={<Users className="w-6 h-6" />}
          trend="up"
          color="purple"
        />

        <StatCard
          title="Pending Approvals"
          value={pendingApprovals.length}
          changeText="Requires attention"
          icon={<Clock className="w-6 h-6" />}
          trend={pendingApprovals.length > 5 ? 'down' : 'neutral'}
          color="orange"
        />
      </div>

      {/* Approval Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Approvals */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              Pending Approvals
            </h2>
            <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
              {pendingApprovals.length} items
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-500 mt-3">Loading...</p>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {pendingApprovals.slice(0, 5).map((approval, index) => (
                <motion.div 
                  key={approval._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{approval.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Worker: {approval.completedBy?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted: {new Date(approval.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-lg">Rs.{approval.amount || 0}</p>
                    <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full mt-1">
                      Pending
                    </span>
                  </div>
                </motion.div>
              ))}
              {pendingApprovals.length > 5 && (
                <div className="text-center pt-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors duration-200">
                    View all {pendingApprovals.length} approvals →
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Recent Approval History */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              Recent Activity
            </h2>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {recentHistory.length} actions
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-3">Loading...</p>
            </div>
          ) : recentHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-medium">No recent activity</p>
              <p className="text-sm">Activity will appear here</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {recentHistory.map((item, index) => (
                <motion.div 
                  key={item._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.action === 'approved' ? 'bg-green-100' :
                      item.action === 'rejected' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      {item.action === 'approved' ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : item.action === 'rejected' ? (
                        <X className="w-5 h-5 text-red-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 capitalize">{item.action}</p>
                      <p className="text-sm text-gray-600">{item.subOrderName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.amount > 0 && (
                      <p className="font-bold text-green-600 text-lg">Rs.{item.amount}</p>
                    )}
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${
                      item.action === 'approved' ? 'bg-green-100 text-green-800' :
                      item.action === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.action}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, changeText, icon, trend = 'up', color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
    green: 'from-green-500 to-green-600 text-green-600 bg-green-50',
    yellow: 'from-yellow-500 to-yellow-600 text-yellow-600 bg-yellow-50',
    orange: 'from-orange-500 to-orange-600 text-orange-600 bg-orange-50',
    purple: 'from-purple-500 to-purple-600 text-purple-600 bg-purple-50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          <div className={`text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {changeText}
          </div>
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${colorClasses[color]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <div className="text-white">{icon}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

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
