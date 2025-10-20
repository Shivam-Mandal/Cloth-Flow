import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import {LoginForm} from './components/auth/LoginForm'
import AdminDashboard, { Overview } from './components/admin/AdminDashboard'
import StyleManagement from './components/admin/StyleManagement'
import {StockManagement} from './components/admin/StockManagement'
import {OrderManagement} from './components/admin/OrderManagement'
import ProtectedRoute from './components/ProtectedRoutes'
import { useUser } from './components/context/UserContext'


export default function App() {
  const { user,initialLoadDone   } = useUser()
 if (!initialLoadDone) {
    // Only show loading until first fetch finishes
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/" element={user ? <Navigate to={`/${user.role}`} replace /> : <Navigate to="/login" replace />} />


        {/* Admin area - all routes under /admin are protected */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />}>
            <Route index element={<Overview />} />
            <Route path="styles" element={<StyleManagement />} />
            <Route path="stock" element={<StockManagement />} />
            <Route path="orders" element={<OrderManagement />} />
            {/* add deeper nested admin routes here */}
          </Route>
        </Route>


        {/* Worker area (example) */}
        <Route element={<ProtectedRoute allowedRoles={["worker"]} />}>
          <Route path="/worker" element={<div className="p-6">Worker Home (stub)</div>} />
        </Route>


        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}