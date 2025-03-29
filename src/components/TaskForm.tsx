import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/examStore';
import { generateTasks } from '../services/openai';
import type { TaskConfig, DifficultyDistribution } from '../types/exam';
import { Loader2, BookOpen, Settings2, CheckCircle2, ChevronDown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { PageLayout } from './common/PageLayout';

type TaskType = {
  value: string;
  label: string;
  subjects: string[]; 
};

const taskTypes: TaskType[] = [
  { value: 'Multiple Choice', label: 'Multiple Choice', subjects: ['all'] },
  { value: 'Problem Solving', label: 'Problem Solving', subjects: ['Mathematics', 'Physics', 'Chemistry', 'Computer Science'] },
  { value: 'Short Answer', label: 'Short Answer', subjects: ['all'] },
  { value: 'Essay', label: 'Essay', subjects: ['English', 'History', 'Philosophy', 'Psychology'] },
  { value: 'True/False', label: 'True/False', subjects: ['all'] },
  { value: 'Fill in the Blank', label: 'Fill in the Blank', subjects: ['all'] },
  { value: 'Matching', label: 'Matching', subjects: ['all'] },
  { value: 'Coding', label: 'Coding', subjects: ['Computer Science'] },
  { value: 'Debugging', label: 'Debugging', subjects: ['Computer Science'] },
  { value: 'Case Study', label: 'Case Study', subjects: ['Business', 'Psychology', 'Biology', 'History'] },
  { value: 'Diagram Analysis', label: 'Diagram Analysis', subjects: ['Biology', 'Physics', 'Geography', 'Art'] },
  { value: 'Data Analysis', label: 'Data Analysis', subjects: ['Mathematics', 'Economics', 'Psychology', 'Geography'] },
  { value: 'Theory', label: 'Theory', subjects: ['all'] },
  { value: 'Practical', label: 'Practical', subjects: ['Physics', 'Chemistry', 'Biology', 'Computer Science', 'Music', 'Art'] }
];

const subjects: Record<string, string[]> = {
  'Mathematics': ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry', 'Number Theory', 'Linear Algebra', 'Discrete Mathematics', 'Mathematical Logic', 'Real Analysis'],
  
  'Physics': ['Mechanics', 'Thermodynamics', 'Electricity', 'Optics', 'Quantum Physics', 'Nuclear Physics', 'Astrophysics', 'Fluid Dynamics', 'Relativity', 'Electromagnetism'],
  
  'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Biochemistry', 'Analytical Chemistry', 'Polymer Chemistry', 'Environmental Chemistry', 'Medicinal Chemistry', 'Nuclear Chemistry', 'Electrochemistry'],
  
  'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy', 'Evolution', 'Microbiology', 'Botany', 'Zoology', 'Molecular Biology', 'Physiology'],
  
  'Computer Science': [
    'Programming Fundamentals',
    'Data Structures',
    'Algorithms',
    'Database Systems',
    'Web Development',
    'Computer Networks',
    'Operating Systems',
    'Software Engineering',
    'Cybersecurity',
    'Artificial Intelligence',
    'Machine Learning',
    'Computer Architecture',
    'Cloud Computing',
    'Mobile Development',
    'Blockchain Technology'
  ],
  
  'English': ['Grammar', 'Literature', 'Writing', 'Comprehension', 'Vocabulary', 'Creative Writing', 'Business English', 'Academic Writing', 'Public Speaking', 'Literary Analysis'],
  
  'History': ['World History', 'Ancient Civilizations', 'Modern History', 'Cultural History', 'Military History', 'Economic History', 'Social History', 'Political History', 'Art History', 'Archaeological Studies'],
  
  'Geography': [
    'Physical Geography',
    'Human Geography',
    'Cartography',
    'Climate Studies',
    'Urban Geography',
    'Economic Geography',
    'Environmental Geography',
    'Population Studies',
    'Geographic Information Systems',
    'Regional Studies'
  ],
  
  'Economics': [
    'Microeconomics',
    'Macroeconomics',
    'International Economics',
    'Development Economics',
    'Financial Economics',
    'Labor Economics',
    'Public Economics',
    'Environmental Economics',
    'Behavioral Economics',
    'Economic History'
  ],
  
  'Psychology': [
    'Clinical Psychology',
    'Cognitive Psychology',
    'Developmental Psychology',
    'Social Psychology',
    'Behavioral Psychology',
    'Neuropsychology',
    'Educational Psychology',
    'Industrial Psychology',
    'Personality Psychology',
    'Research Methods'
  ],
  
  'Philosophy': [
    'Ethics',
    'Logic',
    'Metaphysics',
    'Epistemology',
    'Political Philosophy',
    'Philosophy of Science',
    'Philosophy of Mind',
    'Aesthetics',
    'Eastern Philosophy',
    'Contemporary Philosophy'
  ],
  
  'Art': [
    'Art History',
    'Drawing',
    'Painting',
    'Sculpture',
    'Digital Art',
    'Photography',
    'Graphic Design',
    'Art Theory',
    'Contemporary Art',
    'Visual Communication'
  ],
  
  'Music': [
    'Music Theory',
    'Music History',
    'Composition',
    'Performance',
    'Music Technology',
    'World Music',
    'Music Analysis',
    'Orchestration',
    'Music Education',
    'Sound Design'
  ]
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

const DifficultySlider = ({ 
  value, 
  onChange 
}: { 
  value: DifficultyDistribution;
  onChange: (distribution: DifficultyDistribution) => void;
}) => {
  const firstPoint = useMotionValue(value.easy);
  const secondPoint = useMotionValue(value.easy + value.medium);


  const easyPercentage = useTransform(firstPoint, (v: number) => Math.round(v));
  const mediumPercentage = useTransform<number[], number>(
    [firstPoint, secondPoint] as any, 
    (latest: number[]) => Math.round(latest[1] - latest[0])
  );
  const hardPercentage = useTransform(secondPoint, (v: number) => Math.round(100 - v));

  const updateDistribution = (first: number, second: number) => {
    const easy = Math.round(first);
    const medium = Math.round(second - first);
    const hard = Math.round(100 - second);
    onChange({ easy, medium, hard });
  };

  const handleDrag = (point: 'first' | 'second', event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget) return;
    
    const container = event.currentTarget.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.min(100, Math.max(0, (x / container.offsetWidth) * 100));

    if (point === 'first') {
      const newX = Math.max(0, Math.min(secondPoint.get() - 5, percentage));
      firstPoint.set(newX);
      updateDistribution(newX, secondPoint.get());
    } else {
      const newX = Math.max(firstPoint.get() + 5, Math.min(100, percentage));
      secondPoint.set(newX);
      updateDistribution(firstPoint.get(), newX);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    element.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    element.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="w-full space-y-6">
      <div className="relative h-2 bg-gray-700 rounded-full">
        <motion.div 
          className="absolute inset-0 bg-green-500 rounded-l-full" 
          style={{ width: useTransform(firstPoint, (v: number) => `${v}%`) }} 
        />
        <motion.div 
          className="absolute inset-0 bg-yellow-500" 
          style={{ 
            left: useTransform(firstPoint, (v: number) => `${v}%`),
            width: useTransform<number[], string>(
              [firstPoint, secondPoint] as any,
              (latest: number[]) => `${latest[1] - latest[0]}%`
            )
          }} 
        />
        <motion.div 
          className="absolute inset-0 bg-red-500 rounded-r-full" 
          style={{ 
            left: useTransform(secondPoint, (v: number) => `${v}%`),
            width: useTransform(secondPoint, (v: number) => `${100 - v}%`)
          }} 
        />
        
        <motion.div
          drag="x"
          dragMomentum={false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0}
          className="absolute w-4 h-4 bg-white rounded-full 
                     shadow-lg cursor-pointer border-2 border-gray-200 
                     hover:scale-110 transition-transform z-10"
          style={{ 
            left: useTransform(firstPoint, (v: number) => `${v}%`),
            top: '-6px'
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={(e) => {
            if (e.buttons === 1) {
              handleDrag('first', e);
            }
          }}
        />
        <motion.div
          drag="x"
          dragMomentum={false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0}
          className="absolute w-4 h-4 bg-white rounded-full 
                     shadow-lg cursor-pointer border-2 border-gray-200 
                     hover:scale-110 transition-transform z-10"
          style={{ 
            left: useTransform(secondPoint, (v: number) => `${v}%`),
            top: '-6px'
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={(e) => {
            if (e.buttons === 1) {
              handleDrag('second', e);
            }
          }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <div className="space-y-1 text-center">
          <div className="text-green-500 font-medium">
            {easyPercentage.get()}%
          </div>
          <div className="text-gray-400">easy</div>
        </div>
        <div className="space-y-1 text-center">
          <div className="text-yellow-500 font-medium">
            {mediumPercentage.get()}%
          </div>
          <div className="text-gray-400">medium</div>
        </div>
        <div className="space-y-1 text-center">
          <div className="text-red-500 font-medium">
            {hardPercentage.get()}%
          </div>
          <div className="text-gray-400">hard</div>
        </div>
      </div>
    </div>
  );
};

export const TaskForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { setTaskConfig, setQuestions } = useExamStore();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [difficultyDistribution, setDifficultyDistribution] = useState<DifficultyDistribution>({
    easy: 20,
    medium: 44,
    hard: 36
  });

  const handleTopicChange = (topic: string) => {
    setSelectedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topic)) {
        newSet.delete(topic);
      } else {
        newSet.add(topic);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const topics = customTopic 
      ? [...Array.from(selectedTopics), customTopic]
      : Array.from(selectedTopics);

    const config: TaskConfig = {
      type: formData.get('type') as string,
      difficulty: difficultyDistribution,
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
      <div className="w-full min-h-[calc(100vh-6rem)] flex items-center justify-center py-12 px-4">
        <div className="max-w-6xl w-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
              Generate Task Sheet
            </h1>
            <p className="text-lg text-gray-400">
              Configure your task generation settings
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-3xl shadow-2xl p-8 
                     border border-gray-800/50 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />

            <div className="relative">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl p-4 mb-6"
                  >
                    <div className="flex items-center gap-3 text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                      <h3 className="text-xl font-semibold text-gray-200 mb-6 flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-blue-400" />
                        Basic Settings
                      </h3>
                      
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Subject
                          </label>
                          <div className="relative">
                            <select
                              value={selectedSubject}
                              onChange={(e) => setSelectedSubject(e.target.value)}
                              className="w-full p-3 rounded-lg bg-gray-900/50 text-gray-200
                                       border border-gray-700/50 appearance-none
                                       focus:ring-2 focus:ring-blue-500/50 
                                       focus:border-blue-500/50
                                       transition-all duration-200"
                              required
                            >
                              <option value="">Select a subject</option>
                              {Object.keys(subjects).map(subject => (
                                <option key={subject} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Task Type
                          </label>
                          <div className="relative">
                            <select
                              name="type"
                              className="w-full p-3 rounded-lg bg-gray-900/50 text-gray-200
                                       border border-gray-700/50 appearance-none
                                       focus:ring-2 focus:ring-blue-500/50 
                                       focus:border-blue-500/50
                                       transition-all duration-200"
                              required
                            >
                              <option value="">Select task type</option>
                              {taskTypes
                                .filter(type => type.subjects.includes('all') || type.subjects.includes(selectedSubject))
                                .map(type => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Number of Tasks
                          </label>
                          <input
                            type="number"
                            name="count"
                            min="1"
                            max="20"
                            defaultValue="5"
                            className="w-full p-3 rounded-lg bg-gray-900/50 text-gray-200
                                     border border-gray-700/50
                                     focus:ring-2 focus:ring-blue-500/50 
                                     focus:border-blue-500/50
                                     transition-all duration-200"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                      <h3 className="text-xl font-semibold text-gray-200 mb-6">Difficulty Distribution</h3>
                      <DifficultySlider 
                        value={difficultyDistribution} 
                        onChange={setDifficultyDistribution} 
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    {selectedSubject ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 h-full"
                      >
                        <h3 className="text-xl font-semibold text-gray-200 mb-6 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-blue-400" />
                          Topics Selection
                        </h3>

                        <div className="space-y-6">
                          <div className="bg-gray-900/30 rounded-xl border border-gray-700/50 p-4 max-h-[400px] overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {subjects[selectedSubject].map(topic => (
                                <label
                                  key={topic}
                                  className="relative flex items-center p-3 rounded-lg 
                                           border border-gray-700/50 cursor-pointer
                                           bg-gray-900/30
                                           hover:bg-gray-800/50 hover:border-blue-500/50 
                                           transition-all duration-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedTopics.has(topic)}
                                    onChange={() => handleTopicChange(topic)}
                                    className="w-5 h-5 rounded border-gray-600 text-blue-500 
                                             focus:ring-2 focus:ring-blue-500/50 
                                             bg-gray-700"
                                  />
                                  <span className="ml-3 text-gray-300">{topic}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Custom Topic (Optional)
                            </label>
                            <input
                              type="text"
                              value={customTopic}
                              onChange={(e) => setCustomTopic(e.target.value)}
                              placeholder="Enter your custom topic"
                              className="w-full p-3 rounded-lg bg-gray-900/50 text-gray-200
                                       border border-gray-700/50
                                       focus:ring-2 focus:ring-blue-500/50 
                                       focus:border-blue-500/50
                                       transition-all duration-200
                                       placeholder-gray-500"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg">Select a subject to view available topics</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="pt-6"
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full p-4 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600
                             text-white font-semibold text-lg
                             hover:from-blue-700 hover:via-purple-700 hover:to-pink-700
                             focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200
                             backdrop-blur-sm
                             flex items-center justify-center gap-3
                             shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)]
                             hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.7)]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Generating Tasks...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-6 h-6" />
                        Generate Tasks
                      </>
                    )}
                  </button>
                </motion.div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
};

export default TaskForm;