import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/examStore';
import { ArrowLeft, Save, Download, FileText, GripVertical, Edit2, X, Clock, ChevronDown, ChevronUp, Plus, PlusCircle, Trash2, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react';
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

  const handleSave = (updatedTask: Question) => {
    const newQuestions = questions.map(q => 
      q.id === updatedTask.id ? updatedTask : q
    );
    updateQuestion(questions.findIndex(q => q.id === updatedTask.id), updatedTask);
    setEditingTask(null);
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
          answers: { answer: task.answer },
          explanation: task.correctAnswer,
          user_id: user.id
        }));

      const { data, error } = await supabase
        .from('tasks')
        .upsert(tasksToSave, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      showToast(`${selectedTasks.size} task(s) saved to library successfully`, 'success');
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

  const handleDownload = async (format: 'pdf' | 'docx') => {
    try {
      if (selectedTasks.size === 0) {
        showToast('Please select tasks to download', 'error');
        return;
      }

      const selectedTasksList = questions.filter(task => selectedTasks.has(task.id));
      await downloadDocument(selectedTasksList, format, documentOptions);
      setShowDownloadMenu(false);
      showToast('Tasks downloaded successfully', 'success');
    } catch (error) {
      showToast('Failed to download tasks', 'error');
      console.error('Download error:', error);
    }
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

  const DownloadMenu = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg p-4 z-10"
    >
      <h3 className="text-lg font-semibold mb-4">Download Options</h3>
      
      <div className="space-y-3 mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={documentOptions.includeSolutions}
            onChange={(e) => setDocumentOptions(prev => ({
              ...prev,
              includeSolutions: e.target.checked
            }))}
            className="rounded border-gray-300"
          />
          <span>Include Solutions</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={documentOptions.includeAnswers}
            onChange={(e) => setDocumentOptions(prev => ({
              ...prev,
              includeAnswers: e.target.checked
            }))}
            className="rounded border-gray-300"
          />
          <span>Include Answers</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleDownload('pdf')}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors"
        >
          PDF
        </button>
        <button
          onClick={() => handleDownload('docx')}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors"
        >
          DOCX
        </button>
      </div>
    </motion.div>
  );

  if (questions.length === 0) {
    return (
      <>
        <style>{styles}</style>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6 bg-white rounded-xl shadow-sm p-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('tasks.back')}
            </button>
          </div>

          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-6">No tasks found. Create new tasks or generate a task sheet.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white 
                         rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Task
              </button>
              <button
                onClick={() => navigate('/generate-task')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white 
                         rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusCircle className="w-5 h-5" />
                Generate Task Sheet
              </button>
            </div>
          </div>

          {/* Task Creation Modal */}
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
        <div className="flex items-center justify-between mb-6 bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('tasks.back')}
            </button>

            {/* Select All and Counter Section */}
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

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white 
                         rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="w-5 h-5" />
                Create Task
              </button>
            </div>
            
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-600
                       hover:bg-red-50 rounded-lg transition-colors"
              disabled={selectedTasks.size === 0}
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </button>

            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700
                         hover:bg-gray-100 rounded-lg transition-colors"
                disabled={selectedTasks.size === 0}
              >
                <Download className="w-5 h-5" />
                Download
              </button>
              {showDownloadMenu && <DownloadMenu />}
            </div>

            <button
              onClick={handleSaveComplete}
              className="flex items-center gap-2 px-4 py-2 text-gray-700
                       hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Save className="w-5 h-5" />
              Save to Library
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
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
                        className={`bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer
                                  transition-all duration-200 
                                  ${selectedTasks.has(task.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
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
                            {/* Drag Handle */}
                            <div {...provided.dragHandleProps} className="mt-1">
                              <GripVertical className="h-5 w-5 text-gray-400" />
                            </div>

                            {/* Task Content */}
                            <div className="flex-1">
                              <div className="text-lg text-gray-900 mb-2">
                                {formatMathText(task.text)}
                              </div>
                              
                              {/* Task Metadata */}
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                <span>Type: {task.type}</span>
                                <span>Difficulty: {task.difficulty}</span>
                                <span>Topic: {task.topic}</span>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTask(task.id);
                                  }}
                                  className="p-2 text-gray-400 hover:text-gray-600 
                                           hover:bg-gray-100 rounded-lg transition-colors"
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
                                  className="p-2 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit2 className="h-5 w-5" />
                                </button>
                              </div>

                              {/* Expanded Content */}
                              {expandedTasks.has(task.id) && (
                                <div className="mt-4 space-y-4 animate-fadeIn">
                                  {task.correctAnswer && (
                                    <div className="pl-4 border-l-4 border-green-500">
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1">
                                        {t('tasks.solution')}:
                                      </h4>
                                      <div className="text-gray-600 whitespace-pre-line solution-text">
                                        {formatMathText(task.correctAnswer)}
                                      </div>
                                    </div>
                                  )}

                                  {task.answer && (
                                    <div className="pl-4 border-l-4 border-blue-500">
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1">
                                        {t('tasks.answer')}:
                                      </h4>
                                      <div className="text-gray-600">
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
            className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl
                     hover:bg-green-700 transition-colors duration-200 shadow-lg
                     hover:shadow-xl transform hover:scale-105 transition-all"
          >
            <Clock className="h-5 w-5 mr-2" />
            Start Practice
          </button>
        </div>
      </div>

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
              className="w-full max-w-3xl mx-4"
            >
              <TaskEditor
                task={editingTask}
                onSave={handleSave}
                onCancel={handleCancel}
                mode="edit"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Creation Modal */}
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="delete-confirm-overlay"
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
                             hover:bg-red-700 transition-colors"
                  >
                    Delete Tasks
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};