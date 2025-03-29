import React, { useState, useEffect, FormEvent, ChangeEvent, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { 
  Users, Plus, Search, Activity, AlertTriangle, Globe, Lock,
  Loader2, BookOpen 
} from 'lucide-react';
import type { StudyGroup, StudyGroupMember } from '../types/analytics';
import { createStudyGroup, joinStudyGroup, getGroupActivity } from '../services/studyGroup';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Portal } from '@radix-ui/react-portal';
import { PageLayout } from './common/PageLayout';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "../components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib/utils";

type PrivacySetting = 'public' | 'private';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true
    },
    global: {
      fetch: (...args) => {
        let [url, options] = args;
        options = {
          ...options,
          headers: {
            ...options?.headers,
            "Accept": "application/json",
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            "X-Client-Info": "supabase-js/2.5.0"
          }
        };
        
        return fetch(url, options);
      }
    }
  }
);


const subjects: Record<string, string[]> = {
  'Mathematics': ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry', 'Number Theory', 'Linear Algebra', 'Discrete Mathematics', 'Mathematical Logic', 'Real Analysis'],
  'Physics': ['Mechanics', 'Thermodynamics', 'Electricity', 'Optics', 'Quantum Physics', 'Nuclear Physics', 'Astrophysics', 'Fluid Dynamics', 'Relativity', 'Electromagnetism'],
  'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Biochemistry', 'Analytical Chemistry', 'Polymer Chemistry', 'Environmental Chemistry', 'Medicinal Chemistry', 'Nuclear Chemistry', 'Electrochemistry'],
  'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy', 'Evolution', 'Microbiology', 'Botany', 'Zoology', 'Molecular Biology', 'Physiology'],
  'Computer Science': [
    'Programming Fundamentals', 'Data Structures', 'Algorithms', 'Database Systems', 'Web Development',
    'Computer Networks', 'Operating Systems', 'Software Engineering', 'Cybersecurity', 'Artificial Intelligence',
    'Machine Learning', 'Computer Architecture', 'Cloud Computing', 'Mobile Development', 'Blockchain Technology'
  ],
  'English': ['Grammar', 'Literature', 'Writing', 'Comprehension', 'Vocabulary', 'Creative Writing', 'Business English', 'Academic Writing', 'Public Speaking', 'Literary Analysis'],
  'History': ['World History', 'Ancient Civilizations', 'Modern History', 'Cultural History', 'Military History', 'Economic History', 'Social History', 'Political History', 'Art History', 'Archaeological Studies'],
  'Geography': [
    'Physical Geography', 'Human Geography', 'Cartography', 'Climate Studies', 'Urban Geography',
    'Economic Geography', 'Environmental Geography', 'Population Studies', 'Geographic Information Systems', 'Regional Studies'
  ],
  'Economics': [
    'Microeconomics', 'Macroeconomics', 'International Economics', 'Development Economics', 'Financial Economics',
    'Labor Economics', 'Public Economics', 'Environmental Economics', 'Behavioral Economics', 'Economic History'
  ],
  'Psychology': [
    'Clinical Psychology', 'Cognitive Psychology', 'Developmental Psychology', 'Social Psychology', 'Behavioral Psychology',
    'Neuropsychology', 'Educational Psychology', 'Industrial Psychology', 'Personality Psychology', 'Research Methods'
  ],
  'Philosophy': [
    'Ethics', 'Logic', 'Metaphysics', 'Epistemology', 'Political Philosophy', 'Philosophy of Science',
    'Philosophy of Mind', 'Aesthetics', 'Eastern Philosophy', 'Contemporary Philosophy'
  ],
  'Art': [
    'Art History', 'Drawing', 'Painting', 'Sculpture', 'Digital Art', 'Photography', 'Graphic Design',
    'Art Theory', 'Contemporary Art', 'Visual Communication'
  ],
  'Music': [
    'Music Theory', 'Music History', 'Composition', 'Performance', 'Music Technology', 'World Music',
    'Music Analysis', 'Orchestration', 'Music Education', 'Sound Design'
  ]
};

export const StudyGroups = () => {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    subject: '',
    topics: [] as string[],
    settings: {
      max_members: 10,
      privacy: 'public' as PrivacySetting,
      allow_invites: true,
      require_approval: false
    }
  });
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'active' | 'members'>('newest');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetchGroups();
  
    setAvailableSubjects(Object.keys(subjects));
  }, []);

  const fetchGroups = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select('*');
        
      if (error) {
        throw error;
      }
      
      if (data) {
        setGroups(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load study groups');
      console.error('Error fetching groups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const group = await createStudyGroup(
        newGroup.name,
        newGroup.description,
        selectedSubjects.join(', '), 
        newGroup.topics,
        newGroup.settings
      );
      setGroups([...groups, group]);
      setShowCreateForm(false);
      setNewGroup({
        name: '',
        description: '',
        subject: '',
        topics: [],
        settings: {
          max_members: 10,
          privacy: 'public',
          allow_invites: true,
          require_approval: false
        }
      });
      setSelectedSubjects([]); 
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const member = await joinStudyGroup(groupId);
      setGroups(groups.map(group => 
        group.id === groupId 
          ? { ...group, members: [...group.members, member] }
          : group
      ));
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const filteredGroups = useMemo(() => {
    let filtered = groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'active':
        return filtered.sort((a, b) => 
          b.stats.weekly_activity - a.stats.weekly_activity
        );
      case 'members':
        return filtered.sort((a, b) => 
          b.members.length - a.members.length
        );
      default:
        return filtered;
    }
  }, [groups, searchQuery, sortBy]);

  return (
    <PageLayout maxWidth="2xl">
      <div className="space-y-6">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Study Groups</h1>
            <p className="text-gray-400 mt-2">Join or create study groups to learn together</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all rounded-full px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by name, description or subject..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-gray-800 shadow-sm rounded-xl border-gray-700 focus:border-blue-500 focus:ring-blue-500 text-white"
            />
          </div>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as 'newest' | 'active' | 'members')}
          >
            <SelectTrigger className="rounded-xl border-gray-700 focus:border-blue-500 focus:ring-blue-500 bg-gray-800 text-white">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <Portal>
              <SelectContent className="bg-gray-800 border-gray-700 shadow-lg z-[9999] text-white">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="active">Most Active</SelectItem>
                <SelectItem value="members">Most Members</SelectItem>
              </SelectContent>
            </Portal>
          </Select>
        </div>

        {showCreateForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            style={{ isolation: 'isolate' }}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative"
              style={{ transform: 'translate3d(0, 0, 0)' }}
            >
              <Card className="border-0">
                <CardHeader className="border-b border-gray-700 bg-gray-800">
                  <CardTitle className="text-2xl text-white">Create New Study Group</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleCreateGroup}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Name</label>
                        <Input
                          value={newGroup.name}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => 
                            setNewGroup({ ...newGroup, name: e.target.value })}
                          className="w-full rounded-xl border-gray-700 focus:border-blue-500 focus:ring-blue-500 bg-gray-800 text-white"
                          placeholder="Enter group name"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Description</label>
                        <Textarea
                          value={newGroup.description}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => 
                            setNewGroup({ ...newGroup, description: e.target.value })}
                          className="w-full min-h-[100px] rounded-xl border-gray-700 focus:border-blue-500 focus:ring-blue-500 bg-gray-800 text-white"
                          placeholder="Describe your group's goals and focus"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Subjects</label>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-full justify-between rounded-xl border-gray-700 focus:border-blue-500 focus:ring-blue-500 bg-gray-800 text-white"
                            >
                              {selectedSubjects.length > 0
                                ? `${selectedSubjects.length} subjects selected`
                                : "Select subjects..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0 bg-gray-800 border-gray-700">
                            <Command>
                              <CommandInput placeholder="Search subjects..." className="text-white" />
                              <CommandEmpty className="text-gray-400">No subjects found.</CommandEmpty>
                              <CommandGroup>
                                {availableSubjects.map((subject) => (
                                  <CommandItem
                                    key={subject}
                                    value={subject}
                                    onSelect={() => {
                                      setSelectedSubjects(prev => 
                                        prev.includes(subject) 
                                          ? prev.filter(s => s !== subject)
                                          : [...prev, subject]
                                      );
                                    }}
                                    className="text-white hover:bg-gray-700"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedSubjects.includes(subject) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {subject}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedSubjects.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedSubjects.map((subject) => (
                              <Badge
                                key={subject}
                                variant="secondary"
                                className="rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                              >
                                {subject}
                                <button
                                  type="button"
                                  onClick={() => setSelectedSubjects(prev => prev.filter(s => s !== subject))}
                                  className="ml-1 hover:text-blue-300"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Privacy</label>
                        <Select
                          value={newGroup.settings.privacy}
                          onValueChange={(value: PrivacySetting) => 
                            setNewGroup({ 
                              ...newGroup, 
                              settings: { ...newGroup.settings, privacy: value } 
                            })}
                        >
                          <SelectTrigger className="rounded-xl border-gray-700 focus:border-blue-500 focus:ring-blue-500 bg-gray-800 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <Portal>
                            <SelectContent className="bg-gray-800 border-gray-700 shadow-lg z-[9999] text-white">
                              <SelectItem value="public">
                                <div className="flex items-center">
                                  <Globe className="w-4 h-4 mr-2" />
                                  Public
                                </div>
                              </SelectItem>
                              <SelectItem value="private">
                                <div className="flex items-center">
                                  <Lock className="w-4 h-4 mr-2" />
                                  Private
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Portal>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-6">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowCreateForm(false);
                          setSelectedSubjects([]);
                        }}
                        className="rounded-xl border-gray-700 hover:bg-gray-700 text-white h-11 px-6"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={selectedSubjects.length === 0}
                        className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 h-11 px-6 disabled:opacity-50"
                      >
                        Create Group
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-12 h-12 text-blue-500" />
            </motion.div>
            <p className="mt-4 text-gray-400">Loading study groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 bg-gray-800 rounded-2xl shadow-sm"
          >
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No study groups found</h3>
            <p className="text-gray-400 mb-4">Create a new group to get started!</p>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="rounded-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Group
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredGroups.map((group) => (
              <motion.div
                key={group.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full hover:shadow-lg transition-all rounded-2xl border-gray-700 bg-gray-800">
                  <CardHeader className="border-b border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl mb-2 text-white">{group.name}</CardTitle>
                        <Badge variant={group.settings.privacy === 'public' ? 'secondary' : 'outline'} className="rounded-full">
                          {group.settings.privacy === 'public' ? (
                            <Globe className="w-3 h-3 mr-1" />
                          ) : (
                            <Lock className="w-3 h-3 mr-1" />
                          )}
                          {group.settings.privacy}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="ml-2 rounded-full">
                        <Users className="w-4 h-4 mr-1" />
                        {group.members.length}/{group.settings.max_members}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <p className="text-gray-400 line-clamp-2">{group.description}</p>
                    
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center text-sm text-gray-400">
                        <BookOpen className="w-4 h-4 mr-2" />
                        <span>{group.subject}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-400">
                        <Activity className="w-4 h-4 mr-2" />
                        <span>{group.stats.weekly_activity} activities this week</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {group.topics.map((topic) => (
                          <Badge key={topic} variant="outline" className="text-xs rounded-full border-gray-700">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => handleJoinGroup(group.id)}
                      disabled={group.members.length >= group.settings.max_members}
                      variant={group.members.length >= group.settings.max_members ? "outline" : "default"}
                    >
                      {group.members.length >= group.settings.max_members ? (
                        'Group Full'
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          Join Group
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageLayout>
  );
}; 