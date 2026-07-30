import React from 'react';
import { TrendingUp, Award, Clock, Target, Calendar } from 'lucide-react';

export const WorkProgress = () => {
  const weeklyData = [
    { day: 'Mon', pieces: 28, hours: 8 },
    { day: 'Tue', pieces: 32, hours: 8 },
    { day: 'Wed', pieces: 25, hours: 7 },
    { day: 'Thu', pieces: 30, hours: 8 },
    { day: 'Fri', pieces: 35, hours: 8 },
    { day: 'Sat', pieces: 20, hours: 6 },
    { day: 'Sun', pieces: 0, hours: 0 }
  ];

  const achievements = [
    { title: 'Quality Champion', description: 'Maintained 95%+ quality score for 30 days', date: '2025-01-10', color: 'bg-yellow-100 text-yellow-800' },
    { title: 'Speed Demon', description: 'Completed 50+ pieces in a single day', date: '2025-01-08', color: 'bg-blue-100 text-blue-800' },
    { title: 'Consistency King', description: 'Met daily targets for 2 weeks straight', date: '2025-01-05', color: 'bg-green-100 text-green-800' }
  ];

  const maxPieces = Math.max(...weeklyData.map(d => d.pieces));
  const totalPieces = weeklyData.reduce((sum, d) => sum + d.pieces, 0);
  const totalHours = weeklyData.reduce((sum, d) => sum + d.hours, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Progress</h1>
          <p className="text-gray-600 mt-1">Track your performance and achievements</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">This Week</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalPieces}</p>
              <p className="text-xs text-gray-500">pieces completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Hours Worked</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalHours}h</p>
              <p className="text-xs text-gray-500">this week</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Efficiency</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">92%</p>
              <p className="text-xs text-green-600">+5% from last week</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Quality Score</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">9.6/10</p>
              <p className="text-xs text-green-600">Excellent</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Performance</h3>
          <div className="space-y-4">
            <div className="h-48 flex items-end justify-between space-x-2">
              {weeklyData.map((day) => (
                <div key={day.day} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-600 rounded-t-md transition-all duration-300 hover:bg-blue-700 cursor-pointer"
                    style={{
                      height: `${maxPieces > 0 ? (day.pieces / maxPieces) * 100 : 0}%`,
                      minHeight: day.pieces > 0 ? '20px' : '4px'
                    }}
                    title={`${day.pieces} pieces`}
                  ></div>
                  <span className="text-xs text-gray-600 mt-2">{day.day}</span>
                  <span className="text-xs text-gray-500">{day.pieces}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Daily Average:</span>
                <span className="font-medium text-gray-900">{Math.round(totalPieces / 6)} pieces</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
          <div className="space-y-4">
            {achievements.map((achievement, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Award className="w-6 h-6 text-orange-500" />
                    <div>
                      <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${achievement.color}`}>
                    New
                  </span>
                </div>
                <div className="flex items-center space-x-1 mt-3 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>Earned on {new Date(achievement.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Goals</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Pieces Target</span>
              <span className="text-sm text-gray-600">750/1000</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: '75%' }}></div>
            </div>
            <p className="text-xs text-gray-600">75% complete - 250 pieces remaining</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Quality Score</span>
              <span className="text-sm text-gray-600">9.6/10</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full">
              <div className="h-full bg-green-600 rounded-full transition-all duration-300" style={{ width: '96%' }}></div>
            </div>
            <p className="text-xs text-gray-600">Excellent performance</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Efficiency</span>
              <span className="text-sm text-gray-600">92%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full">
              <div className="h-full bg-purple-600 rounded-full transition-all duration-300" style={{ width: '92%' }}></div>
            </div>
            <p className="text-xs text-gray-600">Above department average</p>
          </div>
        </div>
      </div>
    </div>
  );
};
