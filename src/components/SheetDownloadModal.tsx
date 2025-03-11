import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Download, Check } from 'lucide-react';
import { Button } from './common/Button';
import { downloadDocument, DocumentOptions } from '../services/documentGenerator';
import { Question } from '../types/exam';

interface SheetDownloadModalProps {
  onClose: () => void;
  tasks: Question[];
  sheetTitle?: string;
}

export const SheetDownloadModal: React.FC<SheetDownloadModalProps> = ({ 
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
  const [downloading, setDownloading] = useState(false);
  
  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadDocument(tasks, format, options, sheetTitle);
      onClose();
    } catch (error) {
      console.error('Download error:', error);
      // Handle error
    } finally {
      setDownloading(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md"
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Download Sheet</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Format</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 border rounded-lg flex flex-col items-center ${
                  format === 'pdf' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <FileText className={`w-8 h-8 mb-2 ${format === 'pdf' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={format === 'pdf' ? 'text-blue-600 font-medium' : 'text-gray-600'}>PDF</span>
              </button>
              <button
                onClick={() => setFormat('docx')}
                className={`p-4 border rounded-lg flex flex-col items-center ${
                  format === 'docx' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <FileText className={`w-8 h-8 mb-2 ${format === 'docx' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={format === 'docx' ? 'text-blue-600 font-medium' : 'text-gray-600'}>DOCX</span>
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Content Options</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-gray-600">Include Solutions</label>
                <button
                  onClick={() => setOptions({...options, includeSolutions: !options.includeSolutions})}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    options.includeSolutions ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                    options.includeSolutions ? 'translate-x-5' : 'translate-x-1'
                  }`}></span>
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-gray-600">Include Answers</label>
                <button
                  onClick={() => setOptions({...options, includeAnswers: !options.includeAnswers})}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    options.includeAnswers ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
                    options.includeAnswers ? 'translate-x-5' : 'translate-x-1'
                  }`}></span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Task Summary</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p><span className="font-medium">Tasks:</span> {tasks.length}</p>
              <p><span className="font-medium">Types:</span> {Array.from(new Set(tasks.map(t => t.type))).join(', ')}</p>
              <p><span className="font-medium">Title:</span> {sheetTitle}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t">
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownload}
              isLoading={downloading}
            >
              Download
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 