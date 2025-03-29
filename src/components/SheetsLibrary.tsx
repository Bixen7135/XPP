import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, LayoutGrid, List, Filter, Plus, Trash2, 
  SortAsc, SortDesc, Calendar, BookOpen, FileText, 
  Loader2, AlertTriangle, X, CheckCircle2, Edit
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { PageLayout } from './common/PageLayout';
import { Button } from './common/Button';
import { useToast } from './Toast';
import { TaskSheet } from '../types/supabase';
import { SheetCard } from './SheetCard';
import { SheetFilters } from './SheetFilters';
import { TaskSelectModal } from './TaskSelectModal';
import { Question } from '../types/exam';

type ViewMode = 'grid' | 'list';
type SortField = 'created_at' | 'title' | 'tasks';
type SortDirection = 'asc' | 'desc';

interface Filters {
  search: string;
  topics: Set<string>;
  difficulties: Set<string>;
  dateRange: [Date | null, Date | null];
  tags: Set<string>;
}

export const SheetsLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [sheets, setSheets] = useState<TaskSheet[]>([]);
  const [tasks, setTasks] = useState<Record<string, Question[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    topics: new Set<string>(),
    difficulties: new Set<string>(),
    dateRange: [null, null],
    tags: new Set<string>(),
  });
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);

  
  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('task_sheets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setSheets(data || []);
      
      
      const tasksMap: Record<string, Question[]> = {};
      
      for (const sheet of data || []) {
        if (sheet.tasks && sheet.tasks.length > 0) {
          const { data: taskData, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .in('id', sheet.tasks);
            
          if (!taskError && taskData) {
            tasksMap[sheet.id] = taskData;
          }
        }
      }
      
      setTasks(tasksMap);
    } catch (err) {
      console.error('Error loading sheets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sheets');
      showToast('Failed to load sheets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSheet = async (title: string, description: string | undefined, selectedTasks: Question[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('task_sheets')
        .insert([
          {
            user_id: user.id,
            title,
            description,
            tasks: selectedTasks.map(task => task.id),
          }
        ])
        .select();
        
      if (error) throw error;
      
      showToast('Sheet created successfully', 'success');
      setShowCreateSheet(false);
      loadSheets();
    } catch (err) {
      console.error('Error creating sheet:', err);
      showToast('Failed to create sheet', 'error');
    }
  };

  const handleDeleteSheets = async () => {
    try {
      const { error } = await supabase
        .from('task_sheets')
        .delete()
        .eq('id', sheetToDelete);
        
      if (error) throw error;
      
      showToast('Sheet deleted successfully', 'success');
      setShowDeleteConfirm(false);
      loadSheets();
    } catch (err) {
      console.error('Error deleting sheet:', err);
      showToast('Failed to delete sheet', 'error');
    }
  };

  const handleViewSheet = (sheetId: string) => {
    navigate(`/sheets/${sheetId}`);
  };

  const handleEditSheet = (sheetId: string) => {
    navigate(`/sheets/${sheetId}/edit`);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      search: e.target.value
    }));
  };

  const updateFilters = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      topics: new Set<string>(),
      difficulties: new Set<string>(),
      dateRange: [null, null],
      tags: new Set<string>(),
    });
  };

  
  const filteredSheets = useMemo(() => {
    let result = [...sheets];
    
   
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(sheet => 
        sheet.title.toLowerCase().includes(searchLower) || 
        (sheet.description && sheet.description.toLowerCase().includes(searchLower))
      );
    }
    
    
    if (filters.topics.size > 0) {
      result = result.filter(sheet => {
        const sheetTasks = tasks[sheet.id] || [];
        return sheetTasks.some(task => 
          filters.topics.has(task.topic)
        );
      });
    }
    
    
    if (filters.difficulties.size > 0) {
      result = result.filter(sheet => {
        const sheetTasks = tasks[sheet.id] || [];
        return sheetTasks.some(task => 
          filters.difficulties.has(task.difficulty)
        );
      });
    }
    
    
    if (filters.dateRange[0] || filters.dateRange[1]) {
      result = result.filter(sheet => {
        const sheetDate = new Date(sheet.created_at);
        const startDate = filters.dateRange[0];
        const endDate = filters.dateRange[1];
        
        if (startDate && endDate) {
          return sheetDate >= startDate && sheetDate <= endDate;
        } else if (startDate) {
          return sheetDate >= startDate;
        } else if (endDate) {
          return sheetDate <= endDate;
        }
        
        return true;
      });
    }
    
   
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'tasks':
          comparison = (a.tasks?.length || 0) - (b.tasks?.length || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [sheets, tasks, filters, sortField, sortDirection]);

  return (
    <PageLayout maxWidth="2xl">
      <div className="max-w-7xl mx-auto space-y-6">
       
        <div className="flex items-start justify-between gap-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Task Sheets</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">Manage and organize your task sheets</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={<Plus className="w-5 h-5" />}
              onClick={() => setShowCreateSheet(true)}
              className="shadow-lg hover:shadow-xl transition-shadow"
            >
              New Sheet
            </Button>
          </div>
        </div>

        
        <motion.div layout className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-4">
             
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={handleSearch}
                    placeholder="Search sheets..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl 
                              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                              bg-white dark:bg-gray-800 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 
                              transition-all duration-200
                              text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                              text-lg"
                  />
                </div>
              </div>

             
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              
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
                Filters {(filters.topics.size + filters.difficulties.size + (filters.dateRange[0] || filters.dateRange[1] ? 1 : 0)) > 0 && (
                  <span className={`ml-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    showFilters 
                      ? "bg-blue-500/20 dark:bg-blue-400/20 text-white" 
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}>
                    {filters.topics.size + filters.difficulties.size + (filters.dateRange[0] || filters.dateRange[1] ? 1 : 0)}
                  </span>
                )}
              </Button>
            </div>
          </div>

         
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-gray-200 dark:border-gray-700"
              >
                <div className="p-6">
                  <SheetFilters
                    filters={filters}
                    updateFilters={updateFilters}
                    clearFilters={clearFilters}
                    tasks={Object.values(tasks).flat()}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <div className="flex gap-3">
             
            </div>

            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sort by:</span>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleSort('created_at')}
                  className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    sortField === 'created_at' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Date
                  {sortField === 'created_at' && (
                    sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </button>
                
                <button
                  onClick={() => toggleSort('title')}
                  className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    sortField === 'title' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Title
                  {sortField === 'title' && (
                    sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </button>
                
                <button
                  onClick={() => toggleSort('tasks')}
                  className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    sortField === 'tasks' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Tasks
                  {sortField === 'tasks' && (
                    sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

       
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px] bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Error loading sheets
            </h3>
            <p className="text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            {filteredSheets.length > 0 ? (
              <motion.div layout className={`${
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr'
                  : 'space-y-4'
              }`}>
                <AnimatePresence>
                  {filteredSheets.map(sheet => (
                    <SheetCard
                      key={sheet.id}
                      sheet={sheet}
                      tasks={tasks[sheet.id] || []}
                      onView={() => handleViewSheet(sheet.id)}
                      onEdit={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleEditSheet(sheet.id);
                      }}
                      viewMode={viewMode}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <FileText className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No sheets found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Create a new sheet or import tasks to get started
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Plus className="w-5 h-5" />}
                  onClick={() => setShowCreateSheet(true)}
                  className="mt-4"
                >
                  Create New Sheet
                </Button>
              </div>
            )}
          </div>
        )}

        
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
                    Are you sure you want to delete this sheet? This action cannot be undone.
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
                      onClick={handleDeleteSheets}
                      className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg
                               hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      Delete Sheet
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        
        <AnimatePresence>
          {showCreateSheet && (
            <TaskSelectModal
              onClose={() => setShowCreateSheet(false)}
              onSave={handleCreateSheet}
            />
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}; 