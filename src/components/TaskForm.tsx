import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/examStore';
import { generateTasks } from '../services/openai';
import type { TaskConfig } from '../types/exam';
import { Loader2, BookOpen, Settings2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageLayout } from './common/PageLayout';

const subjects: Record<string, string[]> = {
  'Mathematics': ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry'],
  'Physics': ['Mechanics', 'Thermodynamics', 'Electricity', 'Optics', 'Quantum Physics'],
  'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Biochemistry'],
  'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy', 'Evolution'],
  'English': ['Grammar', 'Literature', 'Writing', 'Comprehension', 'Vocabulary'],
  'History': ['World History', 'Ancient Civilizations', 'Modern History', 'Cultural History']
};

function validateConfig(config: TaskConfig): string | null {
  if (config.topics.length === 0) {
    return 'Please select at least one topic';
  }
  if (config.count < 1 || config.count > 20) {
    return 'Number of tasks must be between 1 and 20';
  }
  return null;
}

export const TaskForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { setTaskConfig, setQuestions } = useExamStore();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const topics = customTopic 
      ? [...formData.getAll('topics') as string[], customTopic]
      : formData.getAll('topics') as string[];

    const config: TaskConfig = {
      type: formData.get('type') as string,
      difficulty: formData.get('difficulty') as TaskConfig['difficulty'],
      topics,
      count: Number(formData.get('count')),
      subject: selectedSubject
    };

    const validationError = validateConfig(config);
    if (validationError) {
      setError(validationError);
      return;
    }

    setTaskConfig(config);
    
    try {
      setError(null);
      setLoading(true);
      const questions = await generateTasks(config);
      setQuestions(questions);
      navigate('/task-preview');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate tasks';
      setError(message);
      console.error('Error generating tasks:', error);
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <div className="flex items-center gap-4 mb-8 pb-6 border-b">
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Generate Task Sheet
              </h1>
              <p className="text-gray-600 mt-1">
                Create custom practice tasks for your students
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Subject
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.keys(subjects).map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setSelectedSubject(subject)}
                    className={`p-4 rounded-xl border-2 text-left ${
                      selectedSubject === subject
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{subject}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedSubject && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Topics
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {subjects[selectedSubject].map((topic) => (
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

                <div className="bg-gray-50 rounded-xl p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Custom Topic (Optional)
                  </label>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Enter a custom topic"
                    className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 
                             focus:ring-blue-500 bg-white"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Task Type
                </label>
                <select
                  name="type"
                  className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 
                           focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">Select type</option>
                  <option value="Multiple Choice">Multiple Choice</option>
                  <option value="Problem Solving">Problem Solving</option>
                  <option value="Short Answer">Short Answer</option>
                  <option value="Essay">Essay</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Difficulty Level
                </label>
                <select
                  name="difficulty"
                  className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 
                           focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">Select difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Number of Tasks
              </label>
              <input
                type="number"
                name="count"
                min="1"
                max="20"
                defaultValue="5"
                className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 
                         focus:ring-blue-500 bg-white"
                required
              />
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={loading || !selectedSubject}
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
                    Generate Tasks
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

export default TaskForm;