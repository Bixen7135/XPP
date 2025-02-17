import { create } from 'zustand';
import { ExamConfig, TaskConfig, Question } from '../types/exam';

interface ExamStore {
  questions: Question[];
  examConfig: ExamConfig | null;
  taskConfig: TaskConfig | null;
  isLoading: boolean;
  error: string | null;
  
  setExamConfig: (config: ExamConfig) => void;
  setTaskConfig: (config: TaskConfig) => void;
  setQuestions: (questions: Question[]) => void;
  updateQuestion: (index: number, question: Question) => void;
  reorderQuestions: (startIndex: number, endIndex: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  questions: [],
  examConfig: null,
  taskConfig: null,
  isLoading: false,
  error: null
};

export const useExamStore = create<ExamStore>((set) => ({
  ...initialState,

  setExamConfig: (config) => set({ examConfig: config }),
  setTaskConfig: (config) => set({ taskConfig: config }),
  setQuestions: (questions) => set({ questions }),
  updateQuestion: (index, question) => set((state) => ({
    questions: state.questions.map((q, i) => i === index ? question : q)
  })),
  reorderQuestions: (startIndex, endIndex) => set((state) => {
    const newQuestions = [...state.questions];
    const [removed] = newQuestions.splice(startIndex, 1);
    newQuestions.splice(endIndex, 0, removed);
    return { questions: newQuestions };
  }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState)
}));