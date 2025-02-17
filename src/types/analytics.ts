export interface ExamAttempt {
  id: string;
  user_id: string;
  exam_id: string;
  score: number;
  time_taken: number;
  answers: {
    question_id: string;
    answer: string;
    is_correct: boolean;
    time_spent: number;
  }[];
  created_at: string;
}

export interface PerformanceMetrics {
  overall_score: number;
  topic_scores: Record<string, number>;
  time_per_question: number;
  improvement_rate: number;
  weak_areas: string[];
  strong_areas: string[];
} 