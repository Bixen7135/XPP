import { useState, useMemo, useEffect, useRef } from 'react';
import { useExamStore } from '../store/examStore';
import { Search, Download, Trash2, BookOpen, Share2, Plus, Filter, Grid, List, ChevronDown, ChevronUp, Edit2, FileText, Loader2, AlertTriangle, X, CheckCircle2, Save } from 'lucide-react';
import type { Question } from '../types/exam';
import { getTasks, deleteTasks } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './common/Button';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { TaskEditor } from './TaskEditor';
import { toast } from 'react-hot-toast';
import { TaskCreator } from './TaskCreation';
import { supabase } from '../services/supabase';
import { SaveSheet } from './SaveSheet';
import { SheetDownloadModal } from './SheetDownloadModal';

type SortKey = 'date' | 'topic' | 'difficulty' | 'type';
type ViewMode = 'grid' | 'list';
type DocumentFormat = 'pdf' | 'docx';

interface Filters {
  topics: Set<string>;
  difficulties: Set<string>;
  types: Set<string>;
}

const formatMathText = (text: string) => {
  if (!text) return '';
  
  const parts = text.split(/(\\\[.*?\\\]|\\\(.*?\\\))/gs);
  
  return parts.map((part, index) => {
    if (part.startsWith('\\[') && part.endsWith('\\]')) {
      const mathContent = part.slice(2, -2).trim();
      return (
        <div key={index} className="my-2">
          <BlockMath math={mathContent} />
        </div>
      );
    }
    if (part.startsWith('\\(') && part.endsWith('\\)')) {
      const mathContent = part.slice(2, -2).trim();
      return <InlineMath key={index} math={mathContent} />;
    }
    return part;
  });
};

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
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
    danger: "bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700"
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
  const [sortBy] = useState<SortKey>('date');
  const [sortDirection] = useState<'asc' | 'desc'>('desc');
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
  const [topicSearch, setTopicSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const topicSearchRef = useRef<HTMLDivElement>(null);
  const typeSearchRef = useRef<HTMLDivElement>(null);
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [currentSearch, setCurrentSearch] = useState('');
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const subjects = useMemo(() => 
    Array.from(new Set(questions.map(q => q.topic))).sort(), 
    [questions]
  );

  const types = useMemo(() => 
    Array.from(new Set(questions.map(q => q.type))).sort(),
    [questions]
  );

  const toggleFilter = (category: keyof Filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (prev[category].has(value)) {
        newFilters[category] = new Set([...prev[category]].filter(v => v !== value));
      } else {
        newFilters[category] = new Set([...prev[category], value]);
      }
      return newFilters;
    });
  };

  const getFilteredOptions = (items: string[], searchTerm: string, selectedItems: Set<string>) => {
    return items
      .filter(item => 
        !selectedItems.has(item) && // Exclude already selected items
        item.toLowerCase().includes(searchTerm.toLowerCase())
      );
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentSearch.trim()) {
      e.preventDefault();
      setSearchTags([...searchTags, currentSearch.trim()]);
      setCurrentSearch('');
    } else if (e.key === 'Backspace' && !currentSearch && searchTags.length > 0) {
      setSearchTags(searchTags.slice(0, -1));
    }
  };

  const removeSearchTag = (tagToRemove: string) => {
    setSearchTags(searchTags.filter(tag => tag !== tagToRemove));
  };

  const filteredAndSortedTasks = useMemo(() => {
    return questions
      .filter(task => {
        const matchesSearchTags = searchTags.length === 0 || searchTags.some(tag =>
          task.text.toLowerCase().includes(tag.toLowerCase()) ||
          task.topic.toLowerCase().includes(tag.toLowerCase()) ||
          task.type.toLowerCase().includes(tag.toLowerCase())
        );
        const matchesCurrentSearch = !currentSearch || 
          task.text.toLowerCase().includes(currentSearch.toLowerCase()) ||
          task.topic.toLowerCase().includes(currentSearch.toLowerCase()) ||
          task.type.toLowerCase().includes(currentSearch.toLowerCase());
        
        const matchesDifficulty = filters.difficulties.size === 0 || filters.difficulties.has(task.difficulty);
        const matchesType = filters.types.size === 0 || filters.types.has(task.type);
        const matchesSubject = filters.topics.size === 0 || filters.topics.has(task.topic);
        
        return matchesSearchTags && matchesCurrentSearch && matchesDifficulty && matchesType && matchesSubject;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'topic':
            comparison = a.topic.localeCompare(b.topic);
            break;
          case 'difficulty':
            comparison = a.difficulty.localeCompare(b.difficulty);
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
  }, [questions, searchTags, currentSearch, filters, sortBy, sortDirection]);

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
    
    // If holding Ctrl/Cmd key, toggle selection without affecting others
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
    // If holding Shift key, select range
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
    // Normal click toggles single selection
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
          // TODO: Implement share functionality
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

  const handleSave = (updatedTask: Question) => {
    setQuestions(questions.map(q => 
      q.id === updatedTask.id ? updatedTask : q
    ));
    setEditingTask(null);
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

  const toggleDetails = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setExpandedDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSaveAsSheet = async (title: string, description?: string) => {
    try {
      if (selectedTasks.size === 0) {
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
          tasks: Array.from(selectedTasks)
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
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      key={task.id} 
      className={`bg-white p-6 rounded-xl shadow-md transition-all duration-200 hover:shadow-lg cursor-pointer
                ${selectedTasks.has(task.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                ${expandedTask === task.id ? 'shadow-lg' : ''}`}
      onClick={(e) => handleTaskClick(e, task.id)}
    >
        <>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
          <div className="flex justify-between items-start mb-4" onClick={e => e.stopPropagation()}>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium
                ${task.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'}`}>
                {task.difficulty}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {task.topic}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                {task.type}
              </span>
            </div>
              </div>

              <div className="prose prose-sm max-w-none mb-4">
                <div className="text-gray-900 text-lg font-medium mb-4">
                  {formatMathText(task.text)}
                </div>

                <button
                  onClick={(e) => toggleDetails(e, task.id)}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
                >
                  {expandedDetails.has(task.id) ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                  {expandedDetails.has(task.id) ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<Edit2 className="h-4 w-4" />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(task);
                }}
              />
            </div>
          </div>

                <AnimatePresence>
            {expandedDetails.has(task.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {task.correctAnswer && (
                  <div className="pl-4 border-l-4 border-green-500">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Solution:
                    </h4>
                    <div className="text-gray-600">
                        {formatMathText(task.correctAnswer)}
                      </div>
              </div>
            )}

            {task.answer && (
                  <div className="pl-4 border-l-4 border-blue-500">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Answer:
                    </h4>
                    <div className="text-gray-600">
                        {formatMathText(task.answer)}
                      </div>
                  </div>
                )}

                {(task.context || task.instructions || task.learningOutcome) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {task.context && (
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Context:</h4>
                        <p className="text-gray-600">{formatMathText(task.context)}</p>
              </div>
            )}
                    {task.instructions && (
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Instructions:</h4>
                        <p className="text-gray-600">{formatMathText(task.instructions)}</p>
          </div>
                    )}
                    {task.learningOutcome && (
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Learning Outcome:</h4>
                        <p className="text-gray-600">{formatMathText(task.learningOutcome)}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {expandedTask === task.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-4 border-t pt-4"
              >
                <div className="flex justify-end gap-2 mt-4" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBulkAction('delete');
                      setSelectedTasks(new Set([task.id]));
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
    </motion.div>
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
                    <div className="text-sm text-gray-900">{formatMathText(task.text)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-sm text-gray-600">{task.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-sm text-gray-600">{task.topic}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium
                      ${task.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'}`}>
                      {task.difficulty}
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl shadow-sm p-8 text-center"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No tasks found
        </h3>
        <p className="text-gray-500 mb-6">
          Try adjusting your filters or create new tasks to get started.
        </p>
        <div className="flex items-center justify-center gap-4">
          <ActionButton
            onClick={() => setIsCreating(true)}
            icon={<Plus className="w-5 h-5" />}
            label="Create New Task"
            variant="secondary"
          />
          <ActionButton
            onClick={() => navigate('/generate-task')}
            icon={<FileText className="w-5 h-5" />}
            label="Generate Tasks"
            variant="primary"
          />
        </div>
      </motion.div>
    </motion.div>
  );

  // First, add a helper function to get all visible task IDs
  const getVisibleTaskIds = () => {
    return new Set(filteredAndSortedTasks.map(task => task.id));
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load tasks
          </h2>
          <p className="text-gray-600 mb-4">
            There was a problem loading your tasks. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Task Library</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={<FileText className="w-5 h-5" />}
              onClick={() => navigate('/generate-task')}
            >
              Generate Task Sheet
            </Button>
          </div>
        </div>
        <p className="text-gray-600">Manage and organize your generated tasks</p>
      </div>

      {/* Control Panel */}
      <motion.div 
        layout
        className="bg-white p-6 rounded-xl shadow-sm mb-6"
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <div className="flex flex-wrap items-center gap-2 w-full pl-10 pr-4 py-2.5 border rounded-xl 
                            focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 
                            bg-white shadow-sm hover:border-gray-300 transition-all duration-200">
                {searchTags.map(tag => (
                  <motion.span
                    key={tag}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium 
                             flex items-center gap-1.5 group hover:bg-blue-100 transition-colors"
                  >
                    {tag}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSearchTag(tag);
                      }}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
                <input
                  type="text"
                  value={currentSearch}
                  onChange={(e) => setCurrentSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchTags.length === 0 ? "Search tasks..." : ""}
                  className="flex-1 min-w-[120px] outline-none bg-transparent placeholder-gray-400
                           text-gray-900 py-1"
                />
              </div>
            </div>
          </div>

          {/* Filter Button */}
          <div className="flex items-center gap-3">
            <Button
              variant={selectedTasks.size > 0 ? "primary" : "ghost"}
              size="sm"
              icon={<CheckCircle2 className="w-4 h-4" />}
              className="min-w-[100px]"
              onClick={() => {
                // If some tasks are selected, clear selection
                // Otherwise, select all visible tasks
                if (selectedTasks.size > 0) {
                  setSelectedTasks(new Set());
                } else {
                  setSelectedTasks(getVisibleTaskIds());
                }
              }}
            >
              {selectedTasks.size > 0 ? (
                <>
                  Selected <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs">
                    {selectedTasks.size}
                  </span>
                </>
              ) : (
                'Select All'
              )}
            </Button>

            <Button
              variant={showFilters ? "primary" : "ghost"}
              size="sm"
              icon={<Filter className="w-4 h-4" />}
              className="min-w-[100px]"
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters {(filters.difficulties.size + filters.topics.size + filters.types.size) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs">
                  {filters.difficulties.size + filters.topics.size + filters.types.size}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Difficulty Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      Difficulty Level
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {['easy', 'medium', 'hard'].map(difficulty => (
                        <button
                          key={difficulty}
                          onClick={() => toggleFilter('difficulties', difficulty)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                            ${filters.difficulties.has(difficulty)
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        >
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topics Section */}
                  <div className="space-y-3" ref={topicSearchRef}>
                    <h3 className="text-sm font-medium text-gray-900">Topics</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search topics..."
                        value={topicSearch}
                        onChange={(e) => setTopicSearch(e.target.value)}
                        onFocus={() => setShowTopicDropdown(true)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 
                                 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {showTopicDropdown && (() => {
                        const filteredOptions = getFilteredOptions(
                          Array.from(new Set(questions.map(t => t.topic))),
                          topicSearch,
                          filters.topics
                        );
                        
                        return filteredOptions.length > 0 ? (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            <div className="p-2">
                              {filteredOptions.map(topic => (
                                <div
                                  key={topic}
                                  className="px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer text-gray-700"
                                  onClick={() => toggleFilter('topics', topic)}
                                >
                                  {topic}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(filters.topics).map(topic => (
                        <motion.span
                          key={topic}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium 
                                   flex items-center gap-1.5 group hover:bg-blue-100 transition-colors"
                        >
                          {topic}
                          <button
                            onClick={() => toggleFilter('topics', topic)}
                            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.span>
                      ))}
                    </div>
                  </div>

                  {/* Types Section */}
                  <div className="space-y-3" ref={typeSearchRef}>
                    <h3 className="text-sm font-medium text-gray-900">Question Types</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search types..."
                        value={typeSearch}
                        onChange={(e) => setTypeSearch(e.target.value)}
                        onFocus={() => setShowTypeDropdown(true)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 
                                 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {showTypeDropdown && (() => {
                        const filteredOptions = getFilteredOptions(
                          Array.from(new Set(questions.map(t => t.type))),
                          typeSearch,
                          filters.types
                        );
                        
                        return filteredOptions.length > 0 ? (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            <div className="p-2">
                              {filteredOptions.map(type => (
                                <div
                                  key={type}
                                  className="px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer text-gray-700"
                                  onClick={() => toggleFilter('types', type)}
                                >
                                  {type}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(filters.types).map(type => (
                        <motion.span
                          key={type}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium 
                                   flex items-center gap-1.5 group hover:bg-blue-100 transition-colors"
                        >
                          {type}
                          <button
                            onClick={() => toggleFilter('types', type)}
                            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>

                {(filters.difficulties.size + filters.topics.size + filters.types.size) > 0 && (
                  <div className="flex justify-between items-center mt-6 pt-6 border-t">
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      {filters.difficulties.size + filters.topics.size + filters.types.size} active filters
                    </span>
                    <button
                      onClick={() => setFilters({ topics: new Set(), difficulties: new Set(), types: new Set() })}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons - Moved to bottom right */}
        <div className="flex justify-end pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreating(true)}
            >
              New Task
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => setShowDownloadModal(true)}
              disabled={selectedTasks.size === 0}
            >
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => handleBulkAction('delete')}
              disabled={selectedTasks.size === 0}
              className="text-red-600 hover:bg-red-50"
            >
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              onClick={() => setShowSaveSheet(true)}
              disabled={selectedTasks.size === 0}
            >
              Save as Sheet
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Task Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
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

      {/* Task Editing Modal */}
      <AnimatePresence>
        {editingTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full max-w-3xl"
            >
              <TaskEditor
                task={editingTask}
                onSave={handleSave}
                onCancel={() => setEditingTask(null)}
                mode="edit"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks Display */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error loading tasks
          </h3>
          <p className="text-gray-500">{error}</p>
        </div>
      ) : (
        <div>
          {filteredAndSortedTasks.length > 0 ? (
            viewMode === 'grid' ? (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAndSortedTasks.map(renderTaskCard)}
          </AnimatePresence>
        </motion.div>
      ) : (
              <div className="space-y-4">
        <AnimatePresence>
                  {filteredAndSortedTasks.map(renderTaskCard)}
        </AnimatePresence>
              </div>
            )
          ) : (
            renderEmptyState()
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 w-full"
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Confirm Deletion
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to permanently delete {selectedTasks.size} task(s)? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg
                             hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg
                             hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    Delete Tasks
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Sheet Modal */}
      <AnimatePresence>
        {showSaveSheet && (
          <SaveSheet
            onSave={handleSaveAsSheet}
            onClose={() => setShowSaveSheet(false)}
          />
        )}
      </AnimatePresence>

      {/* Sheet Download Modal */}
      <AnimatePresence>
        {showDownloadModal && (
          <SheetDownloadModal
            onClose={() => setShowDownloadModal(false)}
            tasks={questions.filter(task => selectedTasks.has(task.id))}
            sheetTitle="Selected Tasks"
          />
        )}
      </AnimatePresence>
    </div>
  );
};