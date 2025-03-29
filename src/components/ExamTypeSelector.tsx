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
  color: ColorVariant;
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
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
};

const iconColorVariants: Record<ColorVariant, string> = {
  blue: 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-blue-200/50 dark:border-blue-700/50 hover:bg-blue-100/80 dark:hover:bg-blue-800/40 group-hover:bg-blue-100/80 dark:group-hover:bg-blue-800/40',
  purple: 'bg-purple-50/80 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border-purple-200/50 dark:border-purple-700/50 hover:bg-purple-100/80 dark:hover:bg-purple-800/40 group-hover:bg-purple-100/80 dark:group-hover:bg-purple-800/40',
  green: 'bg-green-50/80 dark:bg-green-900/30 text-green-600 dark:text-green-300 border-green-200/50 dark:border-green-700/50 hover:bg-green-100/80 dark:hover:bg-green-800/40 group-hover:bg-green-100/80 dark:group-hover:bg-green-800/40',
  orange: 'bg-orange-50/80 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 border-orange-200/50 dark:border-orange-700/50 hover:bg-orange-100/80 dark:hover:bg-orange-800/40 group-hover:bg-orange-100/80 dark:group-hover:bg-orange-800/40'
};

const titleColorVariants: Record<ColorVariant, string> = {
  blue: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
  purple: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
  green: 'group-hover:text-green-600 dark:group-hover:text-green-400',
  orange: 'group-hover:text-orange-600 dark:group-hover:text-orange-400'
};

const arrowColorVariants: Record<ColorVariant, string> = {
  blue: 'group-hover:text-blue-500 dark:group-hover:text-blue-400',
  purple: 'group-hover:text-purple-500 dark:group-hover:text-purple-400',
  green: 'group-hover:text-green-500 dark:group-hover:text-green-400',
  orange: 'group-hover:text-orange-500 dark:group-hover:text-orange-400'
};

export const ExamTypeSelector = () => {
  const navigate = useNavigate();

  const handleExamSelect = (type: ExamType) => {
    navigate(`/generate-exam/${type.toLowerCase()}`);
  };

  return (
    <PageLayout maxWidth="xl">
      <div className="w-full">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Choose Exam Type
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Select the type of exam you want to generate
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  className="w-full text-left p-5 h-[200px]
                           bg-white/5 dark:bg-gray-800/50
                           backdrop-blur-sm
                           rounded-2xl
                           shadow-lg dark:shadow-gray-900/30
                           hover:shadow-xl dark:hover:shadow-gray-900/40
                           transition-all duration-300 
                           border border-gray-200/20 dark:border-gray-700/50
                           relative overflow-hidden
                           hover:bg-white/10 dark:hover:bg-gray-800/70
                           hover:-translate-y-1
                           after:absolute after:inset-0 after:bg-gradient-to-b after:from-transparent after:to-black/5 dark:after:to-white/5 after:opacity-0 hover:after:opacity-100 after:transition-opacity"
                >
                  <div className="relative flex items-start gap-4 h-full">
                    <div className={`p-3 rounded-xl ${iconColorVariants[exam.color]} 
                                 transform transition-all duration-300 
                                 group-hover:scale-110 group-hover:rotate-3
                                 shadow-lg backdrop-blur-sm
                                 flex-shrink-0`}>
                      {exam.icon}
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                      <h3 className={`text-xl font-semibold text-gray-900 dark:text-white mb-2 
                                 ${titleColorVariants[exam.color]}
                                 transition-colors duration-300`}>
                        {exam.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4
                                transition-colors duration-300 
                                group-hover:text-gray-700 dark:group-hover:text-gray-300">
                        {exam.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {exam.subjects.map((subject) => (
                          <span
                            key={subject}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium
                                     ${colorVariants[exam.color]}`}
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className={`w-5 h-5 text-gray-400 dark:text-gray-500 
                                       ${arrowColorVariants[exam.color]}
                                       transform transition-all duration-300 
                                       group-hover:translate-x-1
                                       flex-shrink-0`} />
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};