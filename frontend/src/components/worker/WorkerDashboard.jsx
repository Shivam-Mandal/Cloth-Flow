import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { WorkerSidebar } from './WorkerSidebar';
import { WorkerTopbar } from './WorkerTopbar';
import { useUser } from '../context/UserContext';
import { useLayout } from '../context/LayoutContext';

import WorkerMobileBottomNav from '../navigation/WorkerMobileBottomNav';

const WorkerDashboard = () => {
  const { user, loading, initialLoadDone, logout } = useUser();
  const { sidebarOpen } = useLayout();

  if (!initialLoadDone) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      <WorkerSidebar />  
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-0' : 'ml-0'
      } min-w-0`}>
        <WorkerTopbar user={user} onLogout={logout} />
        <main className="flex-1 overflow-auto p-3 sm:p-6 pb-24 lg:pb-6">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <WorkerMobileBottomNav />
    </div>
  );
}

export default WorkerDashboard;