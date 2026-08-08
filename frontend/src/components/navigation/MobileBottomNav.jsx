// src/components/navigation/MobileBottomNav.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckCircle, ShoppingCart, Boxes, Menu } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';

export const MobileBottomNav = () => {
  const { toggleSidebar, sidebarOpen } = useLayout();

  const mainTabs = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, to: '/admin', end: true },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle, to: '/admin/approvals' },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, to: '/admin/orders' },
    { id: 'inventory', label: 'Inventory', icon: Boxes, to: '/admin/inventory' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 select-none active:scale-95 ${
                  isActive
                    ? 'text-blue-600 font-semibold'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-600 scale-110 shadow-sm' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}

        {/* More Tab / Sidebar Trigger */}
        <button
          type="button"
          onClick={toggleSidebar}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 select-none active:scale-95 ${
            sidebarOpen ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
          aria-label="More navigation items"
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 ${sidebarOpen ? 'bg-blue-50 text-blue-600 scale-110 shadow-sm' : ''}`}>
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
