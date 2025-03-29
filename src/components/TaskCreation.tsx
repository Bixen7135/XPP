import React, { useState } from 'react';
import type { Question } from '../types/exam';
import { X, PlusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from './common/Button';

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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full h-[85vh]
                   border border-gray-200/50 dark:border-gray-700/50 flex flex-col">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Task</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fill in the task details below
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 
                   hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

     
      <div className="flex-1 overflow-y-auto space-y-6">
       
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Question Text
          </label>
          <textarea
            name="text"
            value={CreateTask.text}
            onChange={handleCreateTask}
            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[120px]
                     text-gray-900 dark:text-white bg-white dark:bg-gray-800
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="Enter the question text here..."
          />
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              name="type"
              value={CreateTask.type}
              onChange={handleCreateTask}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white bg-white dark:bg-gray-800
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Difficulty
            </label>
            <select
              name="difficulty"
              value={CreateTask.difficulty}
              onChange={handleCreateTask}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white bg-white dark:bg-gray-800
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Topic
            </label>
            <input
              name="topic"
              value={CreateTask.topic}
              onChange={handleCreateTask}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl
                       text-gray-900 dark:text-white bg-white dark:bg-gray-800
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter the topic"
            />
          </div>
        </div>

       
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Solution
            </label>
            <textarea
              name="correctAnswer"
              value={CreateTask.correctAnswer || ''}
              onChange={handleCreateTask}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[100px]
                       text-gray-900 dark:text-white bg-white dark:bg-gray-800
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Enter the solution steps..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Answer
            </label>
            <textarea
              name="answer"
              value={CreateTask.answer || ''}
              onChange={handleCreateTask}
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[100px]
                       text-gray-900 dark:text-white bg-white dark:bg-gray-800
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Enter the final answer..."
            />
          </div>
        </div>
      </div>

      
      <div className="flex justify-end gap-3 pt-6">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => onCreate(CreateTask)}
          className="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          Create Task
        </Button>
      </div>
    </div>
  );
}; 