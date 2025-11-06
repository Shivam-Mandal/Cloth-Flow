// src/components/worker/WorkerOverview.jsx
import React from "react";

const tasksData = [
  { id: "TSK-001", order: "ORD-001", process: "Cutting", pieces: 50, completed: 12, deadline: "2025-01-15" },
  { id: "TSK-002", order: "ORD-002", process: "Stitching", pieces: 30, completed: 18, deadline: "2025-01-16" },
  { id: "TSK-003", order: "ORD-003", process: "Finishing", pieces: 25, completed: 5, deadline: "2025-01-17" }
];

export const WorkerOverview = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Today's Tasks" value="5" color="blue" />
        <StatCard title="Completed" value="28" color="green" />
        <StatCard title="Efficiency" value="92%" color="purple" />
        <StatCard title="Earnings" value="$1,250" color="orange" />
      </div>

      {/* Current Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Current Tasks</h3>
          <div className="space-y-3">
            {tasksData.map((task) => (
              <div key={task.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{task.id}</p>
                    <p className="text-sm text-gray-600">{task.order} - {task.process}</p>
                  </div>
                  <span className="text-xs text-gray-500">{task.deadline}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {task.completed}/{task.pieces} pieces
                  </span>
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all duration-300 bg-blue-600`}
                      style={{ width: `${(task.completed / task.pieces) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance This Week */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance This Week</h3>
          <div className="space-y-4">
            <PerformanceCard title="Pieces Completed" value="156" change="+12% from last week" color="green" />
            <PerformanceCard title="Efficiency Rate" value="92%" change="Above department average" color="blue" />
            <PerformanceCard title="Quality Score" value="9.2/10" change="Excellent quality rating" color="purple" />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Helper components ---
const StatCard = ({ title, value, color }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between`}>
    <div>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
    <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
      <div className={`w-6 h-6 bg-${color}-600 rounded`}></div>
    </div>
  </div>
);

const PerformanceCard = ({ title, value, change, color }) => (
  <div className={`p-4 bg-${color}-50 border border-${color}-200 rounded-lg`}>
    <div className="flex items-center justify-between">
      <span className={`font-medium text-${color}-800`}>{title}</span>
      <span className={`text-xl font-bold text-${color}-600`}>{value}</span>
    </div>
    <p className={`text-sm text-${color}-700 mt-1`}>{change}</p>
  </div>
);

export default WorkerOverview;
