import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Download, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { PageLayout } from './common/PageLayout';
import { Button } from './common/Button';
import { LoadingSpinner } from './common/LoadingSpinner';
import { useToast } from './Toast';
import { getSheetById, deleteSheets } from '../services/supabase';
import { TaskSheet } from '../types/supabase';
import { Question } from '../types/exam';
import { SheetExportModal } from './SheetExportModal';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export const SheetView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [sheet, setSheet] = useState<TaskSheet | null>(null);
  const [tasks, setTasks] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visibleSolutions, setVisibleSolutions] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (id) {
      loadSheet(id);
    }
  }, [id]);
  
  const loadSheet = async (sheetId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getSheetById(sheetId);
      setSheet(data.sheet);
      setTasks(data.tasks.map(task => ({
        id: task.id,
        text: task.text,
        type: task.type,
        topic: task.topic,
        difficulty: task.difficulty,
        correctAnswer: task.correct_answer,
        explanation: task.explanation,
        context: task.context,
        instructions: task.instructions,
        learningOutcome: task.learning_outcome
      })));
    } catch (err) {
      console.error('Error loading sheet:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sheet');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteSheets([id]);
      showToast('Sheet deleted successfully', 'success');
      navigate('/sheets');
    } catch (err) {
      console.error('Error deleting sheet:', err);
      showToast(err instanceof Error ? err.message : 'Failed to delete sheet', 'error');
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
 
  const formatMathText = (text: string) => {
    if (!text) return '';
    
    const parts = text.split(/(\\\[.*?\\\]|\\\(.*?\\\))/gs);
    
    return parts.map((part, index) => {
      if (part.startsWith('\\[') && part.endsWith('\\]')) {
        return <BlockMath key={index} math={part.slice(2, -2)} />;
      } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
        return <InlineMath key={index} math={part.slice(2, -2)} />;
      }
      return <span key={index}>{part}</span>;
    });
  };
  
  const toggleSolution = (taskId: string) => {
    const newVisibleSolutions = new Set(visibleSolutions);
    if (newVisibleSolutions.has(taskId)) {
      newVisibleSolutions.delete(taskId);
    } else {
      newVisibleSolutions.add(taskId);
    }
    setVisibleSolutions(newVisibleSolutions);
  };
  
  if (loading) {
    return (
      <PageLayout maxWidth="xl">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </PageLayout>
    );
  }
  
  if (error) {
    return (
      <PageLayout maxWidth="xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            variant="primary"
            onClick={() => navigate('/sheets')}
          >
            Back to Sheets
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  if (!sheet) {
    return (
      <PageLayout maxWidth="xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sheet Not Found</h2>
          <p className="text-gray-600 mb-6">The sheet you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button
            variant="primary"
            onClick={() => navigate('/sheets')}
          >
            Back to Sheets
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout maxWidth="xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/sheets')}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Sheets
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{sheet.title}</h1>
            {sheet.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">{sheet.description}</p>
            )}
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
              <Clock className="w-4 h-4 mr-1" />
              Created on {formatDate(sheet.created_at)}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              icon={<Edit className="w-4 h-4" />}
              onClick={() => navigate(`/sheets/${id}/edit`)}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              icon={<Download className="w-4 h-4" />}
              onClick={() => setShowExportModal(true)}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Export
            </Button>
            <Button
              variant="ghost"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Delete
            </Button>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tasks ({tasks.length})</h2>
          
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No tasks in this sheet
            </div>
          ) : (
            <div className="space-y-6">
              {tasks.map((task, index) => (
                <div key={task.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                  <div className="flex justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Task {index + 1}</div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        task.difficulty === 'easy' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                          : task.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      } opacity-80`}>
                        {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 opacity-80">
                        {task.topic}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 opacity-80">
                        {task.type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-gray-900 dark:text-white">
                    {formatMathText(task.text)}
                  </div>
                  
                  <div className="mt-4 flex justify-start">
                    <button
                      onClick={() => toggleSolution(task.id)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {visibleSolutions.has(task.id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  
                  {visibleSolutions.has(task.id) && (
                    <div className="mt-4 space-y-4 w-full">
                      {task.explanation && (
                        <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                            Solution:
                          </h4>
                          <div className="prose dark:prose-invert prose-sm max-w-none text-blue-800 dark:text-blue-200 katex-text break-words">
                            {formatMathText(task.explanation)}
                          </div>
                        </div>
                      )}
                      
                      {task.correctAnswer && (
                        <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                          <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">
                            Answer:
                          </h4>
                          <div className="prose dark:prose-invert prose-sm max-w-none text-green-800 dark:text-green-200 katex-text break-words">
                            {formatMathText(task.correctAnswer)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
     
      {showExportModal && (
        <SheetExportModal
          onClose={() => setShowExportModal(false)}
          tasks={tasks}
          sheetTitle={sheet.title}
        />
      )}
      
      
      {showDeleteConfirm && (
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
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md mx-4 w-full border border-gray-200 dark:border-gray-700"
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Sheet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete "{sheet.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageLayout>
  );
}; 