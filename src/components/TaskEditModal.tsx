import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Question } from '../types/exam';
import { Button } from './common/Button';

interface TaskEditModalProps {
  task: Question;
  onClose: () => void;
  onSave: (task: Question) => Promise<void>;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task: initialTask,
  onClose,
  onSave,
}) => {
  const [task, setTask] = useState<Question>(initialTask);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave({
        ...task,
      });
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] 
                 flex flex-col border border-gray-200 dark:border-gray-700"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Task</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-grow">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Text
              </label>
              <textarea
                value={task.text}
                onChange={(e) => setTask({ ...task, text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <input
                type="text"
                value={task.type}
                onChange={(e) => setTask({ ...task, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Topic
              </label>
              <input
                type="text"
                value={task.topic}
                onChange={(e) => setTask({ ...task, topic: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty
              </label>
              <select
                value={task.difficulty}
                onChange={(e) => setTask({ ...task, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Solution
              </label>
              <textarea
                value={task.correctAnswer || ''}
                onChange={(e) => setTask({ ...task, correctAnswer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500"
                rows={3}
                placeholder="Enter solution"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Answer
              </label>
              <textarea
                value={task.answer || ''}
                onChange={(e) => setTask({ ...task, answer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500"
                rows={2}
                placeholder="Enter answer"
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
                       hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
              className="min-w-[120px] bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 
                       text-white font-medium shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 