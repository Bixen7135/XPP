import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/examStore';
import { ArrowLeft, Save, Download, FileText, Edit2 } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { useLanguageStore } from '../store/languageStore';
import { TaskEditor } from './TaskEditor';
import type { Question } from '../types/exam';

const formatMathText = (text: string) => {
  const parts = text.split(/(\\\(.*?\\\))/g);
  return parts.map((part, index) => {
    if (part.startsWith('\\(') && part.endsWith('\\)')) {
      const mathContent = part.slice(2, -2);
      return <InlineMath key={index} math={mathContent} />;
    }
    return part;
  });
};

export const ExamPreview = () => {
  const navigate = useNavigate();
  const { questions, examConfig, setQuestions } = useExamStore();
  const { t } = useLanguageStore();
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Question | null>(null);

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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        {t('exam.back')}
      </button>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {examConfig && (
          <div className="p-6 border-b">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                {t('exam.type')}: {examConfig.type}
              </span>
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                {t('exam.sections')}: {examConfig.sections.join(', ')}
              </span>
            </div>
          </div>
        )}

        <div className="p-6">
          {examConfig?.sections.map((section) => (
            <div key={section} className="mb-8 last:mb-0">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{section}</h2>
              {questions
                .filter(q => q.type === section)
                .map((question, index) => (
                  <div key={index} className="mb-6 last:mb-0">
                    {editingTask?.id === question.id ? (
                      <TaskEditor
                        task={question}
                        onSave={handleSave}
                        onCancel={handleCancel}
                      />
                    ) : (
                      <div className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full 
                                       flex items-center justify-center font-semibold">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="text-lg text-gray-900 mb-2">
                            {formatMathText(question.text)}
                          </div>
                          {question.answers && (
                            <div className="ml-4 space-y-2">
                              {Array.isArray(question.answers) && question.answers.map((answer, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{String.fromCharCode(65 + i)}.</span>
                                  <span>{formatMathText(answer)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {examConfig?.includeAnswers && (
                            <>
                              {question.answer && (
                                <div className="mt-4 pl-4 border-l-4 border-blue-500">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-1">
                                    {t('tasks.answer')}:
                                  </h4>
                                  <p className="text-gray-600">
                                    {formatMathText(question.answer)}
                                  </p>
                                </div>
                              )}
                              {question.correctAnswer && (
                                <div className="mt-4 pl-4 border-l-4 border-green-500">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-1">
                                    {t('exam.solution')}:
                                  </h4>
                                  <p className="text-gray-600">
                                    {formatMathText(question.correctAnswer)}
                                  </p>
                                  {question.explanation && (
                                    <p className="mt-2 text-sm text-gray-500">
                                      {formatMathText(question.explanation)}
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => handleEdit(question)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 