// src/components/navigation/WorkerMobileBottomNav.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Clock, CheckSquare, Menu } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';

export const WorkerMobileBottomNav = () => {
  const { toggleSidebar, sidebarOpen } = useLayout();

  const workerTabs = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard, to: '/worker/overview' },
    { id: 'available', label: 'Available', icon: ClipboardList, to: '/worker/available' },
    { id: 'assigned', label: 'Assigned', icon: CheckSquare, to: '/worker/assigned' },
    { id: 'pending', label: 'Pending', icon: Clock, to: '/worker/pending' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {workerTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 select-none active:scale-95 ${
                  isActive
                    ? 'text-emerald-600 font-semibold'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-emerald-50 text-emerald-600 scale-110 shadow-sm' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}

        {/* More Menu Trigger */}
        <button
          type="button"
          onClick={toggleSidebar}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 select-none active:scale-95 ${
            sidebarOpen ? 'text-emerald-600 font-semibold' : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
          aria-label="More options"
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 ${sidebarOpen ? 'bg-emerald-50 text-emerald-600 scale-110 shadow-sm' : ''}`}>
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
};

export default WorkerMobileBottomNav;
