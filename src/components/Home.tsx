import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, BookOpen, BarChart3, Sparkles, Brain, CheckCircle, FileText, Library, Users, ArrowRight } from 'lucide-react';
import { AnimatedElement } from './AnimatedElement';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export const Home = () => {
  const navigate = useNavigate();
  const benefitsRef = useRef(null);
  const isInView = useInView(benefitsRef, { once: true, margin: "-100px" });

  const benefits = [
    'AI-powered question generation',
    'Multiple exam formats support',
    'Detailed solutions and explanations',
    'Customizable difficulty levels',
    'Topic-specific questions',
    'Save and reuse questions'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4">
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          duration: 0.8,
          bounce: 0.4
        }}
        className="text-center py-20 bg-gradient-to-b from-blue-50 dark:from-blue-900/20 dark:to-gray-900 to-white rounded-3xl mb-16"
      >
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400"
        >
          Create Professional
          <br />
          <span className="text-6xl">Exam Sheets & Tasks</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto"
        >
          Generate customized exam sheets and task sheets powered by AI. 
          Perfect for educators and students.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/generate-exam')}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold
                     hover:bg-blue-700 transition-all duration-200
                     flex items-center gap-2"
          >
            <GraduationCap className="w-5 h-5" />
            Generate Exam
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/generate-task')}
            className="px-8 py-4 bg-transparent text-blue-400 rounded-xl font-semibold
                     hover:bg-blue-500/10 transition-all duration-200
                     border-2 border-blue-400 flex items-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Create Tasks
          </motion.button>
        </motion.div>
      </motion.div>

      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg dark:shadow-gray-900/50 flex flex-col h-full
                        transform transition-all duration-200 hover:scale-105 hover:shadow-xl group">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/50
                         rounded-xl text-blue-600 dark:text-blue-400 mb-4
                         transform transition-all duration-300 
                         group-hover:scale-110 group-hover:rotate-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">AI-Powered Generation</h3>
          <p className="text-gray-600 dark:text-gray-300 flex-grow">
            Advanced AI algorithms generate high-quality exam questions tailored to your needs.
            Customizable difficulty levels and topics ensure relevant content.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg dark:shadow-gray-900/50 flex flex-col h-full
                        transform transition-all duration-200 hover:scale-105 hover:shadow-xl group">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/50
                         rounded-xl text-green-600 dark:text-green-400 mb-4
                         transform transition-all duration-300 
                         group-hover:scale-110 group-hover:rotate-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Multiple Formats</h3>
          <p className="text-gray-600 dark:text-gray-300 flex-grow">
            Support for various exam formats including IELTS, SAT, and more.
            Export to PDF or DOCX with customizable layouts.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg dark:shadow-gray-900/50 flex flex-col h-full
                        transform transition-all duration-200 hover:scale-105 hover:shadow-xl group">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/50
                         rounded-xl text-purple-600 dark:text-purple-400 mb-4
                         transform transition-all duration-300 
                         group-hover:scale-110 group-hover:rotate-3">
            <Library className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Question Library</h3>
          <p className="text-gray-600 dark:text-gray-300 flex-grow">
            Save and organize generated questions in your personal library.
            Easily reuse and modify questions for different exams.
          </p>
        </div>
      </div>

      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mb-16"
      >
        <Link
          to="/study-groups"
          className="block bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 
                   rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden
                   transform hover:scale-[1.02] group"
        >
          <div className="p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Study Groups</h3>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Join or create study groups to collaborate with other students
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium group-hover:gap-4 transition-all duration-300">
              <span>Join Now</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </Link>
      </motion.div>

      
      <section 
        ref={benefitsRef}
        className="py-12 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-3xl mb-12"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12"
          >
            Platform Benefits
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm
                           transform transition-all duration-200 hover:scale-105 hover:shadow-md
                           cursor-pointer dark:shadow-gray-900/50"
              >
                <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      
      <AnimatedElement>
        <div className="text-center py-16 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 rounded-3xl mb-20">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Create Your First Exam?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Start generating professional exam sheets and tasks in minutes.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/generate-exam')}
            className="px-8 py-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-xl font-semibold
                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200
                     shadow-lg hover:shadow-xl dark:shadow-gray-900/50"
          >
            Get Started Now
          </motion.button>
        </div>
      </AnimatedElement>
    </div>
  );
};