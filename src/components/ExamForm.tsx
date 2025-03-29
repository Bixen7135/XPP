import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/examStore';
import { generateExamQuestions } from '../services/openai';
import type { ExamConfig } from '../types/exam';
import { Loader2, GraduationCap, Settings2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { PageLayout } from './common/PageLayout';
import { motion } from 'framer-motion';

const difficultyDistribution = {
  balanced: { easy: 30, medium: 40, hard: 30 },
  beginner: { easy: 60, medium: 30, hard: 10 },
  advanced: { easy: 10, medium: 40, hard: 50 }
};

const ExamForm = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { setExamConfig, setQuestions } = useExamStore();
  const [selectedDifficulty, setSelectedDifficulty] = useState('balanced');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const config: ExamConfig = {
      type: type?.toUpperCase() as ExamConfig['type'],
      sections: formData.getAll('sections') as string[],
      topics: formData.getAll('topics') as string[],
      difficultyDistribution: difficultyDistribution[selectedDifficulty as keyof typeof difficultyDistribution],
      includeAnswers: formData.get('includeAnswers') === 'true'
    };

    try {
      setLoading(true);
      const questions = await generateExamQuestions(config);
      setExamConfig(config);
      setQuestions(questions);
      navigate('/exam-preview');
    } catch (error) {
      console.error('Error generating exam:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout maxWidth="xl">
      <div className="w-full">
        <div className="max-w-4xl mx-auto">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/generate-exam')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Exam Types
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Generate {type?.toUpperCase()} Exam
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Customize your exam settings below
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm dark:shadow-gray-900/50 p-6 border border-gray-200/50 dark:border-gray-700/50"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sections
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {getExamSections(type).map((section) => (
                    <label
                      key={section}
                      className="relative flex items-start p-3 rounded-xl border border-gray-200 dark:border-gray-700
                               bg-white dark:bg-gray-900 cursor-pointer
                               hover:bg-gray-50 dark:hover:bg-gray-800
                               transition-colors duration-150"
                    >
                      <input
                        type="checkbox"
                        name="sections"
                        value={section}
                        className="h-4 w-4 mt-1 rounded border-gray-300 dark:border-gray-600
                                 text-blue-600 dark:text-blue-400
                                 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <span className="ml-3 text-sm text-gray-900 dark:text-gray-300">
                        {section}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Topics
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {getExamTopics(type).map((topic) => (
                    <label
                      key={topic}
                      className="relative flex items-start p-3 rounded-xl border border-gray-200 dark:border-gray-700
                               bg-white dark:bg-gray-900 cursor-pointer
                               hover:bg-gray-50 dark:hover:bg-gray-800
                               transition-colors duration-150"
                    >
                      <input
                        type="checkbox"
                        name="topics"
                        value={topic}
                        className="h-4 w-4 mt-1 rounded border-gray-300 dark:border-gray-600
                                 text-blue-600 dark:text-blue-400
                                 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <span className="ml-3 text-sm text-gray-900 dark:text-gray-300">
                        {topic}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty Distribution
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedDifficulty('beginner')}
                    className={`p-4 rounded-xl border text-left transition-colors duration-150
                              ${selectedDifficulty === 'beginner'
                                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }
                              bg-white dark:bg-gray-900`}
                  >
                    <div className="font-medium mb-1 text-gray-900 dark:text-white">Beginner</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Easy: 60% / Medium: 30% / Hard: 10%
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDifficulty('balanced')}
                    className={`p-4 rounded-xl border text-left transition-colors duration-150
                              ${selectedDifficulty === 'balanced'
                                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }
                              bg-white dark:bg-gray-900`}
                  >
                    <div className="font-medium mb-1 text-gray-900 dark:text-white">Balanced</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Easy: 30% / Medium: 40% / Hard: 30%
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDifficulty('advanced')}
                    className={`p-4 rounded-xl border text-left transition-colors duration-150
                              ${selectedDifficulty === 'advanced'
                                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }
                              bg-white dark:bg-gray-900`}
                  >
                    <div className="font-medium mb-1 text-gray-900 dark:text-white">Advanced</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Easy: 10% / Medium: 40% / Hard: 50%
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="includeAnswers"
                    value="true"
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 
                             text-blue-600 dark:text-blue-400 
                             focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Include answers and explanations</span>
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 rounded-xl
                           bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600
                           text-white font-medium
                           focus:outline-none focus:ring-2 focus:ring-offset-2 
                           focus:ring-blue-500 dark:focus:ring-blue-400
                           transition-colors duration-150
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Settings2 className="w-5 h-5 mr-2" />
                      Generate Exam
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ExamForm;

function getExamSections(type: string | undefined): string[] {
  switch (type?.toUpperCase()) {
    case 'IELTS':
      return ['Reading', 'Writing', 'Listening', 'Speaking'];
    case 'SAT':
      return ['Math', 'Reading', 'Writing', 'Essay'];
    case 'CIE':
      return ['Biology', 'Chemistry', 'Physics', 'Mathematics'];
    case 'UNT':
      return [
        'History of Kazakhstan',
        'Mathematical Literacy',
        'Reading Literacy',
        'Computer Science',
        'Geography',
        'Foreign Language',
        'World History',
        'Fundamentals of Law',
        'Kazakh Language',
        'Russian Language',
        'Kazakh Literature',
        'Russian Literature',
        'Creative Exam'
      ];
    default:
      return [];
  }
}

function getExamTopics(type: string | undefined): string[] {
  switch (type?.toUpperCase()) {
    case 'IELTS':
      return ['Academic', 'General Training', 'Grammar', 'Vocabulary'];
    case 'SAT':
      return ['Algebra', 'Geometry', 'Literature', 'Grammar', 'Composition'];
    case 'CIE':
      return ['Mechanics', 'Thermodynamics', 'Organic Chemistry', 'Calculus'];
    case 'UNT':
      return [
        'Core Subjects',
        'Profile Subjects',
        'Language Skills',
        'Analytical Skills',
        'Historical Knowledge',
        'Mathematical Skills'
      ];
    default:
      return [];
  }
}