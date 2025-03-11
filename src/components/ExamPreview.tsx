import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/examStore';
import { ArrowLeft, Save, Download, FileText, GripVertical, Edit2, X, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useLanguageStore } from '../store/languageStore';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { TaskEditor } from './TaskEditor';
import type { Question } from '../types/exam';
import { StrictModeDroppable } from './StrictModeDroppable';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadDocument } from '../services/documentGenerator';
import { useToast } from './Toast';

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
    return part.split('\n').map((line, lineIndex) => (
      <React.Fragment key={`${index}-${lineIndex}`}>
        {line}
        {lineIndex < part.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  });
};

export const ExamPreview = () => {
  const navigate = useNavigate();
  const { questions, examConfig, setQuestions, reorderQuestions } = useExamStore();
  const { t } = useLanguageStore();
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Question | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [documentOptions, setDocumentOptions] = useState({
    includeSolutions: false,
    includeAnswers: false
  });
  const { showToast } = useToast();

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
    setQuestions(newQuestions);
    setEditingTask(null);
  };

  const handleCancel = () => {
    setEditingTask(null);
  };

  const handleStartPractice = () => {
    navigate('/exam-completion', {
      state: {
        questions,
        examConfig
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

  const handleDownload = async (format: 'pdf' | 'docx') => {
    try {
      if (selectedTasks.size === 0) {
        showToast('Please select questions to download', 'error');
        return;
      }

      const selectedTasksList = questions.filter(task => selectedTasks.has(task.id));
      await downloadDocument(selectedTasksList, format, documentOptions);
      setShowDownloadMenu(false);
      showToast('Questions downloaded successfully', 'success');
    } catch (error) {
      showToast('Failed to download questions', 'error');
      console.error('Download error:', error);
    }
  };

  const organizedQuestions = React.useMemo(() => {
    if (!examConfig?.sections) return [];
    
    return examConfig.sections.map(section => ({
      section,
      questions: questions.filter(q => q.type === section)
    })).filter(group => group.questions.length > 0);
  }, [questions, examConfig]);

  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">{t('exam.noQuestions')}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('exam.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 bg-white rounded-xl shadow-sm p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          {t('exam.back')}
        </button>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700
                     hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Download
          </button>
          
          <button
            onClick={handleStartPractice}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white 
                     rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Clock className="w-5 h-5" />
            Start Practice
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {organizedQuestions.map((group, groupIndex) => (
          <div key={group.section} className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {group.section}
            </h2>
            
            <StrictModeDroppable droppableId={`section-${groupIndex}`}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-4"
                >
                  {group.questions.map((question, index) => (
                    <Draggable 
                      key={question.id} 
                      draggableId={question.id} 
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="bg-white rounded-xl shadow-sm overflow-hidden"
                        >
                          <div className="p-6">
                            <div className="flex items-start gap-4">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-5 w-5 text-gray-400" />
                              </div>
                              
                              <div className="flex-1">
                                <div className="text-lg text-gray-900 mb-4">
                                  {formatMathText(question.text)}
                                </div>
                                
                                {question.answers && (
                                  <div className="ml-4 space-y-2">
                                    {Array.isArray(question.answers) && 
                                      question.answers.map((answer, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                          <span className="text-sm font-medium">
                                            {String.fromCharCode(65 + i)}.
                                          </span>
                                          <span>{formatMathText(answer)}</span>
                                        </div>
                                      ))
                                    }
                                  </div>
                                )}
                                
                                <button
                                  onClick={() => toggleTask(question.id)}
                                  className="mt-4 text-gray-500 hover:text-gray-700 
                                           flex items-center gap-1"
                                >
                                  {expandedTasks.has(question.id) ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                  {expandedTasks.has(question.id) ? 'Hide' : 'Show'} Details
                                </button>

                                {expandedTasks.has(question.id) && (
                                  <div className="mt-4 space-y-4">
                                    {question.answer && (
                                      <div className="pl-4 border-l-4 border-blue-500">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-1">
                                          Answer:
                                        </h4>
                                        <div className="text-gray-600">
                                          {formatMathText(question.answer)}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {question.correctAnswer && (
                                      <div className="pl-4 border-l-4 border-green-500">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-1">
                                          Solution:
                                        </h4>
                                        <div className="text-gray-600">
                                          {formatMathText(question.correctAnswer)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => handleEdit(question)}
                                className="p-2 text-gray-400 hover:text-gray-600"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
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
          </div>
        ))}
      </DragDropContext>
    </div>
  );
}; 