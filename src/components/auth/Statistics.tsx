import React, { useState, useEffect } from 'react';
import { PageLayout } from '../common/PageLayout';
import { motion } from 'framer-motion';
import { Award, CheckCircle, TrendingUp, Clock, BookOpen } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { AdaptiveLearningProgress } from '../AdaptiveLearningProgress';
import { SpacedRepetitionProgress } from '../SpacedRepetitionProgress';
import type { AdaptiveMetrics, SpacedRepetitionMetrics } from '../../types/analytics';

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

  const [adaptiveMetrics, setAdaptiveMetrics] = useState<AdaptiveMetrics | null>(null);
  const [spacedRepetitionMetrics, setSpacedRepetitionMetrics] = useState<SpacedRepetitionMetrics | null>(null);
  
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
       
        const { data: basicStats } = await supabase
          .from('user_statistics')
          .select('*')
          .single();
        
        if (basicStats) {
          setStats(basicStats);
        }

        
        const { data: adaptiveData } = await supabase
          .from('adaptive_metrics')
          .select('*')
          .single();

        if (adaptiveData) {
          setAdaptiveMetrics(adaptiveData);
        }

       
        const { data: spacedData } = await supabase
          .from('spaced_repetition')
          .select('*')
          .single();

        if (spacedData) {
          setSpacedRepetitionMetrics(spacedData);
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatistics();
  }, []);

  const handleStartReview = async (items: SpacedRepetitionMetrics['items']) => {
   
    console.log('Starting review session with items:', items);
  };
  
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        
        {adaptiveMetrics && (
          <AdaptiveLearningProgress metrics={adaptiveMetrics} />
        )}

        
        {spacedRepetitionMetrics && (
          <SpacedRepetitionProgress 
            metrics={spacedRepetitionMetrics}
            onStartReview={handleStartReview}
          />
        )}

       
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-2">
              <Award className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Success Rate</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {(stats.successRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {stats.solvedTasks} tasks completed
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Average Score</h3>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {stats.averageScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Out of 10
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {stats.recentActivity}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Tasks in last 7 days
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-2">
              <BookOpen className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Total Submissions</h3>
            </div>
            <div className="text-3xl font-bold text-orange-400">
              {stats.submissionsCount}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Practice attempts
            </div>
          </motion.div>
        </div>

       
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700"
        >
          <h3 className="text-lg font-semibold mb-4 text-white">Tasks by Difficulty</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-24 text-white">Easy</div>
              <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-400 rounded-full"
                  style={{ width: `${(stats.tasksByDifficulty.easy / stats.solvedTasks) * 100}%` }}
                ></div>
              </div>
              <div className="ml-2 w-8 text-right text-white">{stats.tasksByDifficulty.easy}</div>
            </div>
            <div className="flex items-center">
              <div className="w-24 text-white">Medium</div>
              <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 rounded-full"
                  style={{ width: `${(stats.tasksByDifficulty.medium / stats.solvedTasks) * 100}%` }}
                ></div>
              </div>
              <div className="ml-2 w-8 text-right text-white">{stats.tasksByDifficulty.medium}</div>
            </div>
            <div className="flex items-center">
              <div className="w-24 text-white">Hard</div>
              <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-400 rounded-full"
                  style={{ width: `${(stats.tasksByDifficulty.hard / stats.solvedTasks) * 100}%` }}
                ></div>
              </div>
              <div className="ml-2 w-8 text-right text-white">{stats.tasksByDifficulty.hard}</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </PageLayout>
  );
}; 