import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Calculator, Languages, BookOpen, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageLayout } from './common/PageLayout';
import type { ExamType } from '../types/exam';

// Define a union type for valid colors
type ColorVariant = 'blue' | 'purple' | 'green' | 'orange';

interface ExamTypeInfo {
  type: ExamType;
  title: string;
  description: string;
  icon: React.ReactNode;
  subjects: string[];
  color: ColorVariant; // Use the defined union type here
}

const examTypes: ExamTypeInfo[] = [
  {
    type: 'CIE',
    title: 'Cambridge International',
    description: 'Comprehensive assessment following Cambridge standards',
    icon: <GraduationCap className="w-8 h-8" />,
    subjects: ['Biology', 'Chemistry', 'Physics', 'Mathematics'],
    color: 'blue'
  },
  {
    type: 'SAT',
    title: 'SAT Preparation',
    description: 'College Board standardized test preparation',
    icon: <Calculator className="w-8 h-8" />,
    subjects: ['Math', 'Reading', 'Writing', 'Essay'],
    color: 'purple'
  },
  {
    type: 'IELTS',
    title: 'IELTS Practice',
    description: 'International English Language Testing System',
    icon: <Languages className="w-8 h-8" />,
    subjects: ['Reading', 'Writing', 'Listening', 'Speaking'],
    color: 'green'
  },
  {
    type: 'UNT',
    title: 'UNT Preparation',
    description: 'Unified National Testing preparation materials',
    icon: <BookOpen className="w-8 h-8" />,
    subjects: ['Mathematics', 'History', 'Languages', 'Science'],
    color: 'orange'
  }
];

const colorVariants: Record<ColorVariant, string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 group-hover:bg-blue-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 group-hover:bg-purple-100',
  green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100 group-hover:bg-green-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 group-hover:bg-orange-100'
};

export const ExamTypeSelector = () => {
  const navigate = useNavigate();

  const handleExamSelect = (type: ExamType) => {
    navigate(`/generate-exam/${type.toLowerCase()}`);
  };

  return (
    <PageLayout maxWidth="xl">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Exam Type
          </h1>
          <p className="text-lg text-gray-600">
            Select the type of exam you want to generate
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {examTypes.map((exam, index) => (
            <motion.div
              key={exam.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <button
                onClick={() => handleExamSelect(exam.type)}
                className="w-full text-left p-6 bg-white rounded-xl shadow-sm hover:shadow-md
                         transition-all duration-200 border border-gray-100 relative overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${colorVariants[exam.color]}`}>
                    {exam.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {exam.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {exam.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {exam.subjects.map((subject) => (
                        <span
                          key={subject}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                                   text-sm font-medium ${colorVariants[exam.color]}`}
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600
                                     transition-colors duration-200" />
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};