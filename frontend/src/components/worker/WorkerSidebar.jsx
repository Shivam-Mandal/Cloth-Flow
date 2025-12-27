import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Package, TrendingUp, Factory, Clock, CheckCircle, BarChart3 } from "lucide-react";

export const WorkerSidebar = () => {
  const menuItems = [
    { id: "overview", label: "My Dashboard", icon: LayoutDashboard, path: "/worker/overview" },
    { id: "assigned", label: "Assigned Tasks", icon: ClipboardList, path: "/worker/assigned" },
    { id: "available", label: "Available Tasks", icon: Package, path: "/worker/available" },
    { id: "pending", label: "Pending Approvals", icon: Clock, path: "/worker/pending" },
    { id: "completed", label: "Completed Work", icon: CheckCircle, path: "/worker/completed" },
    { id: "approval-history", label: "Approval History", icon: TrendingUp, path: "/worker/approval-history" },
    { id: "progress", label: "My Progress", icon: TrendingUp, path: "/worker/progress" },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ClothFlow</h1>
            <p className="text-sm text-gray-600">Worker Panel</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
