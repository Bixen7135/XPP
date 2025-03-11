import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Check, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Question } from '../types/exam';
import { Button } from './common/Button';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface TaskSelectorModalProps {
  onClose: () => void;
  onSelect: (tasks: Question[]) => void;
  existingTaskIds: string[];
}

export const TaskSelectorModal = ({ onClose, onSelect, existingTaskIds }: TaskSelectorModalProps) => {
  const [tasks, setTasks] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showFilterTags, setShowFilterTags] = useState(false);
  const [filters, setFilters] = useState({
    difficulty: new Set<string>(),
    topic: new Set<string>(),
    type: new Set<string>(),
  });
  const [topicSearch, setTopicSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [selectedTopicTags, setSelectedTopicTags] = useState<Set<string>>(new Set());
  const [selectedTypeTags, setSelectedTypeTags] = useState<Set<string>>(new Set());

  // Extract unique values for filters
  const uniqueTopics = [...new Set(tasks.map(task => task.topic))];
  const uniqueTypes = [...new Set(tasks.map(task => task.type))];
  const difficulties = ['easy', 'medium', 'hard'];

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.topic.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDifficulty = 
      filters.difficulty.size === 0 || filters.difficulty.has(task.difficulty);
    
    const matchesTopic = 
      filters.topic.size === 0 || filters.topic.has(task.topic);
    
    const matchesType = 
      filters.type.size === 0 || filters.type.has(task.type);

    return matchesSearch && matchesDifficulty && matchesTopic && matchesType;
  });

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.dropdown-container')) {
        setShowTopicDropdown(false);
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .not('id', 'in', `(${existingTaskIds.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (type: 'difficulty' | 'topic' | 'type', value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      const filterSet = new Set(prev[type]);
      
      if (filterSet.has(value)) {
        filterSet.delete(value);
      } else {
        filterSet.add(value);
        setShowFilterTags(true);
      }
      
      newFilters[type] = filterSet;
      return newFilters;
    });
  };

  const filteredTopics = uniqueTopics
    .filter(topic => 
      !filters.topic.has(topic) &&
      topic.toLowerCase().includes(topicSearch.toLowerCase())
    );

  const filteredTypes = uniqueTypes
    .filter(type => 
      !filters.type.has(type) &&
      type.toLowerCase().includes(typeSearch.toLowerCase())
    );

  const handleSelect = () => {
    const selectedTasksList = tasks.filter(task => selectedTasks.has(task.id));
    onSelect(selectedTasksList);
  };

  const getFilterLabel = (type: string, value: string) => {
    if (type === 'difficulty') return value.charAt(0).toUpperCase() + value.slice(1);
    return value;
  };

  const formatMathText = (text: string) => {
    if (!text) return '';
    
    const parts = text.split(/(\\\[.*?\\\]|\\\(.*?\\\))/gs);
    
    return parts.map((part, index) => {
      if (part.startsWith('\\[') && part.endsWith('\\]')) {
        const mathContent = part.slice(2, -2).trim();
        return (
          <div key={index} className="my-2">
            <BlockMath math={mathContent} />
          </div>
        );
      }
      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        const mathContent = part.slice(2, -2).trim();
        return <InlineMath key={index} math={mathContent} />;
      }
      return part;
    });
  };

  const handleTagsConfirm = (type: 'topic' | 'type') => {
    const selectedTags = type === 'topic' ? selectedTopicTags : selectedTypeTags;
    selectedTags.forEach(tag => toggleFilter(type, tag));
    if (type === 'topic') {
      setSelectedTopicTags(new Set());
      setTopicSearch('');
      setShowTopicDropdown(false);
    } else {
      setSelectedTypeTags(new Set());
      setTypeSearch('');
      setShowTypeDropdown(false);
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
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Select Tasks</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-gray-600"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {showFilters ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Difficulty Filter */}
            <div>
              <h3 className="font-medium mb-2 text-sm text-gray-700">Difficulty Level</h3>
              <div className="flex flex-wrap gap-2">
                {difficulties.map(difficulty => (
                  <button
                    key={difficulty}
                    onClick={() => toggleFilter('difficulty', difficulty)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors
                      ${filters.difficulty.has(difficulty)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Filter */}
            <div>
              <h3 className="font-medium mb-2 text-sm text-gray-700">Topics</h3>
              <div className="space-y-2 dropdown-container relative">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    onFocus={() => setShowTopicDropdown(true)}
                    placeholder="Search topics..."
                    className="w-full pl-8 pr-2 py-1 text-sm border rounded"
                  />
                </div>
                {/* Topic Filter Dropdown */}
                {showTopicDropdown && filteredTopics.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      {filteredTopics.map(topic => (
                        <button
                          key={topic}
                          onClick={() => {
                            setSelectedTopicTags(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(topic)) {
                                newSet.delete(topic);
                              } else {
                                newSet.add(topic);
                              }
                              return newSet;
                            });
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex items-center justify-between
                            ${selectedTopicTags.has(topic) ? 'bg-blue-50' : ''}`}
                        >
                          {topic}
                          {selectedTopicTags.has(topic) && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                    {selectedTopicTags.size > 0 && (
                      <div className="p-2 border-t bg-gray-50 flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {selectedTopicTags.size} selected
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedTopicTags(new Set())}
                            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => handleTagsConfirm('topic')}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Add Tags
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Selected Topics */}
                {filters.topic.size > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.from(filters.topic).map(topic => (
                      <span
                        key={topic}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                                  bg-green-100 text-green-800 text-xs"
                      >
                        {topic}
                        <button
                          onClick={() => toggleFilter('topic', topic)}
                          className="hover:bg-green-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <h3 className="font-medium mb-2 text-sm text-gray-700">Question Types</h3>
              <div className="space-y-2 dropdown-container relative">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    onFocus={() => setShowTypeDropdown(true)}
                    placeholder="Search types..."
                    className="w-full pl-8 pr-2 py-1 text-sm border rounded"
                  />
                </div>
                {/* Type Filter Dropdown */}
                {showTypeDropdown && filteredTypes.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      {filteredTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedTypeTags(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(type)) {
                                newSet.delete(type);
                              } else {
                                newSet.add(type);
                              }
                              return newSet;
                            });
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex items-center justify-between
                            ${selectedTypeTags.has(type) ? 'bg-blue-50' : ''}`}
                        >
                          {type}
                          {selectedTypeTags.has(type) && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                    {selectedTypeTags.size > 0 && (
                      <div className="p-2 border-t bg-gray-50 flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {selectedTypeTags.size} selected
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedTypeTags(new Set())}
                            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => handleTagsConfirm('type')}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Add Tags
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Selected Types */}
                {filters.type.size > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.from(filters.type).map(type => (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                                  bg-purple-100 text-purple-800 text-xs"
                      >
                        {type}
                        <button
                          onClick={() => toggleFilter('type', type)}
                          className="hover:bg-purple-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => {
                    const newSelected = new Set(selectedTasks);
                    if (newSelected.has(task.id)) {
                      newSelected.delete(task.id);
                    } else {
                      newSelected.add(task.id);
                    }
                    setSelectedTasks(newSelected);
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors
                    ${selectedTasks.has(task.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${task.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'}`}
                        >
                          {task.difficulty}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {task.topic}
                        </span>
                      </div>
                      <div className="text-gray-900 prose prose-sm max-w-none">
                        {formatMathText(task.text)}
                      </div>
                    </div>
                    {selectedTasks.has(task.id) && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
              onClick={handleSelect}
              disabled={selectedTasks.size === 0}
            >
              Add Selected ({selectedTasks.size})
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 