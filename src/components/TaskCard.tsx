import React, { useRef, useEffect } from 'react';
import { Check, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
import type { Question } from '../types/exam';
import { formatMathText } from '../utils/mathFormatting';

interface TaskCardProps {
  task: Question;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onEdit: (task: Question) => void;
  isExpanded: boolean;
  onToggleDetails: (e: React.MouseEvent) => void;
}

export const TaskCard = React.memo(({ 
  task, 
  isSelected, 
  onSelect, 
  onEdit, 
  isExpanded, 
  onToggleDetails 
}: TaskCardProps) => {
  const solutionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && solutionRef.current && contentRef.current) {
      const scrollContainer = contentRef.current;
      const solutionElement = solutionRef.current;
      const topPosition = solutionElement.offsetTop - scrollContainer.offsetTop;
      
      scrollContainer.scrollTo({
        top: topPosition,
        behavior: 'smooth'
      });
    }
  }, [isExpanded]);

  return (
    <div 
      onClick={onSelect}
      className={`group cursor-pointer rounded-xl border transition-all duration-200 flex flex-col h-[400px]
                ${isSelected
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
    >
      
      <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 mb-2 flex-wrap">
              <span className={`px-2 py-1 rounded-full text-xs font-medium
                ${task.difficulty === 'easy'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : task.difficulty === 'medium'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`}
              >
                {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
              </span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs">
                {task.topic}
              </span>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs">
                {task.type}
              </span>
            </div>
          </div>
          {isSelected && (
            <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
          )}
        </div>

        
        <div ref={contentRef} className="overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <div className="text-gray-900 dark:text-white prose dark:prose-invert prose-sm max-w-none katex-text break-words">
            {formatMathText(task.text)}
          </div>
          
          {isExpanded && (
            <div className="mt-4 space-y-4">
              <div ref={solutionRef} className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <div className="font-medium text-blue-900 dark:text-blue-300 mb-2">Solution:</div>
                <div className="prose dark:prose-invert prose-sm max-w-none text-blue-800 dark:text-blue-200 katex-text break-words">
                  {formatMathText(task.correctAnswer || 'No solution provided')}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                <div className="font-medium text-green-900 dark:text-green-300 mb-2">Answer:</div>
                <div className="prose dark:prose-invert prose-sm max-w-none text-green-800 dark:text-green-200 katex-text break-words">
                  {formatMathText(task.answer || 'No answer provided')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      
      <div className="p-4 border-t border-gray-100 dark:border-gray-700 mt-auto flex-shrink-0">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onToggleDetails}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white
                     flex items-center gap-1 transition-colors duration-150"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
                     flex items-center gap-1 transition-colors duration-150"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}); 