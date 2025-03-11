export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          text: string
          type: string
          topic: string
          difficulty: string
          answers: Json | null
          correct_answer: string | null
          explanation: string | null
          context: string | null
          instructions: string | null
          learning_outcome: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          text: string
          type: string
          topic: string
          difficulty: string
          answers?: Json | null
          correct_answer?: string | null
          explanation?: string | null
          context?: string | null
          instructions?: string | null
          learning_outcome?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          text?: string
          type?: string
          topic?: string
          difficulty?: string
          answers?: Json | null
          correct_answer?: string | null
          explanation?: string | null
          context?: string | null
          instructions?: string | null
          learning_outcome?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export interface DbTask {
  id: string;
  user_id: string;
  text: string;
  type: string;
  topic: string;
  difficulty: string;
  correct_answer: string | null;
  answer: string | null;
  created_at: string;
  updated_at: string;
  learning_outcome?: string;
  context?: string;
  instructions?: string;
}

export interface TaskSheet {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  tasks: string[]; // Array of task IDs
  tags?: string[];
  created_at: string;
  updated_at: string;
}