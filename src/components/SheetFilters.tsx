import React, { useState } from 'react';
import { X, Check, Calendar } from 'lucide-react';
import { Question } from '../types/exam';
import { Button } from './common/Button';

interface FiltersProps {
  filters: {
    search: string;
    topics: Set<string>;
    difficulties: Set<string>;
    dateRange: [Date | null, Date | null];
    tags: Set<string>;
  };
  updateFilters: (newFilters: Partial<{
    search: string;
    topics: Set<string>;
    difficulties: Set<string>;
    dateRange: [Date | null, Date | null];
    tags: Set<string>;
  }>) => void;
  clearFilters: () => void;
  tasks: Question[];
}

export const SheetFilters: React.FC<FiltersProps> = ({
  filters,
  updateFilters,
  clearFilters,
  tasks
}) => {
  // Extract unique topics from all tasks
  const allTopics = [...new Set(tasks.map(task => task.topic))].filter(Boolean);
  const difficulties = ['easy', 'medium', 'hard'];
  
  const toggleTopic = (topic: string) => {
    const newTopics = new Set(filters.topics);
    if (newTopics.has(topic)) {
      newTopics.delete(topic);
    } else {
      newTopics.add(topic);
    }
    updateFilters({ topics: newTopics });
  };
  
  const toggleDifficulty = (difficulty: string) => {
    const newDifficulties = new Set(filters.difficulties);
    if (newDifficulties.has(difficulty)) {
      newDifficulties.delete(difficulty);
    } else {
      newDifficulties.add(difficulty);
    }
    updateFilters({ difficulties: newDifficulties });
  };
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-gray-700">Filters</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters}
        >
          Clear All
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Topics filter */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Topics</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {allTopics.length > 0 ? (
              allTopics.map(topic => (
                <div key={topic} className="flex items-center">
                  <button
                    onClick={() => toggleTopic(topic)}
                    className={`flex items-center w-full p-2 rounded-md text-left ${
                      filters.topics.has(topic) 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${
                      filters.topics.has(topic) 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-gray-300'
                    }`}>
                      {filters.topics.has(topic) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">{topic}</span>
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No topics available</p>
            )}
          </div>
        </div>
        
        {/* Difficulty filter */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Difficulty</h4>
          <div className="space-y-2">
            {difficulties.map(difficulty => (
              <div key={difficulty} className="flex items-center">
                <button
                  onClick={() => toggleDifficulty(difficulty)}
                  className={`flex items-center w-full p-2 rounded-md text-left ${
                    filters.difficulties.has(difficulty) 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${
                    filters.difficulties.has(difficulty) 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-gray-300'
                  }`}>
                    {filters.difficulties.has(difficulty) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm capitalize">{difficulty}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Date range filter - simplified version */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Date Created</h4>
          <div className="space-y-2">
            <button
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date();
                lastWeek.setDate(today.getDate() - 7);
                updateFilters({ dateRange: [lastWeek, today] });
              }}
              className={`flex items-center w-full p-2 rounded-md text-left hover:bg-gray-100`}
            >
              <span className="text-sm">Last 7 days</span>
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date();
                lastMonth.setMonth(today.getMonth() - 1);
                updateFilters({ dateRange: [lastMonth, today] });
              }}
              className={`flex items-center w-full p-2 rounded-md text-left hover:bg-gray-100`}
            >
              <span className="text-sm">Last 30 days</span>
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const lastYear = new Date();
                lastYear.setFullYear(today.getFullYear() - 1);
                updateFilters({ dateRange: [lastYear, today] });
              }}
              className={`flex items-center w-full p-2 rounded-md text-left hover:bg-gray-100`}
            >
              <span className="text-sm">Last year</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 