// src/utils/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Shirt,
  ShoppingCart,
  Activity,
  Users,
  BarChart3,
  Factory,
  Group
} from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, to: '/admin' },
    { id: 'style', label: 'Style Management', icon: Shirt, to: '/admin/styles' },
    { id: 'stock', label: 'Stock Management', icon: Package, to: '/admin/stock' },
    { id: 'orders', label: 'Order Management', icon: ShoppingCart, to: '/admin/orders' },
    { id: 'processes', label: 'Process Tracking', icon: Activity, to: '/admin/processes' },
    { id: 'manage-worker', label: 'Worker Management', icon: Group, to: '/admin/manage-worker' },
    { id: 'workers', label: 'Worker Performance', icon: Users, to: '/admin/workers' },
    { id: 'reports', label: 'Reports', icon: BarChart3, to: '/admin/reports' }
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ClothFlow</h1>
            <p className="text-sm text-gray-600">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                  onClick={() => {
                    if (typeof onTabChange === 'function') onTabChange(item.id);
                  }}
                >
                  {/* Icon inherits color from parent (currentColor) */}
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
