// src/utils/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Shirt,
  ShoppingCart,
  Activity,
  Users,
  BarChart3,
  Factory,
  Group,
  CheckCircle
} from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, to: '/admin' },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle, to: '/admin/approvals' },
    { id: 'approval-history', label: 'Approval History', icon: BarChart3, to: '/admin/approval-history' },
    { id: 'style', label: 'Style Management', icon: Shirt, to: '/admin/styles' },
    { id: 'stock', label: 'Stock Management', icon: Package, to: '/admin/stock' },
    { id: 'orders', label: 'Order Management', icon: ShoppingCart, to: '/admin/orders' },
    { id: 'processes', label: 'Process Tracking', icon: Activity, to: '/admin/processes' },
    { id: 'manage-worker', label: 'Worker Management', icon: Group, to: '/admin/manage-worker' },
    { id: 'workers', label: 'Worker Performance', icon: Users, to: '/admin/workers' },
    { id: 'reports', label: 'Reports', icon: BarChart3, to: '/admin/reports' }
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ClothFlow</h1>
            <p className="text-sm text-gray-600">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-auto">
        <ul className="space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <NavLink
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    `group relative w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-[1.02]'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:transform hover:scale-[1.01]'
                    }`
                  }
                  onClick={() => {
                    if (typeof onTabChange === 'function') onTabChange(item.id);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  
                  {/* Active indicator */}
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full opacity-0 group-[.active]:opacity-100 transition-opacity" />
                </NavLink>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-xs text-gray-500">Version 2.0.1</p>
          <p className="text-xs text-gray-400 mt-1">© 2024 ClothFlow</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
