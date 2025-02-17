import React, { useState } from 'react';
import type { Question } from '../types/exam';
import { X, PlusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface TaskCreatorProps {
  task?: Question;
  onCreate: (createdTask: Question) => void;
  onCancel: () => void;
}

export const TaskCreator = ({ 
  task, 
  onCreate, 
  onCancel, 
}: TaskCreatorProps) => {
  const [CreateTask, setCreateTask] = useState<Question>(() => task || {
    id: uuidv4(),
    text: '',
    type: '',
    topic: '',
    difficulty: '',
    correctAnswer: '',
    answer: ''
  });

  const handleCreateTask = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreateTask(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="space-y-6 bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
            Create New Task
        </h3>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full
                   hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Question Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Text
        </label>
        <textarea
          name="text"
          value={CreateTask.text}
          onChange={handleCreateTask}
          className="w-full p-3 border rounded-xl min-h-[120px] text-gray-700
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   placeholder:text-gray-400"
          placeholder="Enter the question text here..."
        />
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <select
            name="type"
            value={CreateTask.type}
            onChange={handleCreateTask}
            className="w-full p-3 border rounded-xl bg-white text-gray-700
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Type</option>
            <option value="Multiple Choice">Multiple Choice</option>
            <option value="Problem Solving">Problem Solving</option>
            <option value="Theory">Theory</option>
            <option value="Calculation">Calculation</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty
          </label>
          <select
            name="difficulty"
            value={CreateTask.difficulty}
            onChange={handleCreateTask}
            className="w-full p-3 border rounded-xl bg-white text-gray-700
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topic
          </label>
          <input
            name="topic"
            value={CreateTask.topic}
            onChange={handleCreateTask}
            className="w-full p-3 border rounded-xl text-gray-700
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter the topic"
          />
        </div>
      </div>

      {/* Solution and Answer */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Solution
          </label>
          <textarea
            name="correctAnswer"
            value={CreateTask.correctAnswer || ''}
            onChange={handleCreateTask}
            className="w-full p-3 border rounded-xl min-h-[100px] text-gray-700
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     placeholder:text-gray-400"
            placeholder="Enter the solution steps..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Answer
          </label>
          <textarea
            name="answer"
            value={CreateTask.answer || ''}
            onChange={handleCreateTask}
            className="w-full p-3 border rounded-xl min-h-[100px] text-gray-700
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     placeholder:text-gray-400"
            placeholder="Enter the final answer..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg
                   hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onCreate(CreateTask)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors"
        >
          Create Task
        </button>
      </div>
    </div>
  );
}; 