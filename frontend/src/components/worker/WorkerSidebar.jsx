import React from "react";
import { NavLink } from "react-router-dom";
// motion removed
import { useLayout } from '../context/LayoutContext';
import { LayoutDashboard, TrendingUp, Factory, BarChart3, X, Boxes } from "lucide-react";
import { useUser } from "../context/UserContext";

export const WorkerSidebar = () => {
  const { sidebarOpen, closeSidebar, isMobile } = useLayout();
  const { user } = useUser();
  const workerType = String(user?.workerType || '').toLowerCase();
  const menuItems = [
    { id: "overview", label: "My Dashboard", icon: LayoutDashboard, path: "/worker/overview" },
    { id: "approval-history", label: "Approval History", icon: BarChart3, path: "/worker/approval-history" },
    { id: "progress", label: "My Progress", icon: TrendingUp, path: "/worker/progress" },
    ...(workerType === 'inventory'
      ? [{ id: "inventory", label: "Inventory", icon: Boxes, path: "/worker/inventory" }]
      : [])
  ];

  return (
    <>
      {/* Mobile Overlay */}

        {isMobile && sidebarOpen && (
          <div



            onClick={closeSidebar}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          />
        )}


      {/* Sidebar */}

        {sidebarOpen && (
          <div




            className={`${
              isMobile ? 'fixed' : 'relative'
            } w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-50 h-full`}
          >
            {/* Mobile Close Button */}
            {isMobile && (
              <button
                onClick={closeSidebar}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Factory className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">ClothFlow</h1>
                  <p className="text-sm text-gray-600">Worker Panel</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <ul className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.id}



                    >
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `group relative w-full flex items-center justify-between px-4 py-3 rounded-xl ${
                            isActive
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`
                        }
                        onClick={() => {
                          if (isMobile) closeSidebar();
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        
                        {/* Active indicator */}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full opacity-0 group-[.active]:opacity-100" />
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-center">
                <p className="text-xs text-gray-500">Worker Portal</p>
                <p className="text-xs text-gray-400 mt-1">© 2024 ClothFlow</p>
              </div>
            </div>
          </div>
        )}

    </>
  );
};
