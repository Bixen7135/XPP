import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { User, UserResponse } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  initialized: false,

  setUser: (user) => set({ user, initialized: true }),

  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      set({ user: data.user, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign in' });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, username) => {
    try {
      set({ loading: true, error: null });
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              username,
              email,
            },
          ]);

        if (profileError) throw profileError;
        set({ user: authData.user });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign up' });
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sign out' });
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.setState({ 
    user: session?.user ?? null,
    initialized: true,
    loading: false
  });
}); 