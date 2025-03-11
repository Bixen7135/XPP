import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, Edit } from 'lucide-react';
import { TaskSheet } from '../types/supabase';
import { Question } from '../types/exam';

interface SheetCardProps {
  sheet: TaskSheet;
  tasks: Question[];
  onView: () => void;
  onEdit: (e: React.MouseEvent) => void;
  viewMode: 'grid' | 'list';
}

export const SheetCard: React.FC<SheetCardProps> = ({
  sheet,
  tasks,
  onView,
  onEdit,
  viewMode
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Count tasks by difficulty
  const difficultyCount = {
    easy: tasks.filter(task => task.difficulty === 'easy').length,
    medium: tasks.filter(task => task.difficulty === 'medium').length,
    hard: tasks.filter(task => task.difficulty === 'hard').length
  };

  // Get unique topics
  const topics = [...new Set(tasks.map(task => task.topic))];

  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-blue-200 transition-colors cursor-pointer"
        onClick={onView}
      >
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{sheet.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(sheet.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{sheet.tasks?.length || 0} tasks</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
      className="bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-blue-200 overflow-hidden transition-colors cursor-pointer"
      onClick={onView}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">{sheet.title}</h3>
        </div>
        
        {sheet.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{sheet.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(sheet.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>{sheet.tasks?.length || 0} tasks</span>
          </div>
        </div>
        
        {tasks.length > 0 && (
          <>
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-500 mb-1">Difficulty</div>
              <div className="flex items-center">
                <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  {difficultyCount.easy > 0 && (
                    <div 
                      className="absolute inset-y-0 left-0 bg-green-500"
                      style={{ width: `${(difficultyCount.easy / tasks.length) * 100}%` }}
                    ></div>
                  )}
                  {difficultyCount.medium > 0 && (
                    <div 
                      className="absolute inset-y-0 bg-yellow-500"
                      style={{ 
                        width: `${(difficultyCount.medium / tasks.length) * 100}%`,
                        left: `${(difficultyCount.easy / tasks.length) * 100}%` 
                      }}
                    ></div>
                  )}
                  {difficultyCount.hard > 0 && (
                    <div 
                      className="absolute inset-y-0 bg-red-500"
                      style={{ 
                        width: `${(difficultyCount.hard / tasks.length) * 100}%`,
                        left: `${((difficultyCount.easy + difficultyCount.medium) / tasks.length) * 100}%` 
                      }}
                    ></div>
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{difficultyCount.easy} easy</span>
                <span>{difficultyCount.medium} medium</span>
                <span>{difficultyCount.hard} hard</span>
              </div>
            </div>
            
            {topics.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 mb-1">Topics</div>
                <div className="flex flex-wrap gap-1">
                  {topics.slice(0, 3).map(topic => (
                    <span 
                      key={topic}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                    >
                      {topic}
                    </span>
                  ))}
                  {topics.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      +{topics.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        
        {sheet.tags && sheet.tags.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1">
              {sheet.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-end pt-2 border-t">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>
    </motion.div>
  );
}; 