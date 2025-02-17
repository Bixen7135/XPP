import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import type { Question } from '../types/exam';

interface LocationState {
  questions: Question[];
}

interface TaskResult {
  totalQuestions: number;
  correctAnswers: number;
  timeTaken: number;
  accuracy: number;
  questionResults: {
    questionId: string;
    isCorrect: boolean;
    timeTaken: number;
    userAnswer: string;
    expectedAnswer: string;
    solution: string;
    isNumericallyEqual: boolean;
  }[];
}

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

const normalizeAnswer = (answer: string): string => {
  // Remove spaces and convert to lowercase
  return answer.replace(/\s+/g, '').toLowerCase()
    // Convert fractions to decimals (e.g., "3/4" -> "0.75")
    .replace(/(\d+)\/(\d+)/g, (_, num, den) => (Number(num) / Number(den)).toString())
    // Remove unnecessary decimal zeros
    .replace(/\.?0+$/, '');
};

const checkMathAnswer = (userAnswer: string, correctAnswer: string): boolean => {
  if (!userAnswer || !correctAnswer) return false;
  
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  // Check exact match first
  if (normalizedUser === normalizedCorrect) return true;

  // Try numerical comparison for numeric answers
  const userNum = Number(normalizedUser);
  const correctNum = Number(normalizedCorrect);
  
  if (!isNaN(userNum) && !isNaN(correctNum)) {
    // Allow for small floating-point differences
    return Math.abs(userNum - correctNum) < 0.0001;
  }

  return false;
};

export const TaskCompletion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions } = location.state as LocationState;
  
  const [showTimerModal, setShowTimerModal] = useState(true);
  const [selectedTime, setSelectedTime] = useState(30); // Default 30 minutes
  const [timeLeft, setTimeLeft] = useState(0); // Initialize to 0
  const [isActive, setIsActive] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<TaskResult | null>(null);
  const startTime = useRef(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer presets in minutes
  const timePresets = [5, 10, 15, 30, 45, 60];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsActive(false);
            handleTimeUp();
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleTimeUp = () => {
    handleComplete();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    setShowTimerModal(false);
    setTimeLeft(selectedTime * 60);
    setIsActive(true);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const progress = (Object.keys(answers).length / questions.length) * 100;

  const handleComplete = async () => {
    setIsSubmitting(true);
    const timeTaken = Math.floor((Date.now() - startTime.current) / 1000);
    
    const questionResults = questions.map(question => {
      const userAnswer = answers[question.id] || '';
      const expectedAnswer = question.answer || '';
      const isCorrect = checkMathAnswer(userAnswer, expectedAnswer);
      
      return {
        questionId: question.id,
        isCorrect,
        timeTaken,
        userAnswer,
        expectedAnswer,
        solution: question.correctAnswer || '',
        isNumericallyEqual: !isNaN(Number(normalizeAnswer(userAnswer))) && 
                           !isNaN(Number(normalizeAnswer(expectedAnswer))) &&
                           checkMathAnswer(userAnswer, expectedAnswer)
      };
    });

    const correctCount = questionResults.filter(r => r.isCorrect).length;
    
    const results: TaskResult = {
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      timeTaken,
      accuracy: (correctCount / questions.length) * 100,
      questionResults
    };

    setResults(results);
    setShowResults(true);
    setIsActive(false);
    setIsSubmitting(false);
  };

  const handleBack = () => {
    navigate('/task-preview');
  };

  const ResultsModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold mb-6">Task Results</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="text-sm text-blue-600">Accuracy</div>
            <div className="text-2xl font-bold text-blue-700">
              {results?.accuracy.toFixed(1)}%
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl">
            <div className="text-sm text-green-600">Time Taken</div>
            <div className="text-2xl font-bold text-green-700">
              {formatTime(results?.timeTaken || 0)}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl">
            <div className="text-sm text-purple-600">Correct Answers</div>
            <div className="text-2xl font-bold text-purple-700">
              {results?.correctAnswers} / {results?.totalQuestions}
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl">
            <div className="text-sm text-orange-600">Questions Answered</div>
            <div className="text-2xl font-bold text-orange-700">
              {Object.keys(answers).length} / {questions.length}
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {questions.map((question, index) => (
            <div key={question.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Question {index + 1}:</span>
                {results?.questionResults[index].isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="text-gray-600 mb-4">{formatMathText(question.text)}</div>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="font-medium">Your Answer:</span>
                  <div className="text-gray-600 mt-1">
                    {formatMathText(answers[question.id] || 'No answer')}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Correct Answer:</span>
                  <div className="text-gray-600 mt-1">
                    {formatMathText(question.answer || '')}
                  </div>
                </div>
                {results?.questionResults[index].isNumericallyEqual && 
                 !results.questionResults[index].isCorrect && (
                  <div className="text-orange-600">
                    Note: Your answer is numerically equivalent but written differently.
                  </div>
                )}
                {!results?.questionResults[index].isCorrect && (
                  <div className="mt-2 pt-4 border-t">
                    <span className="font-medium">Solution Approach:</span>
                    <div className="text-gray-600 mt-1">
                      {formatMathText(question.correctAnswer || '')}
                    </div>
                    {question.explanation && (
                      <div className="mt-2 text-gray-500">
                        <span className="font-medium">Explanation:</span>
                        <div className="mt-1">
                          {formatMathText(question.explanation)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={() => navigate('/task-preview')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Back to Tasks
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Timer Modal */}
      <AnimatePresence>
        {showTimerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Select Time Limit</h2>
                <button
                  onClick={handleBack}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full
                           hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-6">
                {timePresets.map(time => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-3 rounded-xl border-2 ${
                      selectedTime === time 
                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {time} min
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Time (minutes)
                </label>
                <input
                  type="number"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(Number(e.target.value))}
                  className="w-full p-3 border rounded-xl"
                  min="1"
                  max="180"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 text-gray-600 rounded-xl font-semibold 
                           hover:bg-gray-100 transition-colors border-2 border-gray-200"
                >
                  Back to Tasks
                </button>
                <button
                  onClick={handleStartTimer}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold
                           hover:bg-blue-700 transition-colors"
                >
                  Start Timer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showResults && <ResultsModal />}

      {/* Task Completion Interface */}
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 sticky top-4 z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Exit
            </button>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Progress: {Math.round(progress)}%
              </div>
              <div className={`font-mono text-lg ${
                timeLeft < 300 ? 'text-red-600' : 'text-blue-600'
              }`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-gray-200 rounded-full mt-4">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 
                               rounded-full flex items-center justify-center font-semibold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="text-lg text-gray-900 mb-4">
                    {formatMathText(question.text)}
                  </div>
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Enter your answer here..."
                    className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 
                             focus:border-blue-500 min-h-[100px]"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Complete Button */}
        <div className="fixed bottom-8 right-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleComplete}
            disabled={isSubmitting || !isActive}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl
                     font-semibold shadow-lg hover:shadow-xl hover:bg-green-700 
                     transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-5 h-5" />
            {isSubmitting ? 'Checking...' : 'Complete Task'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}; 