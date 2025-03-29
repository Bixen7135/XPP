import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/examStore';
import { ArrowLeft, Save, Download, FileText, GripVertical, Edit2, X, Clock, ChevronDown, ChevronUp, Plus, PlusCircle, Trash2, CheckCircle, AlertTriangle, BookOpen, Eye, EyeOff } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useLanguageStore } from '../store/languageStore';
import { DragDropContext, Droppable, Draggable, DroppableProps } from 'react-beautiful-dnd';
import type { Question } from '../types/exam';
import { TaskEditor } from './TaskEditor';
import type { DropResult } from 'react-beautiful-dnd';
import { StrictModeDroppable } from './StrictModeDroppable';
import { TaskPreviewActions } from './TaskPreviewActions';
import { downloadDocument } from '../services/documentGenerator';
import { deleteTasks } from '../services/supabase';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCreator } from './TaskCreation';
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';
import { SheetExportModal } from './SheetExportModal';
import { SheetDownloadModal } from './SheetDownloadModal';
import { SaveSheet } from './SaveSheet';
import { TaskSheet } from '../types/supabase';
import { Button } from './common/Button';
import { TaskEditModal } from './TaskEditModal';

const styles = `
  .solution-text {
    overflow-x: auto;
  }
  .solution-text .katex-display {
    margin: 1em 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.5em 0;
  }
  .solution-text .katex {
    font-size: 1.1em;
  }
  .task-creator-overlay {
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
  .delete-confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
  }
`;

const formatMathText = (text: string) => {
  if (!text) return '';
  
  // Split text into math and non-math parts
  // Handle both inline (\( \)) and display math (\[ \]) formats
  const parts = text.split(/(\\\[.*?\\\]|\\\(.*?\\\))/gs);
  
  return parts.map((part, index) => {
    // Handle display math mode \[ \]
    if (part.startsWith('\\[') && part.endsWith('\\]')) {
      const mathContent = part.slice(2, -2).trim();
      return (
        <div key={index} className="my-2">
          <BlockMath math={mathContent} />
        </div>
      );
    }
    // Handle inline math mode \( \)
    if (part.startsWith('\\(') && part.endsWith('\\)')) {
      const mathContent = part.slice(2, -2).trim();
      return <InlineMath key={index} math={mathContent} />;
    }
    // Handle line breaks in non-math text
    return part.split('\n').map((line, lineIndex) => (
      <React.Fragment key={`${index}-${lineIndex}`}>
        {line}
        {lineIndex < part.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  });
};

export const TaskPreview = () => {
  const navigate = useNavigate();
  const { questions, updateQuestion, reorderQuestions, setQuestions } = useExamStore();
  const { t } = useLanguageStore();
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Question | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [documentOptions, setDocumentOptions] = useState({
    includeSolutions: false,
    includeAnswers: false
  });
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !result.draggableId) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    reorderQuestions(sourceIndex, destinationIndex);
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

      // Update local state
      const newQuestions = questions.map(q => 
        q.id === updatedTask.id ? updatedTask : q
      );
      updateQuestion(questions.findIndex(q => q.id === updatedTask.id), updatedTask);

      setEditingTask(null);
      showToast('Task updated successfully', 'success');
    } catch (err) {
      console.error('Error updating task:', err);
      showToast('Failed to update task', 'error');
      throw err;
    }
  };

  const handleCancel = () => {
    setEditingTask(null);
  };

  const handleStartPractice = () => {
    navigate('/task-completion', {
      state: {
        questions
      }
    });
  };

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleSaveComplete = async () => {
    try {
      if (selectedTasks.size === 0) {
        showToast('Please select tasks to save', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Only save selected tasks
      const tasksToSave = questions
        .filter(task => selectedTasks.has(task.id))
        .map(task => ({
          id: task.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) 
            ? task.id 
            : uuidv4(),
          text: task.text,
          type: task.type,
          topic: task.topic,
          difficulty: task.difficulty,
          correct_answer: task.correctAnswer,
          answers: task.answer ? { answer: task.answer } : null,
          explanation: task.explanation || null,
          context: task.context || null,
          instructions: task.instructions || null,
          learning_outcome: task.learningOutcome || null,
          user_id: user.id
        }));

      const { error } = await supabase
        .from('tasks')
        .upsert(tasksToSave, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      showToast(`${selectedTasks.size} task(s) saved to library successfully`, 'success');
      
      // Optionally, you can also save the task sheet as a collection
      if (tasksToSave.length > 1) {
        const sheetId = uuidv4();
        const { error: sheetError } = await supabase
          .from('task_sheets')
          .insert({
            id: sheetId,
            title: `Task Sheet - ${new Date().toLocaleDateString()}`,
            description: `Task sheet with ${tasksToSave.length} tasks`,
            user_id: user.id,
            task_ids: tasksToSave.map(t => t.id),
            created_at: new Date().toISOString()
          });
        
        if (sheetError) {
          console.error('Error saving task sheet:', sheetError);
        } else {
          showToast('Task sheet also saved to sheets library', 'success');
        }
      }
      
      navigate('/library');
    } catch (error) {
      console.error('Error saving tasks:', error);
      showToast('Failed to save tasks to library', 'error');
    }
  };

  const handleCreateTask = (task: Question) => {
    setQuestions([...questions, task]);
    setIsCreating(false);
  };

  const handleExportClick = () => {
    if (selectedTasks.size === 0) {
      showToast('Please select tasks to export', 'error');
      return;
    }
    setShowExportModal(true);
  };

  const handleDelete = () => {
    if (selectedTasks.size === 0) {
      showToast('Please select tasks to delete', 'error');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setQuestions(questions.filter(task => !selectedTasks.has(task.id)));
      setSelectedTasks(new Set());
      setShowDeleteConfirm(false);
      showToast('Tasks deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete tasks', 'error');
      console.error('Delete error:', error);
    }
  };

  const handleSaveAsSheet = async (title: string, tasks: Question[], description?: string) => {
    try {
      setError(null);
      
      if (tasks.length === 0) {
        setError("No tasks selected to save");
        return;
      }
      
      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("You must be logged in to save sheets");
        return;
      }
      
      // First, save all tasks to the tasks library
      const tasksForLibrary = tasks.map(task => ({
        id: task.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) 
          ? task.id 
          : uuidv4(),
        text: task.text,
        type: task.type,
        topic: task.topic,
        difficulty: task.difficulty,
        correct_answer: task.correctAnswer,
        answers: task.answer ? { answer: task.answer } : null,
        explanation: task.explanation || null,
        context: task.context || null,
        instructions: task.instructions || null,
        learning_outcome: task.learningOutcome || null,
        user_id: user.id
      }));

      // Upsert tasks to the tasks table
      const { error: tasksError } = await supabase
        .from('tasks')
        .upsert(tasksForLibrary, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (tasksError) throw tasksError;
      
      // Make sure we use the potentially new IDs for the sheet
      const taskIds = tasksForLibrary.map(t => t.id);
      
      // Then save the sheet with references to those tasks
      const sheetData = {
        user_id: user.id,
        title: title,
        description: description || '',
        tasks: taskIds
      };
      
      const { error: saveError } = await supabase
        .from('task_sheets')
        .insert(sheetData);
      
      if (saveError) throw saveError;
      
      showToast("Sheet and tasks saved successfully", "success");
      setShowSaveSheet(false);
      
      // Optionally navigate to the sheets library
      navigate('/sheets');
    } catch (err) {
      console.error("Error saving sheet:", err);
      setError(err instanceof Error ? err.message : "Failed to save sheet");
      showToast("Failed to save sheet", "error");
    }
  };

  const handleDownloadClick = () => {
    if (selectedTasks.size === 0) {
      showToast('Please select tasks to download', 'error');
      return;
    }
    setShowDownloadModal(true);
  };

  const DownloadMenu = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-xl shadow-lg p-4 z-10 border border-gray-700"
    >
      <h3 className="text-lg font-semibold mb-4 text-white">Download Options</h3>
      
      <div className="space-y-3 mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={documentOptions.includeSolutions}
            onChange={(e) => setDocumentOptions(prev => ({
              ...prev,
              includeSolutions: e.target.checked
            }))}
            className="rounded border-gray-600 bg-gray-700 text-blue-500"
          />
          <span className="text-gray-300">Include Solutions</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={documentOptions.includeAnswers}
            onChange={(e) => setDocumentOptions(prev => ({
              ...prev,
              includeAnswers: e.target.checked
            }))}
            className="rounded border-gray-600 bg-gray-700 text-blue-500"
          />
          <span className="text-gray-300">Include Answers</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleExportClick()}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors"
        >
          Export
        </button>
      </div>
    </motion.div>
  );

  const renderEmptyState = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-gray-700"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          No Tasks Available
        </h3>
        <p className="text-gray-400 mb-8">
          Get started by creating a new task or generating a task sheet
        </p>
        <div className="flex items-center justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-gray-700 text-gray-300 border-2 border-gray-600 
                     rounded-2xl hover:bg-gray-600 transition-all duration-200 
                     flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/generate-task')}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl 
                     hover:bg-blue-700 transition-all duration-200 
                     flex items-center gap-2 font-medium shadow-md"
          >
            <FileText className="w-5 h-5" />
            Generate Task Sheet
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  if (questions.length === 0) {
    return (
      <>
        <style>{styles}</style>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6 bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-700">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-300 hover:text-white rounded-full"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('tasks.back')}
            </button>
          </div>

          <div className="text-center py-12">
            {renderEmptyState()}
          </div>

         
          <AnimatePresence>
            {isCreating && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="task-creator-overlay"
              >
                <motion.div
                  initial={{ y: -20 }}
                  animate={{ y: 0 }}
                  exit={{ y: -20 }}
                  className="w-full max-w-3xl mx-4"
                >
                  <TaskCreator
                    onCreate={handleCreateTask}
                    onCancel={() => setIsCreating(false)}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    );
  }
  console.log(questions[0].correctAnswer)
  return (
    <>
      <style>{styles}</style>
      <div className="max-w-6xl mx-auto px-4 py-8 relative min-h-screen">
        <div className="flex items-center justify-between mb-6 bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-300 hover:text-white rounded-full"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('tasks.back')}
            </button>

           
            {questions.length > 0 && (
              <>
                <div className="h-6 w-px bg-gray-700" /> 
                <button
                  onClick={() => {
                    if (selectedTasks.size === questions.length) {
                      setSelectedTasks(new Set());
                    } else {
                      setSelectedTasks(new Set(questions.map(q => q.id)));
                    }
                  }}
                  className="text-sm text-gray-300 hover:text-white"
                >
                  {selectedTasks.size === questions.length ? 'Deselect All' : 'Select All'}
                </button>

                {selectedTasks.size > 0 && (
                  <>
                    <div className="h-6 w-px bg-gray-700" /> 
                    <span className="text-sm text-gray-300">
                      {selectedTasks.size} task(s) selected
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white 
                         rounded-full hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="w-5 h-5" />
                Create Task
              </button>
            </div>
            
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-400
                       hover:bg-red-900/30 rounded-full transition-colors"
              disabled={selectedTasks.size === 0}
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </button>

            <button
              onClick={handleDownloadClick}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full
                       hover:bg-green-700 transition-colors"
              disabled={selectedTasks.size === 0}
            >
              <Download className="w-5 h-5" />
              Download
            </button>

            <button
              onClick={() => setShowSaveSheet(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full
                       hover:bg-blue-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              Save as Sheet
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500 text-red-300 rounded">
            {error}
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <StrictModeDroppable droppableId="tasks" type="TASK">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-4"
              >
                {questions.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-gray-800 rounded-xl shadow-sm overflow-hidden cursor-pointer
                                  transition-all duration-200 border border-gray-700
                                  ${selectedTasks.has(task.id) ? 'ring-2 ring-blue-500 bg-blue-900/30' : ''}`}
                        onClick={() => {
                          const newSelected = new Set(selectedTasks);
                          if (selectedTasks.has(task.id)) {
                            newSelected.delete(task.id);
                          } else {
                            newSelected.add(task.id);
                          }
                          setSelectedTasks(newSelected);
                        }}
                      >
                        <div className="p-6">
                          <div className="flex items-start gap-4">
                            
                            <div {...provided.dragHandleProps} className="mt-1">
                              <GripVertical className="h-5 w-5 text-gray-400" />
                            </div>

                            
                            <div className="flex-1">
                              <div className="text-lg text-white mb-2">
                                {formatMathText(task.text)}
                              </div>
                              
                              
                              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                                <span>Type: {task.type}</span>
                                <span>Difficulty: {task.difficulty}</span>
                                <span>Topic: {task.topic}</span>
                              </div>

                              
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTask(task.id);
                                  }}
                                  className="p-2 text-gray-400 hover:text-gray-300 
                                           hover:bg-gray-700 rounded-full transition-colors"
                                >
                                  {expandedTasks.has(task.id) ? (
                                    <ChevronUp className="h-5 w-5" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5" />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(task);
                                  }}
                                  className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-full"
                                >
                                  <Edit2 className="h-5 w-5" />
                                </button>
                              </div>

                              
                              {expandedTasks.has(task.id) && (
                                <div className="mt-4 space-y-4 animate-fadeIn">
                                  <div className="pl-4 border-l-4 border-green-500">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-1">
                                      {t('tasks.solution')}:
                                    </h4>
                                    <div className="text-gray-400 whitespace-pre-line solution-text">
                                      {task.explanation ? (
                                        formatMathText(task.explanation)
                                      ) : task.correctAnswer ? (
                                        formatMathText(task.correctAnswer)
                                      ) : (
                                        <span className="text-gray-500">No solution available</span>
                                      )}
                                    </div>
                                  </div>

                                  {task.answer && (
                                    <div className="pl-4 border-l-4 border-blue-500">
                                      <h4 className="text-sm font-semibold text-gray-300 mb-1">
                                        {t('tasks.answer')}:
                                      </h4>
                                      <div className="text-gray-400">
                                        {formatMathText(task.answer)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </StrictModeDroppable>
        </DragDropContext>

        <div className="fixed bottom-8 right-8">
          <button
            onClick={handleStartPractice}
            className="flex items-center px-6 py-3 bg-green-600 text-white rounded-full
                     hover:bg-green-700 transition-colors duration-200 shadow-lg
                     hover:shadow-xl transform hover:scale-105 transition-all"
          >
            <Clock className="h-5 w-5 mr-2" />
            Start Practice
          </button>
        </div>
      </div>

      
      <AnimatePresence>
        {editingTask && (
          <TaskEditModal
            task={editingTask}
            onSave={handleSave}
            onClose={() => setEditingTask(null)}
          />
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="task-creator-overlay"
          >
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
              className="w-full max-w-3xl mx-4"
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
              className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 w-full
                       border border-gray-700"
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full 
                              bg-red-900/30 mb-6">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Confirm Deletion
                </h3>
                <p className="text-sm text-gray-400 mb-8">
                  Are you sure you want to permanently delete {selectedTasks.size} task(s)? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={confirmDelete}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete Tasks
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {showSaveSheet && (
          <SaveSheet
            selectedTasks={questions.filter(task => selectedTasks.has(task.id))}
            onSave={handleSaveAsSheet}
            onClose={() => setShowSaveSheet(false)}
          />
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {showDownloadModal && (
          <SheetDownloadModal
            onClose={() => setShowDownloadModal(false)}
            tasks={questions.filter(task => selectedTasks.has(task.id))}
            sheetTitle="Selected Tasks"
          />
        )}
      </AnimatePresence>

      
      <AnimatePresence>
        {showExportModal && (
          <SheetExportModal
            onClose={() => setShowExportModal(false)}
            tasks={questions.filter(task => selectedTasks.has(task.id))}
            sheetTitle="Selected Tasks"
          />
        )}
      </AnimatePresence>
    </>
  );
};