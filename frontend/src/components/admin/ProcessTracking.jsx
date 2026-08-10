import React, { useEffect, useState } from 'react';
import { Activity, Clock, CheckCircle, AlertCircle, Users, RotateCw } from 'lucide-react';

export const ProcessTracking = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    setTimeout(() => {
      setRefreshing(false);
      setLoading(false);
    }, 400);
  };

  useEffect(() => {
    const handleGlobalRefresh = () => {
      handleRefresh();
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('app:refresh', handleGlobalRefresh);
  }, []);

  const processStages = [
    { name: 'Cutting', orders: 8, workers: 5, efficiency: 85, avgTime: '2.5h', status: 'efficient' },
    { name: 'Stitching', orders: 12, workers: 8, efficiency: 70, avgTime: '4.2h', status: 'bottleneck' },
    { name: 'Washing', orders: 6, workers: 3, efficiency: 92, avgTime: '1.8h', status: 'efficient' },
    { name: 'Finishing', orders: 4, workers: 2, efficiency: 88, avgTime: '1.5h', status: 'active' }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'efficient': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'bottleneck': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'efficient': return 'bg-green-100 text-green-800';
      case 'bottleneck': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Process Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor production stages and efficiency</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Real-time updates</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white p-3.5 sm:p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse space-y-4">
              <div className="flex justify-between items-center"><div className="h-5 w-24 bg-slate-200 rounded" /><div className="h-5 w-5 bg-slate-200 rounded-full" /></div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-slate-200 rounded" />
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-2 w-full bg-slate-200 rounded-full" />
                <div className="h-4 w-1/2 bg-slate-200 rounded" />
              </div>
            </div>
          ))
        ) : (
          processStages.map((stage) => (
          <div key={stage.name} className="bg-white p-3.5 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{stage.name}</h3>
              {getStatusIcon(stage.status)}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Orders</span>
                <span className="font-medium text-gray-900">{stage.orders}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Workers</span>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{stage.workers}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Efficiency</span>
                <span className="font-medium text-gray-900">{stage.efficiency}%</span>
              </div>

              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    stage.efficiency >= 85 ? 'bg-green-500' : stage.efficiency >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stage.efficiency}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg. Time</span>
                <span className="font-medium text-gray-900">{stage.avgTime}</span>
              </div>

              <div className="pt-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(stage.status)}`}>
                  {stage.status}
                </span>
              </div>
            </div>
          </div>
        ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Process Flow Visualization */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Flow Visualization</h3>
          <div className="space-y-4">
            {processStages.map((stage, index) => (
              <div key={stage.name} className="relative">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    stage.status === 'efficient' ? 'bg-green-100' : 
                    stage.status === 'bottleneck' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <span className={`text-sm font-bold ${
                      stage.status === 'efficient' ? 'text-green-700' : 
                      stage.status === 'bottleneck' ? 'text-red-700' : 'text-blue-700'
                    }`}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">{stage.name}</p>
                    <p className="text-sm text-gray-600">{stage.orders} orders • {stage.workers} workers</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{stage.efficiency}%</p>
                    <p className="text-xs text-gray-600">{stage.avgTime}</p>
                  </div>
                </div>
                {index < processStages.length - 1 && (
                  <div className="absolute left-5 top-10 w-0.5 h-6 bg-gray-300"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Process Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Alerts</h3>
          <div className="space-y-3">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Bottleneck Alert</p>
                  <p className="text-sm text-red-700">Stitching process is running below 70% efficiency</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Deadline Warning</p>
                  <p className="text-sm text-yellow-700">Order ORD-002 deadline in 2 days</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Process Optimized</p>
                  <p className="text-sm text-green-700">Washing efficiency improved to 92%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
