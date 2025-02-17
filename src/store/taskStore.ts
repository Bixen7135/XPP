import type { Question } from '../types/exam';

interface TaskState {
  tasks: Record<string, Question>;
  selectedTaskId: string | null;
  filters: {
    type: string[];
    difficulty: string[];
    topic: string[];
  };
  sort: {
    field: keyof Question;
    direction: 'asc' | 'desc';
  };
} 