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
    
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, user_id')
      .in('id', taskIds);

    if (fetchError) throw fetchError;

    
    const unauthorizedTasks = tasks?.filter(task => task.user_id !== user.id);
    if (unauthorizedTasks && unauthorizedTasks.length > 0) {
      throw new Error('Unauthorized to delete some tasks');
    }

    
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


export async function getSheets() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('task_sheets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching sheets:', error);
    throw error;
  }
}


export async function getSheetById(id: string) {
  try {
    
    const { data: sheet, error } = await supabase
      .from('task_sheets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')  
      .in('id', sheet.tasks);
    
    if (tasksError) throw tasksError;
    
    return { sheet, tasks };
  } catch (error) {
    console.error('Error fetching sheet:', error);
    throw error;
  }
}


export async function createSheet(title: string, description: string = '', taskIds: string[] = []) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('task_sheets')
      .insert({
        title,
        description,
        tasks: taskIds,
        user_id: user.id
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating sheet:', error);
    throw error;
  }
}


export async function updateSheet(sheetId: string, updates: Partial<{
  title: string;
  description: string;
  tasks: string[];
}>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const { data: sheet, error: checkError } = await supabase
      .from('task_sheets')
      .select('user_id')
      .eq('id', sheetId)
      .single();
      
    if (checkError) throw checkError;
    if (!sheet) throw new Error('Sheet not found');
    if (sheet.user_id !== user.id) throw new Error('Unauthorized');
    
    
    const { data, error } = await supabase
      .from('task_sheets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sheetId)
      .select()
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating sheet:', error);
    throw error;
  }
}


export async function deleteSheets(sheetIds: string[]) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const { data: sheets, error: checkError } = await supabase
      .from('task_sheets')
      .select('id, user_id')
      .in('id', sheetIds);
      
    if (checkError) throw checkError;
    
    const unauthorizedSheets = sheets?.filter(sheet => sheet.user_id !== user.id);
    if (unauthorizedSheets && unauthorizedSheets.length > 0) {
      throw new Error('Unauthorized to delete some sheets');
    }
    
    
    const { data, error } = await supabase
      .from('task_sheets')
      .delete()
      .in('id', sheetIds);
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting sheets:', error);
    throw error;
  }
}


export async function copySheet(sheetId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const original = await getSheetById(sheetId);
    
    
    const { data, error } = await supabase
      .from('task_sheets')
      .insert({
        title: `${original.sheet.title} (Copy)`,
        description: original.sheet.description,
        tasks: original.sheet.tasks,
        user_id: user.id
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    return data.id;
  } catch (error) {
    console.error('Error copying sheet:', error);
    throw error;
  }
}


export async function shareSheet(sheetId: string, recipientEmail: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const { data: sheet, error: checkError } = await supabase
      .from('task_sheets')
      .select('*')
      .eq('id', sheetId)
      .eq('user_id', user.id)
      .single();
      
    if (checkError) throw checkError;
    if (!sheet) throw new Error('Sheet not found');
    
    
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', recipientEmail)
      .single();
      
    if (recipientError) throw new Error('Recipient not found');
    
    
    const { data, error } = await supabase
      .from('shared_sheets')
      .insert({
        sheet_id: sheetId,
        owner_id: user.id,
        recipient_id: recipient.id,
        shared_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error sharing sheet:', error);
    throw error;
  }
}


export async function saveSheetVersion(sheetId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const { sheet } = await getSheetById(sheetId);
    
    
    const { data, error } = await supabase
      .from('sheet_versions')
      .insert({
        sheet_id: sheetId,
        title: sheet.title,
        description: sheet.description,
        tasks: sheet.tasks,
        created_at: new Date().toISOString(),
        user_id: user.id
      });
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error saving sheet version:', error);
    throw error;
  }
}


export async function getSheetVersions(sheetId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('sheet_versions')
      .select('*')
      .eq('sheet_id', sheetId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching sheet versions:', error);
    throw error;
  }
}

// Save tasks to Supabase
export async function saveTasks(tasks: Question[], returnIds = false): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const taskData = tasks.map(task => ({
      id: task.id,
      user_id: user.id,
      text: task.text,
      type: task.type,
      topic: task.topic,
      difficulty: task.difficulty,
      correct_answer: task.correctAnswer || null,
      explanation: task.explanation || null,
      context: task.context || null,
      instructions: task.instructions || null,
      learning_outcome: task.learningOutcome || null,
      answer: task.answer || null
    }));
    
    const { data, error } = await supabase
      .from('tasks')
      .upsert(taskData, { onConflict: 'id' })
      .select('id');
    
    if (error) throw error;
    
    return returnIds ? (data?.map(item => item.id) || []) : [];
  } catch (error) {
    console.error('Error saving tasks:', error);
    throw error;
  }
}


export async function saveTaskSheet(sheet: Omit<TaskSheet, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const taskIds = sheet.tasks;
    const { data: existingTasks, error: checkError } = await supabase
      .from('tasks')
      .select('id')
      .in('id', taskIds);
    
    if (checkError) throw checkError;
    
    const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
    const missingTaskIds = taskIds.filter(id => !existingTaskIds.has(id));
    
    if (missingTaskIds.length > 0) {
      throw new Error(`Some tasks don't exist in the database: ${missingTaskIds.join(', ')}`);
    }
    
    
    const { data, error } = await supabase
      .from('task_sheets')
      .insert({
        ...sheet,
        user_id: user.id
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    return data.id;
  } catch (error) {
    console.error('Error saving task sheet:', error);
    throw error;
  }
}