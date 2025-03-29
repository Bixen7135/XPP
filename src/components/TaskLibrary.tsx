import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useExamStore } from '../store/examStore';
import { Search, Download, Trash2, BookOpen, Share2, Plus, Filter, Grid, List, ChevronDown, ChevronUp, Edit2, FileText, Loader2, AlertTriangle, X, CheckCircle2, Save, Check, Users, SortAsc, SortDesc } from 'lucide-react';
import type { Question } from '../types/exam';
import { getTasks, deleteTasks } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './common/Button';
import { TaskEditor } from './TaskEditor';
import { toast } from 'react-hot-toast';
import { TaskCreator } from './TaskCreation';
import { supabase } from '../services/supabase';
import { SaveSheet } from './SaveSheet';
import { SheetDownloadModal } from './SheetDownloadModal';
import { Link } from 'react-router-dom';
import { TaskFilters } from './TaskFilters';
import { PageLayout } from './common/PageLayout';
import { TaskEditModal } from './TaskEditModal';
import { TaskCard } from './TaskCard';
import { formatMathText } from '../utils/mathFormatting';

type SortKey = 'date' | 'topic' | 'difficulty' | 'type';
type ViewMode = 'grid' | 'list';
type DocumentFormat = 'pdf' | 'docx';

interface Filters {
  topics: Set<string>;
  difficulties: Set<string>;
  types: Set<string>;
}

const ActionButton = ({ 
  onClick, 
  icon, 
  label, 
  variant = 'secondary',
  disabled = false 
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 gap-2";
  const variantStyles = {
    primary: "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md hover:shadow-lg",
    secondary: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/80 hover:text-gray-900 dark:hover:text-white",
    danger: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-300"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}
      {label}
    </motion.button>
  );
};

export const TaskLibrary = () => {
  const { questions, setQuestions } = useExamStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTask, setEditingTask] = useState<Question | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedSolutions, setExpandedSolutions] = useState<Set<string>>(new Set());
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({
    topics: new Set(),
    difficulties: new Set(),
    types: new Set()
  });
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const subjects = useMemo(() => 
    Array.from(new Set(questions.map(q => q.topic))).sort(), 
    [questions]
  );

  const types = useMemo(() => 
    Array.from(new Set(questions.map(q => q.type))).sort(),
    [questions]
  );

  const toggleSort = (field: SortKey) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    return questions
      .filter(task => {
        const matchesSearch = !searchQuery || 
          task.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDifficulty = filters.difficulties.size === 0 || filters.difficulties.has(task.difficulty);
        const matchesType = filters.types.size === 0 || filters.types.has(task.type);
        const matchesSubject = filters.topics.size === 0 || filters.topics.has(task.topic);
        
        return matchesSearch && matchesDifficulty && matchesType && matchesSubject;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'topic':
            comparison = a.topic.localeCompare(b.topic);
            break;
          case 'difficulty':
            const difficultyOrder: Record<string, number> = { 'easy': 0, 'medium': 1, 'hard': 2 };
            comparison = (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0);
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
          case 'date':
            comparison = a.id.localeCompare(b.id);
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [questions, searchQuery, filters, sortBy, sortDirection]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedTasks: Question[] = data.map(task => ({
          id: task.id,
          text: task.text,
          type: task.type,
          topic: task.topic,
          difficulty: task.difficulty,
          correctAnswer: task.correct_answer,
          answer: task.answers?.answer || null,
          answers: Array.isArray(task.answers) ? task.answers : null,
          explanation: task.explanation,
          context: task.context,
          instructions: task.instructions,
          learningOutcome: task.learning_outcome
        }));
        setQuestions(mappedTasks);
      }
    } catch (err) {
      setError('Failed to load tasks. Please try again later.');
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskClick = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    
    
    if (e.ctrlKey || e.metaKey) {
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
        return newSet;
      });
    } 
   
    else if (e.shiftKey && selectedTasks.size > 0) {
      const taskIds = filteredAndSortedTasks.map(t => t.id);
      const lastSelected = Array.from(selectedTasks).pop()!;
      const currentIndex = taskIds.indexOf(taskId);
      const lastIndex = taskIds.indexOf(lastSelected);
      const start = Math.min(currentIndex, lastIndex);
      const end = Math.max(currentIndex, lastIndex);
      
      const rangeSelection = taskIds.slice(start, end + 1);
      setSelectedTasks(new Set(rangeSelection));
    }
   
    else {
      setSelectedTasks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
        return newSet;
      });
    }
  };

  const handleBulkAction = async (action: 'delete' | 'share') => {
    const selectedTasksList = filteredAndSortedTasks.filter(task => 
      selectedTasks.has(task.id)
    );

    if (selectedTasksList.length === 0) {
      toast.error('Please select tasks to perform action');
      return;
    }

    try {
      switch (action) {
        case 'delete':
          setShowDeleteConfirm(true);
          break;

        case 'share':
          
          console.log('Share functionality not implemented yet');
          break;
      }
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      toast.error(`Failed to ${action} tasks: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteTasks(Array.from(selectedTasks));
      toast.success(`${selectedTasks.size} task(s) deleted successfully`);
      await loadTasks();
      setSelectedTasks(new Set());
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error('Failed to delete tasks');
      console.error('Delete error:', error);
    }
  };

  const handleEdit = (task: Question) => {
    setEditingTask(task);
  };

  const handleSave = async (updatedTask: Question) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          text: updatedTask.text,
          type: updatedTask.type,
          topic: updatedTask.topic,
          difficulty: updatedTask.difficulty,
          correct_answer: updatedTask.correctAnswer,
          answer: updatedTask.answer,
        })
        .eq('id', updatedTask.id);

      if (error) throw error;

      
      setQuestions(questions.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));

      setEditingTask(null);
      toast.success('Task updated successfully');
    } catch (err) {
      console.error('Error updating task:', err);
      toast.error('Failed to update task');
      throw err;
    }
  };

  const handleCreateTask = (newTask: Question) => {
    setQuestions([...questions, newTask]);
    setIsCreating(false);
  };

  const toggleSolution = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setExpandedSolutions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const toggleAnswer = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setExpandedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSaveAsSheet = async (title: string, tasks: Question[], description?: string) => {
    try {
      if (tasks.length === 0) {
        toast.error('Please select tasks to save');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      const { data, error } = await supabase
        .from('task_sheets')
        .insert({
          user_id: user.id,
          title,
          description,
          tasks: tasks.map(task => task.id)
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Task sheet saved successfully');
      setShowSaveSheet(false);
      setSelectedTasks(new Set());
    } catch (error) {
      console.error('Error saving task sheet:', error);
      toast.error('Failed to save task sheet');
    }
  };

  const renderTaskCard = (task: Question) => (
    <TaskCard
      key={task.id}
      task={task}
      isSelected={selectedTasks.has(task.id)}
      onSelect={(e) => handleTaskClick(e, task.id)}
      onEdit={handleEdit}
      isExpanded={expandedDetails.has(task.id)}
      onToggleDetails={(e) => {
        e.stopPropagation();
        setExpandedDetails(prev => {
          const newSet = new Set(prev);
          if (newSet.has(task.id)) {
            newSet.delete(task.id);
          } else {
            newSet.add(task.id);
          }
          return newSet;
        });
      }}
    />
  );

  const renderTaskList = () => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={selectedTasks.size === filteredAndSortedTasks.length}
                onChange={() => {
                  if (selectedTasks.size === filteredAndSortedTasks.length) {
                    setSelectedTasks(new Set());
                  } else {
                    setSelectedTasks(new Set(filteredAndSortedTasks.map(t => t.id)));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subject
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Difficulty
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAndSortedTasks.map(task => (
            <tr key={task.id}>
              {editingTask?.id === task.id ? (
                <td colSpan={6} className="px-6 py-4">
                  <TaskEditor
                    task={task}
                    onSave={handleSave}
                    onCancel={() => setEditingTask(null)}
                    mode="edit"
                  />
                </td>
              ) : (
                <>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={(e) => handleTaskClick(e as unknown as React.MouseEvent, task.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white prose dark:prose-invert prose-sm max-w-none katex-text">
                      {formatMathText(task.text)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400">{task.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400">{task.topic}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium
                      ${task.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Edit2 className="h-4 w-4" />}
                        onClick={() => handleEdit(task)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => handleBulkAction('delete')}
                        className="text-red-600 hover:bg-red-50"
                      />
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="text-gray-400 dark:text-gray-500 mb-4">
        <FileText className="w-12 h-12 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No tasks found
        </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Try adjusting your search or filters
      </p>
      <Button
            variant="primary"
        size="lg"
        icon={<Plus className="w-5 h-5" />}
        onClick={() => setIsCreating(true)}
        className="mt-4"
      >
        Create New Task
      </Button>
        </div>
  );

  
  const getVisibleTaskIds = () => {
    return new Set(filteredAndSortedTasks.map(task => task.id));
  };

    return (
    <PageLayout maxWidth="2xl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-start justify-between gap-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Task Library</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">Manage and organize your generated tasks</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => setIsCreating(true)}
              className="shadow-lg hover:shadow-xl transition-shadow"
            >
              New Task
            </Button>
            <Button
              variant="primary"
              icon={<FileText className="w-5 h-5" />}
              onClick={() => navigate('/generate-task')}
              className="shadow-lg hover:shadow-xl transition-shadow"
            >
              Generate Sheet
            </Button>
          </div>
      </div>

      
      <motion.div 
        layout
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
          
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between gap-4">
          
          <div className="flex-1 max-w-2xl">
            <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl 
                              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                              bg-white dark:bg-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 
                              transition-all duration-200
                              text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                              text-lg"
                  />
            </div>
          </div>

              
          <div className="flex items-center gap-3">
            <Button
              variant={selectedTasks.size > 0 ? "primary" : "ghost"}
                  size="lg"
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  className={`min-w-[120px] ${
                    selectedTasks.size > 0 
                      ? "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80"
                  }`}
              onClick={() => {
                if (selectedTasks.size > 0) {
                  setSelectedTasks(new Set());
                } else {
                  setSelectedTasks(getVisibleTaskIds());
                }
              }}
            >
              {selectedTasks.size > 0 ? (
                <>
                      Selected <span className="ml-1.5 px-2.5 py-0.5 bg-blue-500/20 dark:bg-blue-400/20 text-white rounded-full text-sm font-medium">
                    {selectedTasks.size}
                  </span>
                </>
              ) : (
                'Select All'
              )}
            </Button>

            <Button
              variant={showFilters ? "primary" : "ghost"}
                  size="lg"
                  icon={<Filter className="w-5 h-5" />}
                  className={`min-w-[120px] ${
                    showFilters 
                      ? "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/80"
                  }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters {(filters.difficulties.size + filters.topics.size + filters.types.size) > 0 && (
                    <span className={`ml-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                      showFilters 
                        ? "bg-blue-500/20 dark:bg-blue-400/20 text-white" 
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}>
                  {filters.difficulties.size + filters.topics.size + filters.types.size}
                </span>
              )}
            </Button>
              </div>
          </div>
        </div>

        
        {showFilters && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <TaskFilters
                filters={filters}
                updateFilters={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
                clearFilters={() => setFilters({ topics: new Set(), difficulties: new Set(), types: new Set() })}
                tasks={questions}
              />
            </div>
          </div>
        )}

          
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => setShowDownloadModal(true)}
              disabled={selectedTasks.size === 0}
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
                          hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
            >
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => handleBulkAction('delete')}
              disabled={selectedTasks.size === 0}
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 
                          hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
            >
                Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              onClick={() => setShowSaveSheet(true)}
              disabled={selectedTasks.size === 0}
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
                          hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
            >
              Save as Sheet
            </Button>
          </div>

            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sort by:</span>
            
              <div className="flex items-center gap-4">
            <button
              onClick={() => toggleSort('date')}
                  className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === 'date' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              Date
              {sortBy === 'date' && (
                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={() => toggleSort('topic')}
                  className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === 'topic' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              Topic
              {sortBy === 'topic' && (
                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={() => toggleSort('difficulty')}
                  className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === 'difficulty' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              Difficulty
              {sortBy === 'difficulty' && (
                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => toggleSort('type')}
                  className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === 'type' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              Type
              {sortBy === 'type' && (
                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
              )}
            </button>
              </div>
          </div>
        </div>
      </motion.div>

      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : error ? (
          <div className="text-center p-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Error loading tasks
            </h3>
            <p className="text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        ) : filteredAndSortedTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedTasks.map(renderTaskCard)}
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>

     
      <AnimatePresence>
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
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Confirm Deletion
                </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Are you sure you want to permanently delete {selectedTasks.size} task(s)? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg
                               hover:bg-gray-200 dark:hover:bg-gray-600/80 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                      className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg
                               hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    Delete Tasks
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

     
      <AnimatePresence>
        {showSaveSheet && (
          <SaveSheet
            selectedTasks={filteredAndSortedTasks.filter(task => selectedTasks.has(task.id))}
            onSave={handleSaveAsSheet}
            onClose={() => setShowSaveSheet(false)}
          />
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {showDownloadModal && (
          <SheetDownloadModal
            tasks={filteredAndSortedTasks.filter(task => selectedTasks.has(task.id))}
            onClose={() => setShowDownloadModal(false)}
          />
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full max-w-3xl"
            >
              <TaskCreator
                onCreate={handleCreateTask}
                onCancel={() => setIsCreating(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

     
      <AnimatePresence>
        {editingTask && (
          <TaskEditModal
            task={editingTask}
            onSave={handleSave}
            onClose={() => setEditingTask(null)}
          />
        )}
      </AnimatePresence>

    </div>
    </PageLayout>
  );
};