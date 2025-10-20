import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useUser } from './context/UserContext'


// allowedRoles: array of allowed role strings, or omit to only require authentication
export default function ProtectedRoute({ allowedRoles = null, redirectTo = '/login' }) {
    const { user, loading, initialLoadDone } = useUser()
    const loc = useLocation()


    // While the initial auth check is running, show a minimal loader so routes don't flash
    if (!initialLoadDone || loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div>Loading...</div>
            </div>
        )
    }


    if (!user) {
        return <Navigate to={redirectTo} state={{ from: loc }} replace />
    }


    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // optionally you can navigate to a "not authorized" page
        return <Navigate to="/" replace />
    }


    return <Outlet />
}