// src/components/admin/AdminDashboard.jsx
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../utils/Sidebar';
import Topbar from '../utils/Topbar';
import { useUser } from '../context/UserContext';
import { ShoppingCart, Package, Users, CheckCircle } from 'lucide-react';


export const Overview = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</div>
      </div>
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
          changeText="-5% from last week"
          icon={<Package className="w-6 h-6 text-green-600" />}
        />
        <StatCard
          title="Active Workers"
          value="18"
          changeText="+2 new this week"
          icon={<Users className="w-6 h-6 text-yellow-600" />}
        />
        <StatCard
          title="Completed Today"
          value="156"
          changeText="+18% efficiency"
          icon={<CheckCircle className="w-6 h-6 text-purple-600" />}
        />
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
  const { user, loading, initialLoadDone } = useUser();
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
        <Topbar user={user} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
