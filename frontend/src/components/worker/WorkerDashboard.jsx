import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { WorkerSidebar } from './WorkerSidebar';
import { WorkerTopbar } from './WorkerTopbar';
import { useUser } from '../context/UserContext'; // or wherever your auth context is

const WorkerDashboard=() =>{
  const { user, loading, initialLoadDone, logout } = useUser();

  if (!initialLoadDone) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-gray-50">
      <WorkerSidebar />  
      <div className="flex-1 flex flex-col overflow-hidden">
        <WorkerTopbar user={user} onLogout={logout} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />  
        </main>
      </div>
    </div>
  );
}

export default WorkerDashboard;