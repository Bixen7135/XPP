import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Check, Filter, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Question } from '../types/exam';
import { Button } from './common/Button';

interface SheetImportModalProps {
  onClose: () => void;
  onImport: (tasks: Question[]) => void;
  existingTaskIds?: string[];
}

export const SheetImportModal: React.FC<SheetImportModalProps> = ({ 
  onClose, 
  onImport,
  existingTaskIds = []
}) => {
  const [tasks, setTasks] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadTasks();
  }, []);
  
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .not('id', 'in', `(${existingTaskIds.join(',')})`);
        
      if (error) throw error;
      
      setTasks(data || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };
  
  const handleImport = () => {
    const selectedTasksList = tasks.filter(task => selectedTasks.has(task.id));
    onImport(selectedTasksList);
  };
  
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      task.text.toLowerCase().includes(query) ||
      task.topic.toLowerCase().includes(query) ||
      task.type.toLowerCase().includes(query)
    );
  });
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Import Tasks</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button 
                variant="ghost" 
                onClick={loadTasks} 
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No tasks match your search' : 'No tasks available to import'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => toggleTaskSelection(task.id)}
                  className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                    selectedTasks.has(task.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="flex gap-2 mb-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                          {task.type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          task.difficulty === 'easy' 
                            ? 'bg-green-100 text-green-800' 
                            : task.difficulty === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {task.difficulty}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {task.topic}
                        </span>
                      </div>
                      <p className="text-gray-900 line-clamp-2">{task.text}</p>
                    </div>
                    {selectedTasks.has(task.id) && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={selectedTasks.size === 0}
              >
                Import Selected
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 