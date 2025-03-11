import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import { PageLayout } from './common/PageLayout';
import { supabase } from '../services/supabase';
import { TaskSheet } from '../types/supabase';
import { Question } from '../types/exam';
import { ArrowLeft, Save, Trash2, GripVertical, Plus, AlertTriangle, Edit2 } from 'lucide-react';
import { Button } from './common/Button';
import { toast } from 'react-hot-toast';
import { StrictModeDroppable } from './StrictModeDroppable';
import { TaskSelectorModal } from './TaskSelectorModal';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { TaskEditor } from './TaskEditor';

const styles = `
  .task-editor-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 2rem;
    z-index: 50;
    overflow-y: auto;
  }
`;

export const SheetEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<TaskSheet | null>(null);
  const [tasks, setTasks] = useState<Question[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingTask, setEditingTask] = useState<Question | null>(null);

  // Prompt user when trying to leave with unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges]);

  // Load sheet data
  useEffect(() => {
    loadSheet();
  }, [id]);

  const loadSheet = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sheetData, error: sheetError } = await supabase
        .from('task_sheets')
        .select('*')
        .eq('id', id)
        .single();

      if (sheetError) throw sheetError;
      
      setSheet(sheetData);
      setTitle(sheetData.title);
      setDescription(sheetData.description || '');

      if (sheetData?.tasks?.length) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('id', sheetData.tasks);

        if (tasksError) throw tasksError;
        
        const orderedTasks = sheetData.tasks
          .map((taskId: string) => tasksData?.find(task => task.id === taskId))
          .filter(Boolean) as Question[];
        
        setTasks(orderedTasks);
      }
    } catch (error) {
      console.error('Error loading sheet:', error);
      setError('Failed to load task sheet. Please try again.');
      toast.error('Failed to load task sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSaving(true);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Prepare the update data
      const updateData = {
        title,
        description: description || null,
        tasks: tasks.map(task => task.id),  // Use 'tasks' field for task IDs
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('task_sheets')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setHasUnsavedChanges(false);
      toast.success('Sheet updated successfully');
      navigate(`/sheets/${id}`);
    } catch (error) {
      console.error('Error updating sheet:', error);
      toast.error('Failed to update sheet');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    setHasUnsavedChanges(true);
    toast.success('Task removed from sheet');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setTasks(items);
    setHasUnsavedChanges(true);
  };

  const handleAddTasks = (selectedTasks: Question[]) => {
    setTasks(prev => [...prev, ...selectedTasks]);
    setShowTaskSelector(false);
    setHasUnsavedChanges(true);
    toast.success(`Added ${selectedTasks.length} task(s) to sheet`);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'title') setTitle(value);
    if (name === 'description') setDescription(value);
    setHasUnsavedChanges(true);
  };

  const handleEditTask = (updatedTask: Question) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    setEditingTask(null);
    setHasUnsavedChanges(true);
    toast.success('Task updated');
  };

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

  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="flex flex-col items-center justify-center h-64">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-gray-600">{error}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={loadSheet}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="2xl">
      <style>{styles}</style>
      <div className="space-y-6">
        {/* Header with navigation and actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                  navigate(`/sheets/${id}`);
                }
              } else {
                navigate(`/sheets/${id}`);
              }
            }}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Sheet
          </button>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowTaskSelector(true)}
            >
              Add Tasks
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
            >
              {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={title}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter sheet title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={description}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter sheet description"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
            <span className="text-sm text-gray-500">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
              <p className="text-gray-500">No tasks in this sheet yet.</p>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowTaskSelector(true)}
                className="mt-4"
              >
                Add Tasks
              </Button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <StrictModeDroppable droppableId="tasks" type="TASK">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {tasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided) => (
                          <motion.div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            layout
                            className="bg-white rounded-xl shadow-sm p-6"
                          >
                            <div className="flex items-start gap-4">
                              <div
                                {...provided.dragHandleProps}
                                className="flex items-center mt-1"
                              >
                                <GripVertical className="w-5 h-5 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex gap-2 mb-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium
                                    ${task.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                      task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'}`}
                                  >
                                    {task.difficulty}
                                  </span>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    {task.topic}
                                  </span>
                                </div>
                                <div className="text-gray-900 prose prose-sm max-w-none">
                                  {formatMathText(task.text)}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={<Edit2 className="w-4 h-4" />}
                                  onClick={() => setEditingTask(task)}
                                  className="text-blue-600 hover:bg-blue-50"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={<Trash2 className="w-4 h-4" />}
                                  onClick={() => handleRemoveTask(task.id)}
                                  className="text-red-600 hover:bg-red-50"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Task Selector Modal */}
      <AnimatePresence>
        {showTaskSelector && (
          <TaskSelectorModal
            onClose={() => setShowTaskSelector(false)}
            onSelect={handleAddTasks}
            existingTaskIds={tasks.map(t => t.id)}
          />
        )}
      </AnimatePresence>

      {/* Task Editor Modal */}
      <AnimatePresence>
        {editingTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="task-editor-overlay"
          >
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
              className="w-full max-w-4xl mx-4"
            >
              <TaskEditor
                task={editingTask}
                onSave={handleEditTask}
                onCancel={() => setEditingTask(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}; 