export type ExamType = 'IELTS' | 'SAT' | 'CIE' | 'UNT';

export interface ExamConfig {
  type: ExamType;
  sections: string[];
  topics: string[];
  difficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
  includeAnswers?: boolean;
}

export interface TaskConfig {
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  count: number;
  subject?: string;
}

export interface Question {
  id: string;
  text: string;
  type: string;
  topic: string;
  difficulty: string;
  answers?: string[] | null;
  correctAnswer?: string | null;
  explanation?: string | null;
  context?: string | null;
  instructions?: string | null;
  learningOutcome?: string | null;
  answer?: string | null;
}