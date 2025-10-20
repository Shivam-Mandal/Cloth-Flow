import React, { useState } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, Package } from 'lucide-react';

export const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedReport, setSelectedReport] = useState('overview');

  const reportTypes = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'orders', label: 'Order Reports', icon: Package },
    { id: 'workers', label: 'Worker Reports', icon: TrendingUp },
    { id: 'financial', label: 'Financial', icon: DollarSign }
  ];

  const periods = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive business reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>{period.label}</option>
            ))}
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {reportTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedReport === type.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{type.label}</span>
            </button>
          );
        })}
      </div>

      {selectedReport === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Orders Completed</span>
                <span className="text-2xl font-bold text-green-600">24</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Total Pieces Produced</span>
                <span className="text-2xl font-bold text-blue-600">1,247</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Raw Material Used</span>
                <span className="text-2xl font-bold text-purple-600">312 kg</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Average Efficiency</span>
                <span className="text-2xl font-bold text-orange-600">87%</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance</h3>
            <div className="space-y-4">
              {[
                { dept: 'Cutting', efficiency: 92, pieces: 345 },
                { dept: 'Stitching', efficiency: 78, pieces: 289 },
                { dept: 'Washing', efficiency: 95, pieces: 234 },
                { dept: 'Finishing', efficiency: 88, pieces: 198 }
              ].map((dept) => (
                <div key={dept.dept} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">{dept.dept}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{dept.efficiency}%</span>
                      <span className="text-xs text-gray-600 ml-2">{dept.pieces} pieces</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        dept.efficiency >= 85 ? 'bg-green-500' : dept.efficiency >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dept.efficiency}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedReport === 'financial' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Revenue</span>
                <span className="text-xl font-bold text-green-600">$45,670</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Material Costs</span>
                <span className="text-xl font-bold text-red-600">$12,340</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Labor Costs</span>
                <span className="text-xl font-bold text-orange-600">$18,920</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Net Profit</span>
                  <span className="text-2xl font-bold text-blue-600">$14,410</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Trend</h3>
            <div className="h-64 flex items-end justify-between space-x-2">
              {[65, 78, 52, 89, 76, 94, 83].map((value, index) => (
                <div
                  key={index}
                  className="flex-1 bg-blue-600 rounded-t-md transition-all duration-300 hover:bg-blue-700"
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs text-gray-600">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
