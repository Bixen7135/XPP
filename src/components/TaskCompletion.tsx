import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import type { Question } from '../types/exam';
import { checkAnswerWithAI } from '../services/answerChecker';

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
    feedback: string;
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
  if (!answer) return '';
  
  return answer
    .toLowerCase()
    
    .replace(/\s+/g, '')
    
    .replace(/[.,;?!'"-](?!\d)/g, '')
    
    .replace(/[×⋅]/g, '*')
    .replace(/÷/g, '/')
    
    .replace(/[eE][-+]?\d+/g, match => match.toLowerCase())
   
    .replace(/(\d+)\/(\d+)/g, (_, num, den) => (Number(num) / Number(den)).toString())
    
    .replace(/\s*(y|z|a|f|p|n|µ|u|m|c|d|da|h|k|M|G|T|P|E)?(m|g|l|L|s|mol|Hz|W|V|Ω|Pa|N|J|cd|lm|lx|Bq|Gy|Sv|kat|B)\b/g, '')
    
    .replace(/^(true|yes|correct|t|y)$/, 'true')
    .replace(/^(false|no|incorrect|f|n)$/, 'false');
};

const isNumericallyEqual = (answer1: string, answer2: string): boolean => {
  
  const extractNumber = (str: string) => {
    
    str = str.replace(/\s+/g, '').replace(/%$/, '/100');
    
    
    const match = str.match(/-?\d*\.?\d+(?:\/\d+)?(?:[eE][-+]?\d+)?/);
    if (!match) return NaN;
    
    
    const num = match[0].includes('/') 
      ? eval(match[0])  
      : Number(match[0]);
      
    return num;
  };

  const num1 = extractNumber(answer1);
  const num2 = extractNumber(answer2);
  
  if (!isNaN(num1) && !isNaN(num2)) {
    
    const relativeError = Math.abs((num1 - num2) / num2);
    const absoluteError = Math.abs(num1 - num2);
    
    return (
      relativeError < 0.005 || 
      absoluteError < 0.05 || 
      Math.round(num1 * 100) === Math.round(num2 * 100) 
    );
  }
  return false;
};

const areAnswersEquivalent = (userAnswer: string, correctAnswer: string, type: string): boolean => {
  
  if (type === 'Essay' || type === 'Short Answer') {
    try {
      const criteria = JSON.parse(correctAnswer);
      const wordCount = userAnswer.trim().split(/\s+/).length;
      
      
      if (wordCount < criteria.minWordCount || wordCount > criteria.maxWordCount) {
        console.log(`Word count (${wordCount}) outside required range (${criteria.minWordCount}-${criteria.maxWordCount})`);
      }

      
      criteria.requiredPoints.forEach((point: { point: string; weight: number }) => {
        console.log(`Check for: ${point.point} (${point.weight}%)`);
      });

      return true; 
    } catch (e) {
      console.error('Error parsing answer criteria:', e);
      return true;
    }
  }

  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

 
  if (normalizedUser === normalizedCorrect) return true;

  
  switch (type) {
    case 'Multiple Choice':
      
      return normalizedUser === normalizedCorrect;

    case 'True/False':
      
      return (
        normalizedUser === normalizedCorrect ||
        (normalizedUser === 'true' && normalizedCorrect === 't') ||
        (normalizedUser === 'false' && normalizedCorrect === 'f')
      );

    case 'Fill in the Blank':
    case 'Short Answer':
      
      if (isNumericallyEqual(normalizedUser, normalizedCorrect)) return true;
      
    
      const similarity = calculateStringSimilarity(normalizedUser, normalizedCorrect);
      return similarity > 0.85; 

    case 'Problem Solving':
      
      return isNumericallyEqual(normalizedUser, normalizedCorrect);

    default:
      return normalizedUser === normalizedCorrect;
  }
};


const calculateStringSimilarity = (str1: string, str2: string): number => {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = track[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
};


const checkAnswer = async (userAnswer: string, question: Question): Promise<boolean> => {
  if (!question.answer) return false;

 
  if (question.type === 'Multiple Choice' || question.type === 'True/False') {
    return areAnswersEquivalent(userAnswer, question.answer, question.type);
  }

  
  const result = await checkAnswerWithAI(
    userAnswer,
    question.answer,
    question.type,
    question.text
  );

  
  question.explanation = result.feedback;
  
  return result.isCorrect;
};

export const TaskCompletion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions } = location.state as LocationState;
  
  const [showTimerModal, setShowTimerModal] = useState(true);
  const [selectedTime, setSelectedTime] = useState(30); 
  const [timeLeft, setTimeLeft] = useState(0); 
  const [isActive, setIsActive] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<TaskResult | null>(null);
  const startTime = useRef(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  
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
    
    const questionResults = await Promise.all(questions.map(async question => {
      const userAnswer = answers[question.id] || '';
      const expectedAnswer = question.answer || '';
      const isCorrect = await checkAnswer(userAnswer, question);
      
      return {
        questionId: question.id,
        isCorrect,
        timeTaken,
        userAnswer,
        expectedAnswer,
        solution: question.correctAnswer || '',
        feedback: question.explanation || '',
        isNumericallyEqual: isCorrect
      };
    }));

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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700"
      >
        <h2 className="text-2xl font-bold mb-6 text-white">Task Results</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-500/20">
            <div className="text-sm text-blue-400">Accuracy</div>
            <div className="text-2xl font-bold text-blue-300">
              {results?.accuracy.toFixed(1)}%
            </div>
          </div>
          <div className="bg-green-900/30 p-4 rounded-xl border border-green-500/20">
            <div className="text-sm text-green-400">Time Taken</div>
            <div className="text-2xl font-bold text-green-300">
              {formatTime(results?.timeTaken || 0)}
            </div>
          </div>
          <div className="bg-purple-900/30 p-4 rounded-xl border border-purple-500/20">
            <div className="text-sm text-purple-400">Correct Answers</div>
            <div className="text-2xl font-bold text-purple-300">
              {results?.correctAnswers} / {results?.totalQuestions}
            </div>
          </div>
          <div className="bg-orange-900/30 p-4 rounded-xl border border-orange-500/20">
            <div className="text-sm text-orange-400">Questions Answered</div>
            <div className="text-2xl font-bold text-orange-300">
              {Object.keys(answers).length} / {questions.length}
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {questions.map((question, index) => (
            <div key={question.id} className="border border-gray-700 rounded-lg p-4 bg-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-white">Question {index + 1}:</span>
                {results?.questionResults[index].isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="text-gray-300 mb-4">{formatMathText(question.text)}</div>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-300">Your Answer:</span>
                  <div className="text-gray-400 mt-1">
                    {formatMathText(answers[question.id] || 'No answer')}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-300">Correct Answer:</span>
                  <div className="text-gray-400 mt-1">
                    {formatMathText(question.answer || '')}
                  </div>
                </div>
                {results?.questionResults[index].isNumericallyEqual && 
                 !results.questionResults[index].isCorrect && (
                  <div className="text-orange-400">
                    Note: Your answer is numerically equivalent but written differently.
                  </div>
                )}
                {!results?.questionResults[index].isCorrect && (
                  <div className="mt-2 pt-4 border-t border-gray-600">
                    <span className="font-medium text-gray-300">Solution Approach:</span>
                    <div className="text-gray-400 mt-1">
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
                {(question.type === 'Essay' || question.type === 'Short Answer') && (
                  <div className="mt-2 text-sm text-gray-400">
                    <p>Evaluation Criteria:</p>
                    {(() => {
                      try {
                        const criteria = JSON.parse(question.answer || '');
                        return (
                          <ul className="list-disc pl-5">
                            {criteria.requiredPoints.map((point: { point: string; weight: number }) => (
                              <li key={point.point}>
                                {point.point} ({point.weight}%)
                              </li>
                            ))}
                            <li>Word count: {criteria.minWordCount}-{criteria.maxWordCount}</li>
                          </ul>
                        );
                      } catch (e) {
                        return <p>Criteria not available</p>;
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={() => navigate('/task-preview')}
            className="px-4 py-2 text-gray-300 hover:text-white"
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
    <div className="min-h-screen bg-gray-900 py-8">
      {/* Timer Modal */}
      <AnimatePresence>
        {showTimerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Select Time Limit</h2>
                <button
                  onClick={handleBack}
                  className="p-2 text-gray-400 hover:text-gray-300 rounded-full
                           hover:bg-gray-700 transition-colors"
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
                        ? 'border-blue-500 bg-blue-900/30 text-blue-400' 
                        : 'border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white'
                    }`}
                  >
                    {time} min
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Custom Time (minutes)
                </label>
                <input
                  type="number"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(Number(e.target.value))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="180"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 text-gray-300 rounded-xl font-semibold 
                           hover:bg-gray-700 transition-colors border-2 border-gray-700"
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

      
      <div className="max-w-4xl mx-auto px-4">
       
        <div className="bg-gray-800 rounded-xl shadow-lg p-4 mb-6 sticky top-4 z-10 border border-gray-700">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-300 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Exit
            </button>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-300">
                Progress: {Math.round(progress)}%
              </div>
              <div className={`font-mono text-lg ${
                timeLeft < 300 ? 'text-red-400' : 'text-blue-400'
              }`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          
         
          <div className="h-2 bg-gray-700 rounded-full mt-4">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        
        <div className="space-y-6">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700"
            >
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-900/30 text-blue-400 
                               rounded-full flex items-center justify-center font-semibold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="text-lg text-white mb-4">
                    {formatMathText(question.text)}
                  </div>
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Enter your answer here..."
                    className="w-full p-4 bg-gray-700 border border-gray-600 rounded-xl 
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                             min-h-[100px] text-white placeholder-gray-400"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        
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