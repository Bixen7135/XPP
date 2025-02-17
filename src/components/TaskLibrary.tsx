import { useState, useMemo, useEffect } from 'react';
import { useExamStore } from '../store/examStore';
import { Search, Download, Trash2, BookOpen, Share2, Plus, Filter, Grid, List, ChevronDown, ChevronUp, Edit2, FileText, Loader2, AlertTriangle } from 'lucide-react';
import type { Question } from '../types/exam';
import { getTasks, deleteTasks } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './common/Button';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { TaskEditor } from './TaskEditor';
import { toast } from 'react-hot-toast';
import { downloadDocument } from '../services/documentGenerator';
import { TaskCreator } from './TaskCreation';

type SortKey = 'date' | 'topic' | 'difficulty' | 'type';
type ViewMode = 'grid' | 'list';

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
  const [documentOptions, setDocumentOptions] = useState({
    includeSolutions: false,
    includeAnswers: false
  });
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [expandedSolutions, setExpandedSolutions] = useState<Set<string>>(new Set());
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const subjects = useMemo(() => 
    Array.from(new Set(questions.map(q => q.topic))).sort(), 
    [questions]
  );

  const types = useMemo(() => 
    Array.from(new Set(questions.map(q => q.type))).sort(),
    [questions]
  );

  const filteredAndSortedTasks = useMemo(() => {
    return questions
      .filter(task => {
        const matchesSearch = 
          task.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDifficulty = filterDifficulty === 'all' || task.difficulty === filterDifficulty;
        const matchesType = filterType === 'all' || task.type === filterType;
        const matchesSubject = filterSubject === 'all' || task.topic === filterSubject;
        return matchesSearch && matchesDifficulty && matchesType && matchesSubject;
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
  }, [questions, searchTerm, filterDifficulty, filterType, filterSubject, sortBy, sortDirection]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error } = await getTasks();
      if (error) throw error;
      if (data) {
        setQuestions(data as Question[]);
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

  const handleBulkAction = async (action: 'download' | 'delete' | 'share', format?: 'pdf' | 'docx') => {
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

        case 'download':
          if (!format) {
            throw new Error('Download format not specified');
          }
          setLoading(true);
          await downloadDocument(selectedTasksList, format, documentOptions);
          setShowDownloadMenu(false);
          toast.success(`${selectedTasksList.length} task(s) downloaded successfully`);
          break;

        case 'share':
          // TODO: Implement share functionality
          console.log('Share functionality not implemented yet');
          break;
      }
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      toast.error(`Failed to ${action} tasks: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await deleteTasks(Array.from(selectedTasks));
      toast.success(`${selectedTasks.size} task(s) deleted successfully`);
      await loadTasks();
      setSelectedTasks(new Set());
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error('Failed to delete tasks');
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
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

  const handleDownloadClick = async (format: 'pdf' | 'docx') => {
    try {
      setLoading(true);
      const selectedTasksList = filteredAndSortedTasks.filter(task => 
        selectedTasks.has(task.id)
      );

      if (selectedTasksList.length === 0) {
        toast.error('Please select tasks to download');
        return;
      }

      await downloadDocument(
        selectedTasksList,
        format,
        documentOptions
      );
      setShowDownloadMenu(false);
      toast.success(`${selectedTasksList.length} task(s) downloaded successfully`);
    } catch (error) {
      toast.error(`Failed to download ${format.toUpperCase()}`);
      console.error('Download error:', error);
    } finally {
      setLoading(false);
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
      {editingTask?.id === task.id ? (
        <TaskEditor
          task={task}
          onSave={handleSave}
          onCancel={() => setEditingTask(null)}
          mode="edit"
        />
      ) : (
        <>
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

          <div className="prose prose-sm max-w-none mb-4">
            <div className="text-gray-900 text-lg font-medium mb-4">
              {formatMathText(task.text)}
            </div>

            {task.correctAnswer && (
              <div className="mb-3">
                <button
                  onClick={(e) => toggleSolution(e, task.id)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {expandedSolutions.has(task.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Solution
                </button>
                <AnimatePresence>
                  {expandedSolutions.has(task.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 bg-green-50 rounded-lg p-4"
                    >
                      <div className="text-green-700">
                        {formatMathText(task.correctAnswer)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {task.answer && (
              <div>
                <button
                  onClick={(e) => toggleAnswer(e, task.id)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {expandedAnswers.has(task.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Answer
                </button>
                <AnimatePresence>
                  {expandedAnswers.has(task.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 bg-blue-50 rounded-lg p-4"
                    >
                      <div className="text-blue-700">
                        {formatMathText(task.answer)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

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
                    icon={<Download className="w-4 h-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBulkAction('download');
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Share2 className="w-4 h-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBulkAction('share');
                    }}
                  >
                    Share
                  </Button>
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
      )}
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

  const DownloadMenu = () => (
    <div className="relative download-menu">
      <AnimatePresence>
        {showDownloadMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl 
                       border border-gray-200 overflow-hidden z-20"
          >
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Export Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900">
                  <input
                    type="checkbox"
                    checked={documentOptions.includeSolutions}
                    onChange={(e) => setDocumentOptions(prev => ({
                      ...prev,
                      includeSolutions: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 
                             focus:ring-blue-500 transition-colors"
                  />
                  <span>Include Solutions</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900">
                  <input
                    type="checkbox"
                    checked={documentOptions.includeAnswers}
                    onChange={(e) => setDocumentOptions(prev => ({
                      ...prev,
                      includeAnswers: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 
                             focus:ring-blue-500 transition-colors"
                  />
                  <span>Include Answers</span>
                </label>
              </div>
            </div>
            
            <div className="p-2">
              <button
                onClick={() => handleBulkAction('download', 'pdf')}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700
                         hover:bg-gray-50 rounded-lg transition-colors"
              >
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="flex-1 text-left text-sm">PDF Document</span>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
              <button
                onClick={() => handleBulkAction('download', 'docx')}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700
                         hover:bg-gray-50 rounded-lg transition-colors"
              >
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="flex-1 text-left text-sm">Word Document</span>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDownloadMenu && !(event.target as Element).closest('.download-menu')) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadMenu]);

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

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No tasks found
          </h2>
          <p className="text-gray-600 mb-4">
            Try adjusting your filters or create new tasks.
          </p>
          <button
            onClick={() => navigate('/generate-task')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors"
          >
            Create New Task
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
              icon={<Plus className="w-5 h-5" />}
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
          {/* Left side: Search and Selection Controls */}
          <div className="flex items-center gap-4">
            <div className="relative min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-xl focus:ring-2 focus:ring-blue-500 
                         focus:border-blue-500 bg-gray-50"
              />
            </div>

            {questions.length > 0 && (
              <>
                <div className="h-6 w-px bg-gray-200" /> {/* Divider */}
                <button
                  onClick={() => {
                    if (selectedTasks.size === questions.length) {
                      setSelectedTasks(new Set());
                    } else {
                      setSelectedTasks(new Set(questions.map(q => q.id)));
                    }
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {selectedTasks.size === questions.length ? 'Deselect All' : 'Select All'}
                </button>

                {selectedTasks.size > 0 && (
                  <>
                    <div className="h-6 w-px bg-gray-200" /> {/* Divider */}
                    <span className="text-sm text-gray-600">
                      {selectedTasks.size} task(s) selected
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right side: View Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <div className="flex border rounded-lg p-1 bg-gray-50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 border-t mb-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
                           focus:border-blue-500 bg-gray-50"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>

                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
                           focus:border-blue-500 bg-gray-50"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
                           focus:border-blue-500 bg-gray-50"
                >
                  <option value="all">All Types</option>
                  {types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons - Moved to bottom right */}
        <div className="flex justify-end pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreating(!isCreating)}
            >
              New Task
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDownloadMenu(!showDownloadMenu);
                }}
                disabled={selectedTasks.size === 0}
              >
                Download
              </Button>
              <AnimatePresence>
                {showDownloadMenu && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <DownloadMenu />
                  </div>
                )}
              </AnimatePresence>
            </div>
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
          </div>
        </div>
      </motion.div>

      {/* Task Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8"
          >
            <TaskCreator
              onCreate={handleCreateTask}
              onCancel={() => setIsCreating(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks Display */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAndSortedTasks.map(renderTaskCard)}
          </AnimatePresence>
        </motion.div>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderTaskList()}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Empty State */}
      {filteredAndSortedTasks.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No tasks found. Try adjusting your filters or create new tasks.</p>
          <Button
            variant="primary"
            icon={<Plus className="w-5 h-5" />}
            onClick={() => navigate('/generate-task')}
          >
            Create New Task
          </Button>
        </motion.div>
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
                  Are you sure you want to delete {selectedTasks.size} task(s)? This action cannot be undone.
                  Deleted tasks will be permanently removed after 30 days.
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
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg
                             hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete Tasks
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};