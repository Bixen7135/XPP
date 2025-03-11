import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Grid, List, Filter, Plus, Download, Trash2, 
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
import { SheetImportModal } from './SheetImportModal';
import { SheetExportModal } from './SheetExportModal';
import { SaveSheet } from './SaveSheet';
import { Question } from '../types/exam';

type ViewMode = 'grid' | 'list';
type SortField = 'created_at' | 'title' | 'updated_at' | 'task_count';
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
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
  const [exportTasks, setExportTasks] = useState<Question[]>([]);
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);

  // Load sheets on component mount
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
      
      // Load tasks for each sheet
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

  const handleCreateSheet = async (title: string, description?: string) => {
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
            tasks: [],
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

  // Apply filters and sorting to sheets
  const filteredSheets = useMemo(() => {
    let result = [...sheets];
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(sheet => 
        sheet.title.toLowerCase().includes(searchLower) || 
        (sheet.description && sheet.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply topic filters
    if (filters.topics.size > 0) {
      result = result.filter(sheet => {
        const sheetTasks = tasks[sheet.id] || [];
        return sheetTasks.some(task => 
          filters.topics.has(task.topic)
        );
      });
    }
    
    // Apply difficulty filters
    if (filters.difficulties.size > 0) {
      result = result.filter(sheet => {
        const sheetTasks = tasks[sheet.id] || [];
        return sheetTasks.some(task => 
          filters.difficulties.has(task.difficulty)
        );
      });
    }
    
    // Apply date range filter
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
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          if (a.updated_at && b.updated_at) {
            comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          }
          break;
        case 'task_count':
          comparison = (a.tasks?.length || 0) - (b.tasks?.length || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [sheets, tasks, filters, sortField, sortDirection]);

  return (
    <PageLayout maxWidth="2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Sheets Library</h1>
            <p className="text-gray-600">Manage your saved task sheets</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateSheet(true)}
            >
              New Sheet
            </Button>
            
            {sheetToDelete && (
              <Button
                variant="ghost"
                icon={<Trash2 className="w-4 h-4 text-red-500" />}
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-500"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
        
        {/* Search and filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search sheets..."
              value={filters.search}
              onChange={handleSearch}
              className="pl-10 w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-blue-50 text-blue-600" : ""}
            >
              Filters
            </Button>
            
            <div className="border-r h-6 mx-1"></div>
            
            <Button
              variant="ghost"
              icon={<Grid className="w-4 h-4" />}
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? "bg-blue-50 text-blue-600" : ""}
            />
            
            <Button
              variant="ghost"
              icon={<List className="w-4 h-4" />}
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? "bg-blue-50 text-blue-600" : ""}
            />
          </div>
        </div>
        
        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <SheetFilters 
                filters={filters}
                updateFilters={updateFilters}
                clearFilters={clearFilters}
                tasks={Object.values(tasks).flat()}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Sort controls */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-500">
            {filteredSheets.length} sheet{filteredSheets.length !== 1 ? 's' : ''} found
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Sort by:</span>
            
            <button
              onClick={() => toggleSort('created_at')}
              className={`text-sm flex items-center gap-1 ${
                sortField === 'created_at' ? 'text-blue-600 font-medium' : 'text-gray-600'
              }`}
            >
              Date
              {sortField === 'created_at' && (
                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={() => toggleSort('title')}
              className={`text-sm flex items-center gap-1 ${
                sortField === 'title' ? 'text-blue-600 font-medium' : 'text-gray-600'
              }`}
            >
              Title
              {sortField === 'title' && (
                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={() => toggleSort('task_count')}
              className={`text-sm flex items-center gap-1 ${
                sortField === 'task_count' ? 'text-blue-600 font-medium' : 'text-gray-600'
              }`}
            >
              Tasks
              {sortField === 'task_count' && (
                sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        
        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        ) : filteredSheets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No task sheets found</h3>
            <p className="text-gray-600 mb-6">
              {filters.search || filters.topics.size > 0 || filters.difficulties.size > 0 || filters.dateRange[0] || filters.dateRange[1] ? 
                'Try adjusting your filters or search query' : 
                'Create your first task sheet to get started'}
            </p>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateSheet(true)}
            >
              Create New Sheet
            </Button>
          </div>
        ) : (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4`}>
            {filteredSheets.map(sheet => (
              <SheetCard
                key={sheet.id}
                sheet={sheet}
                tasks={tasks[sheet.id] || []}
                onView={() => handleViewSheet(sheet.id)}
                onEdit={(e) => {
                  e.stopPropagation();
                  handleEditSheet(sheet.id);
                }}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Create Sheet Modal */}
      <AnimatePresence>
        {showCreateSheet && (
          <SaveSheet
            onSave={handleCreateSheet}
            onClose={() => setShowCreateSheet(false)}
          />
        )}
      </AnimatePresence>
      
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
                  Are you sure you want to permanently delete this sheet? This action cannot be undone.
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
                    onClick={handleDeleteSheets}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg
                             hover:bg-red-700 transition-colors"
                  >
                    Delete Sheet
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}; 