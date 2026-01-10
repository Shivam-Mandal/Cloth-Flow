// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginForm } from './components/auth/LoginForm';
import AdminDashboard, { Overview } from './components/admin/AdminDashboard';
import StyleManagement from './components/admin/StyleManagement';
import { StockManagement } from './components/admin/StockManagement';
import { OrderManagement } from './components/admin/OrderManagement';
import ApprovalManagement from './components/admin/ApprovalManagement';
import ProtectedRoute from './components/ProtectedRoutes';
import { useUser } from './components/context/UserContext';
import { LayoutProvider } from './components/context/LayoutContext';
import WorkerDashboard from './components/worker/WorkerDashboard';
import AssignedTasks from './components/worker/AssignedTasks';
import AvailableTasks from './components/worker/AvailableTasks';
import WorkerOverview from './components/worker/WorkerOverview'; // default import
import WorkerPendingApprovals from './components/worker/WorkerPendingApprovals';
import WorkerCompletedWork from './components/worker/WorkerCompletedWork';
import ApprovalHistory from './components/admin/ApprovalHistory';
import WorkerApprovalHistory from './components/worker/WorkerApprovalHistory';

export default function App() {
  const { user, initialLoadDone } = useUser();
  if (!initialLoadDone) {
    // Only show loading until first fetch finishes
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <LayoutProvider>
      <BrowserRouter>
        <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginForm />} />
        <Route
          path="/"
          element={user ? <Navigate to={`/${user.role}`} replace /> : <Navigate to="/login" replace />}
        />

        {/* Admin area - all routes under /admin are protected */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<Overview />} />
            <Route path="approvals" element={<ApprovalManagement />} />
            <Route path="approval-history" element={<ApprovalHistory />} />
            <Route path="styles" element={<StyleManagement />} />
            <Route path="stock" element={<StockManagement />} />
            <Route path="orders" element={<OrderManagement />} />
          </Route>
        </Route>

        {/* Worker area */}
        <Route element={<ProtectedRoute allowedRoles={['worker']} />}>
          <Route path="/worker" element={<WorkerDashboard />}>
            <Route
              index
              element={<WorkerOverview />} /* WorkerOverview will derive workerId/workerCategory */
            />
            <Route
              path="assigned"
              element={<AssignedTasks workerId={user?._id} workerCategory={user?.workerType || user?.worker_type} />}
            />
            <Route
              path="available"
              element={<AvailableTasks workerId={user?._id} workerCategory={user?.workerType || user?.worker_type} />}
            />
            <Route path="pending" element={<WorkerPendingApprovals />} />
            <Route path="completed" element={<WorkerCompletedWork />} />
            <Route path="approval-history" element={<WorkerApprovalHistory />} />
          </Route>
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LayoutProvider>
  );
}
