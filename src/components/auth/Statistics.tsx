import React, { useState, useEffect } from 'react';
import { PageLayout } from '../common/PageLayout';
import { motion } from 'framer-motion';
import { Award, CheckCircle, TrendingUp, Clock, BookOpen } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface UserStats {
  solvedTasks: number;
  totalTasks: number;
  successRate: number;
  averageScore: number;
  submissionsCount: number;
  recentActivity: number;
  tasksByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export const Statistics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({
    solvedTasks: 0,
    totalTasks: 0,
    successRate: 0,
    averageScore: 0,
    submissionsCount: 0,
    recentActivity: 0,
    tasksByDifficulty: {
      easy: 0,
      medium: 0,
      hard: 0
    }
  });
  
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would fetch actual statistics from the backend
        // For now, we'll use placeholder data
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Sample data
        setStats({
          solvedTasks: 24,
          totalTasks: 50,
          successRate: 0.85,
          averageScore: 8.7,
          submissionsCount: 32,
          recentActivity: 5,
          tasksByDifficulty: {
            easy: 12,
            medium: 8,
            hard: 4
          }
        });
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatistics();
  }, []);
  
  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout maxWidth="2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">My Statistics</h1>
          <p className="text-gray-600">
            Track your progress and performance on the platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-4">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Solved Tasks</div>
                <div className="text-2xl font-bold">{stats.solvedTasks}</div>
                <div className="text-xs text-gray-500">out of {stats.totalTasks}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-4">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Success Rate</div>
                <div className="text-2xl font-bold">{(stats.successRate * 100).toFixed(1)}%</div>
                <div className="text-xs text-gray-500">{stats.submissionsCount} submissions</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mr-4">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Average Score</div>
                <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</div>
                <div className="text-xs text-gray-500">points per task</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mr-4">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Recent Activity</div>
                <div className="text-2xl font-bold">{stats.recentActivity}</div>
                <div className="text-xs text-gray-500">submissions this week</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Tasks by Difficulty</h3>
          <div className="flex items-center p-4">
            <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-green-500"
                style={{ width: `${stats.tasksByDifficulty.easy / stats.solvedTasks * 100}%` }}
              ></div>
              <div 
                className="absolute inset-y-0 left-0 bg-yellow-500"
                style={{ 
                  width: `${stats.tasksByDifficulty.medium / stats.solvedTasks * 100}%`,
                  marginLeft: `${stats.tasksByDifficulty.easy / stats.solvedTasks * 100}%` 
                }}
              ></div>
              <div 
                className="absolute inset-y-0 left-0 bg-red-500"
                style={{ 
                  width: `${stats.tasksByDifficulty.hard / stats.solvedTasks * 100}%`,
                  marginLeft: `${(stats.tasksByDifficulty.easy + stats.tasksByDifficulty.medium) / stats.solvedTasks * 100}%` 
                }}
              ></div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Easy ({stats.tasksByDifficulty.easy})</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Medium ({stats.tasksByDifficulty.medium})</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Hard ({stats.tasksByDifficulty.hard})</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Submissions</h3>
          <div className="text-center py-8 text-gray-500">
            No recent submissions found.
          </div>
        </div>
      </motion.div>
    </PageLayout>
  );
}; 