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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate('/generate-exam')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Exam Types
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <div className="flex items-center gap-4 mb-8 pb-6 border-b">
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Generate {type?.toUpperCase()} Exam
              </h1>
              <p className="text-gray-600 mt-1">
                Customize your exam settings below
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sections
              </label>
              <div className="grid grid-cols-2 gap-4">
                {getExamSections(type).map((section) => (
                  <label key={section} className="relative flex items-center p-4 rounded-xl border-2 cursor-pointer
                                               hover:border-blue-500 transition-colors">
                    <input
                      type="checkbox"
                      name="sections"
                      value={section}
                      className="peer sr-only"
                    />
                    <div className="peer-checked:border-blue-500 peer-checked:bg-blue-50 absolute inset-0 rounded-xl border-2 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 mr-3 opacity-0 peer-checked:opacity-100" />
                      <span className="text-gray-700 peer-checked:text-blue-600">{section}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Topics
              </label>
              <div className="grid grid-cols-2 gap-4">
                {getExamTopics(type).map((topic) => (
                  <label key={topic} className="relative flex items-center p-4 rounded-xl border-2 cursor-pointer
                                             hover:border-blue-500 transition-colors">
                    <input
                      type="checkbox"
                      name="topics"
                      value={topic}
                      className="peer sr-only"
                    />
                    <div className="peer-checked:border-blue-500 peer-checked:bg-blue-50 absolute inset-0 rounded-xl border-2 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 mr-3 opacity-0 peer-checked:opacity-100" />
                      <span className="text-gray-700 peer-checked:text-blue-600">{topic}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Difficulty Distribution
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('beginner')}
                  className={`p-4 rounded-lg border-2 text-left ${
                    selectedDifficulty === 'beginner'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium mb-1">Beginner</div>
                  <div className="text-sm text-gray-600">
                    Easy: 60% / Medium: 30% / Hard: 10%
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('balanced')}
                  className={`p-4 rounded-lg border-2 text-left ${
                    selectedDifficulty === 'balanced'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium mb-1">Balanced</div>
                  <div className="text-sm text-gray-600">
                    Easy: 30% / Medium: 40% / Hard: 30%
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('advanced')}
                  className={`p-4 rounded-lg border-2 text-left ${
                    selectedDifficulty === 'advanced'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium mb-1">Advanced</div>
                  <div className="text-sm text-gray-600">
                    Easy: 10% / Medium: 40% / Hard: 50%
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="includeAnswers"
                  value="true"
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Include answers and explanations</span>
              </label>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl
                         font-semibold hover:bg-blue-700 transition-all duration-200 transform hover:scale-105
                         shadow-lg hover:shadow-xl disabled:bg-blue-400 disabled:cursor-not-allowed
                         disabled:transform-none min-w-[180px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Settings2 className="h-5 w-5 mr-2" />
                    Generate Exam
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
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