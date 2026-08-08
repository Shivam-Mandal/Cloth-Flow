// src/components/ui/UIComponents.jsx
import React from 'react';
// motion removed
import { Loader2, AlertCircle, CheckCircle, Info, X } from 'lucide-react';

// Button Component
export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl focus:ring-blue-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl focus:ring-green-500',
    danger: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl focus:ring-red-500',
    outline: 'border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

// Card Component
export const Card = ({ children, className = '', hover = true, ...props }) => {
  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${hover ? 'hover:shadow-lg' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Badge Component
export const Badge = ({ children, variant = 'primary', size = 'md', className = '' }) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variants = {
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    secondary: 'bg-gray-100 text-gray-800',
    info: 'bg-cyan-100 text-cyan-800',
  };
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };
  
  return (
    <span className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};

// Input Component
export const Input = ({ label, error, className = '', ...props }) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

// Alert Component
export const Alert = ({ children, variant = 'info', onClose, className = '' }) => {
  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
  };
  
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    danger: AlertCircle,
  };
  
  const Icon = icons[variant];
  
  return (
    <div
      className={`p-4 border rounded-xl flex items-start space-x-3 ${variants[variant]} ${className}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-auto pl-3"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Loading Spinner
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };
  
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizes[size]} ${className}`} />
  );
};

// Stats Card Component
export const StatsCard = ({ title, value, change, icon, color = 'blue', trend = 'up' }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
    green: 'from-green-500 to-green-600 text-green-600 bg-green-50',
    yellow: 'from-yellow-500 to-yellow-600 text-yellow-600 bg-yellow-50',
    red: 'from-red-500 to-red-600 text-red-600 bg-red-50',
    purple: 'from-purple-500 to-purple-600 text-purple-600 bg-purple-50',
  };
  
  return (
    <div
      className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2 truncate">{title}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1 truncate">{value}</p>
          {change && (
            <p className={`text-xs sm:text-sm font-medium truncate ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r ${colors[color]} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <div className="text-white scale-90 sm:scale-100">{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Empty State Component
export const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      {action && action}
    </div>
  );
};

// Base Skeleton Component
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

// Table Rows Skeleton Component
export const TableSkeleton = ({ rows = 5, cols = 5, className = '' }) => (
  <div className={`space-y-3 w-full ${className}`}>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <div key={rIdx} className="flex items-center gap-4 py-3 px-4 bg-slate-50/80 rounded-xl border border-slate-100 animate-pulse">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <div
            key={cIdx}
            className={`h-4 bg-slate-200 rounded ${
              cIdx === 0 ? 'w-1/4' : cIdx === 1 ? 'w-1/3' : 'flex-1'
            }`}
          />
        ))}
      </div>
    ))}
  </div>
);

// Card Skeleton Grid
export const CardSkeleton = ({ count = 4, className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 ${className}`}>
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-7 bg-slate-300 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-1/3" />
      </div>
    ))}
  </div>
);

// Stats Card Skeleton
export const StatsCardSkeleton = ({ count = 4, className = '' }) => (
  <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 ${className}`}>
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse flex items-start justify-between">
        <div className="space-y-2 flex-1 mr-3">
          <div className="h-3.5 bg-slate-200 rounded w-2/3" />
          <div className="h-6 sm:h-8 bg-slate-300 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-3/4" />
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-200 shrink-0" />
      </div>
    ))}
  </div>
);