import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Download, Check } from 'lucide-react';
import { Button } from './common/Button';
import { downloadDocument, DocumentOptions } from '../services/documentGenerator';
import { Question } from '../types/exam';

interface SheetExportModalProps {
  onClose: () => void;
  tasks: Question[];
  sheetTitle?: string;
}

export const SheetExportModal: React.FC<SheetExportModalProps> = ({ 
  onClose, 
  tasks,
  sheetTitle = 'Task Sheet'
}) => {
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [options, setOptions] = useState<DocumentOptions>({
    includeSolutions: true,
    includeAnswers: true,
    includeAnswerSpaces: true,
    includeInstructions: true,
    includeContext: true,
    includeLearningOutcomes: true
  });
  const [exporting, setExporting] = useState(false);
  
  const handleExport = async () => {
    try {
      setExporting(true);
      await downloadDocument(tasks, format, options, sheetTitle);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md mx-auto w-full border border-gray-200 dark:border-gray-700"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Export Sheet</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('pdf')}
                className={`p-3 flex items-center justify-center rounded-lg border-2 transition-colors ${
                  format === 'pdf'
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/30'
                }`}
              >
                <span className={`text-sm font-medium ${
                  format === 'pdf'
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  PDF
                </span>
              </button>
              <button
                onClick={() => setFormat('docx')}
                className={`p-3 flex items-center justify-center rounded-lg border-2 transition-colors ${
                  format === 'docx'
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/30'
                }`}
              >
                <span className={`text-sm font-medium ${
                  format === 'docx'
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  Word
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeSolutions}
                  onChange={(e) => setOptions({ ...options, includeSolutions: e.target.checked })}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded
                           focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">Include solutions</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeAnswers}
                  onChange={(e) => setOptions({ ...options, includeAnswers: e.target.checked })}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded
                           focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">Include answers</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeAnswerSpaces}
                  onChange={(e) => setOptions({ ...options, includeAnswerSpaces: e.target.checked })}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded
                           focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">Include answer spaces</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeInstructions}
                  onChange={(e) => setOptions({ ...options, includeInstructions: e.target.checked })}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded
                           focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">Include instructions</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeContext}
                  onChange={(e) => setOptions({ ...options, includeContext: e.target.checked })}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded
                           focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">Include context</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeLearningOutcomes}
                  onChange={(e) => setOptions({ ...options, includeLearningOutcomes: e.target.checked })}
                  className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded
                           focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">Include learning outcomes</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 
                     rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg
                     hover:bg-blue-700 dark:hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}; 