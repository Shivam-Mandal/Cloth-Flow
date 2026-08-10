import React, { useState, useEffect } from 'react';
import { Bell, LogOut, User as UserIcon, Clock, ChevronDown, Target, Award, Menu } from 'lucide-react';
// motion removed
import { useLayout } from '../context/LayoutContext';
import ProfileModal from '../modals/ProfileModal';

export const WorkerTopbar = ({ user, onLogout }) => {
  const { toggleSidebar } = useLayout();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const notifications = [
    { id: 1, title: 'New task assigned', time: '5 min ago', type: 'task' },
    { id: 2, title: 'Task approved', time: '15 min ago', type: 'approval' },
  ];

  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
            <Clock className="w-5 h-5 text-green-600" />
            <span className="font-mono font-medium text-sm sm:text-base">{timeString}</span>
          </div>

          <div className="hidden md:block">
            <p className="text-sm text-gray-600">
              Welcome back, <span className="font-semibold text-gray-900">{user?.name || 'Worker'}</span>
            </p>
            <p className="text-xs text-green-600 font-medium">
              {user?.workerType || 'Production Worker'} • Active
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Quick Stats */}
          <div className="hidden lg:flex items-center space-x-4 mr-4">
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
              <Target className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">5 Tasks</span>
            </div>
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
              <Award className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">85% Rate</span>
            </div>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {notifications.length}
              </span>
            </button>

            {/* Notifications Dropdown */}

            {showNotifications && (
              <div
                className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50"
              >
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-100">
                  <button className="text-sm text-green-600 hover:text-green-800 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl"
            >
              <div className="w-9 h-9 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900">{user?.name || 'Worker'}</p>
                <p className="text-xs text-gray-600 capitalize">{user?.workerType || 'Production'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* User Dropdown */}

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50"
              >
                <div className="p-3 border-b border-gray-100">
                  <p className="font-medium text-gray-900">{user?.name || 'Worker'}</p>
                  <p className="text-sm text-gray-500">{user?.email || 'worker@company.com'}</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                </div>
                <div className="border-t border-gray-100 py-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout?.();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  );
};
