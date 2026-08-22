// src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../utils/Sidebar';
import Topbar from '../utils/Topbar';
import { useUser } from '../context/UserContext';
import { useLayout } from '../context/LayoutContext';
// motion removed
import { ShoppingCart, Package, Users, CheckCircle, Clock, BarChart3, Check, X, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchPendingApprovals, fetchApprovalHistory } from '../services/approvalServices';
import { getActiveWorkersCount } from '../services/workerService';
import { getOrders } from '../services/orderServices';
import stockService from '../services/stockServices';
import { fetchInventory } from '../services/inventoryServices';
import { toast } from 'react-toastify';

const DASHBOARD_REFRESH_INTERVAL_MS = 30000;

const normalizeOrdersResponse = (res) => {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.orders)) return data.orders;
  return [];
};

const clampProgress = (value) => {
  const progress = Number(value);
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, Math.round(progress)));
};

const getActiveOrdersCount = (orders = []) => orders.filter((order) => {
  const status = String(order?.status || order?.currentStage || '').trim().toLowerCase();
  return status !== 'cancelled' && status !== 'canceled' && status !== 'completed' && clampProgress(order?.progress) < 100;
}).length;

const formatNumber = (value, options) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat(undefined, options).format(number);
};

export const Overview = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [activeWorkersCount, setActiveWorkersCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [totalStockKg, setTotalStockKg] = useState(0);
  const [packedInventoryPcs, setPackedInventoryPcs] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const refreshTimer = window.setInterval(loadDashboardData, DASHBOARD_REFRESH_INTERVAL_MS);

    const handleGlobalRefresh = () => {
      loadDashboardData();
    };

    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('app:refresh', handleGlobalRefresh);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [pendingRes, historyRes, workersRes, ordersRes, stockSummary, inventoryRes] = await Promise.all([
        fetchPendingApprovals(),
        fetchApprovalHistory({ limit: 5 }),
        getActiveWorkersCount(),
        getOrders(),
        stockService.fetchStockSummary(),
        fetchInventory().catch(() => null)
      ]);

      if (pendingRes?.success) {
        setPendingApprovals(pendingRes.approvals || []);
      }

      if (historyRes?.success) {
        setRecentHistory(historyRes.history || []);
      }

      if (workersRes?.success) {
        setActiveWorkersCount(workersRes.activeWorkersCount || 0);
      }

      setActiveOrdersCount(getActiveOrdersCount(normalizeOrdersResponse(ordersRes)));
      setTotalStockKg(stockSummary?.totalStockKg || 0);
      setPackedInventoryPcs(inventoryRes?.summary?.availablePieces || 0);
      setLastUpdated(new Date());
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor your manufacturing operations in real-time</p>
        </div>
        <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg whitespace-nowrap">
          Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Loading...'}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Active Orders"
          value={loading ? '...' : formatNumber(activeOrdersCount)}
          changeText="Live from orders"
          icon={<ShoppingCart className="w-6 h-6" />}
          trend="neutral"
          color="blue"
        />

        <StatCard
          title="Raw Fabric Stock"
          value={loading ? '...' : `${formatNumber(totalStockKg, { maximumFractionDigits: 2 })} kg`}
          changeText={`Packed Inventory: ${packedInventoryPcs} pcs`}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Pending Approvals */}
        <div


          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg"
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
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
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
              {pendingApprovals.slice(0, 5).map((approval) => (
                <div
                  key={approval._id}


                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100"
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
                </div>
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
        </div>

        {/* Recent Approval History */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg"
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
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
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
              {recentHistory.map((item) => (
                <div
                  key={item._id}


                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.action === 'approved' ? 'bg-green-100' :
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
                      <p className="text-sm text-gray-600 font-medium">
                        {item.subOrder?.subOrderCode || item.subOrder?.code || item.subOrder?.name || item.metadata?.subOrderName || item.subOrderName || 'Task'}
                        {item.actor?.name ? ` • by ${item.actor.name}` : ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.amount > 0 && (
                      <p className="font-bold text-green-600 text-lg">Rs.{item.amount}</p>
                    )}
                    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${item.action === 'approved' ? 'bg-green-100 text-green-800' :
                        item.action === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {item.action}
                    </span>
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

const StatCard = ({ title, value, changeText, icon, trend = 'up', color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
    green: 'from-green-500 to-green-600 text-green-600 bg-green-50',
    yellow: 'from-yellow-500 to-yellow-600 text-yellow-600 bg-yellow-50',
    orange: 'from-orange-500 to-orange-600 text-orange-600 bg-orange-50',
    purple: 'from-purple-500 to-purple-600 text-purple-600 bg-purple-50',
  };

  return (
    <div
      className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2 truncate">{title}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">{value}</p>
          <div className={`text-xs sm:text-sm font-medium truncate ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
            {changeText}
          </div>
        </div>
        {icon && (
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r ${colorClasses[color]} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <div className="text-white scale-90 sm:scale-100">{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
};

import MobileBottomNav from '../navigation/MobileBottomNav';

export default function AdminDashboard() {
  const { user, initialLoadDone, logout } = useUser();
  const { sidebarOpen } = useLayout();

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
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      <Sidebar />
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'lg:ml-0' : 'ml-0'
        } min-w-0`}>
        <Topbar user={user} onLogout={logout} />
        <main className="flex-1 overflow-auto p-3 sm:p-6 pb-24 lg:pb-6">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
