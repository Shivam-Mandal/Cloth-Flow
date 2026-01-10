import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, ClipboardList, Package, TrendingUp, Factory, Clock, CheckCircle, BarChart3 } from "lucide-react";

export const WorkerSidebar = () => {
  const menuItems = [
    { id: "overview", label: "My Dashboard", icon: LayoutDashboard, path: "/worker/overview" },
    { id: "assigned", label: "Assigned Tasks", icon: ClipboardList, path: "/worker/assigned" },
    { id: "available", label: "Available Tasks", icon: Package, path: "/worker/available" },
    { id: "pending", label: "Pending Approvals", icon: Clock, path: "/worker/pending" },
    { id: "completed", label: "Completed Work", icon: CheckCircle, path: "/worker/completed" },
    { id: "approval-history", label: "Approval History", icon: BarChart3, path: "/worker/approval-history" },
    { id: "progress", label: "My Progress", icon: TrendingUp, path: "/worker/progress" },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
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
                  to={item.path}
                  className={({ isActive }) =>
                    `group relative w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-[1.02]'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:transform hover:scale-[1.01]'
                    }`
                  }
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
          <p className="text-xs text-gray-500">Worker Portal</p>
          <p className="text-xs text-gray-400 mt-1">© 2024 ClothFlow</p>
        </div>
      </div>
    </div>
  );
};
