import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import type { Question } from '../types/exam';
import { DbTask, TaskSheet } from '../types/supabase';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Type definitions for database
export type Profile = {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
};

export type UserSettings = {
  user_id: string;
  theme: 'light' | 'dark';
  language: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at?: string;
};

const mapTaskToDb = (task: Question, userId: string): Omit<DbTask, 'created_at' | 'updated_at'> => {
  // Ensure task has a valid UUID
  const taskId = task.id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(task.id) 
    ? task.id 
    : uuidv4();

  return {
    id: taskId,
    user_id: userId,
    text: task.text,
    type: task.type,
    topic: task.topic,
    difficulty: task.difficulty,
    answer: task.answers?.join(', ') || null,
    correct_answer: task.correctAnswer || null,
    instructions: task.instructions || undefined,
    learning_outcome: task.learningOutcome || undefined
  };
};

export const saveTasks = async (tasks: Question[], asSheet: boolean = false) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const dbTasks = tasks.map(task => mapTaskToDb(task, user.id));
    
    // Save tasks
    const { data: savedTasks, error: tasksError } = await supabase
      .from('tasks')
      .upsert(dbTasks, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select();

    if (tasksError) throw tasksError;

    // If saving as a sheet, create a task sheet entry
    if (asSheet && savedTasks) {
      const { error: sheetError } = await supabase
        .from('task_sheets')
        .insert({
          user_id: user.id,
          title: `Task Sheet ${new Date().toLocaleDateString()}`,
          tasks: savedTasks.map(task => task.id)
        });

      if (sheetError) throw sheetError;
    }

    return savedTasks;
  } catch (error) {
    console.error('Error saving tasks:', error);
    throw error;
  }
};

export async function getTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return { data, error };
}

export async function deleteTasks(taskIds: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // First verify user has permission to delete these tasks
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, user_id')
      .in('id', taskIds);

    if (fetchError) throw fetchError;

    // Check if all tasks belong to the current user
    const unauthorizedTasks = tasks?.filter(task => task.user_id !== user.id);
    if (unauthorizedTasks && unauthorizedTasks.length > 0) {
      throw new Error('Unauthorized to delete some tasks');
    }

    // Perform hard delete
    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .in('id', taskIds);

    if (error) throw error;

    return { data, error };
  } catch (error) {
    console.error('Error deleting tasks:', error);
    throw error;
  }
}