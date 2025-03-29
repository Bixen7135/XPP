import { openai } from './openai';
import type { AdaptiveMetrics } from '../types/analytics';

export function calculateTopicMastery(metrics: AdaptiveMetrics): Record<string, number> {
  const mastery: Record<string, number> = {};
  
  
  Object.entries(metrics.topic_mastery).forEach(([topic, stats]) => {
    const successRate = stats.correct_answers / stats.questions_attempted;
    const timeEfficiency = Math.min(1, metrics.learning_style.optimal_time_per_question / stats.average_time);
    const recency = Math.min(1, (Date.now() - stats.last_practiced.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    
    mastery[topic] = (
      successRate * 0.5 +
      timeEfficiency * 0.3 +
      (1 - recency) * 0.2
    ) * 100;
  });
  
  return mastery;
}

export function determineOptimalDifficulty(metrics: AdaptiveMetrics): 'easy' | 'medium' | 'hard' {
  const recentQuestions = metrics.question_history
    .filter(q => Date.now() - q.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000)
    .slice(-10);
  
  if (recentQuestions.length < 5) {
    return metrics.learning_style.preferred_difficulty;
  }
  
  const successRate = recentQuestions.filter(q => q.is_correct).length / recentQuestions.length;
  const avgTime = recentQuestions.reduce((sum, q) => sum + q.time_taken, 0) / recentQuestions.length;
  
  if (successRate < 0.4) return 'easy';
  if (successRate > 0.8 && avgTime < metrics.learning_style.optimal_time_per_question * 0.8) return 'hard';
  return 'medium';
}

export async function generateAdaptiveLearningPath(metrics: AdaptiveMetrics) {
  const topicMastery = calculateTopicMastery(metrics);
  const optimalDifficulty = determineOptimalDifficulty(metrics);
  
  const prompt = `Based on the following adaptive learning metrics:
- Topic Mastery: ${JSON.stringify(topicMastery)}
- Optimal Difficulty: ${optimalDifficulty}
- Learning Style: ${JSON.stringify(metrics.learning_style)}
- Recent Performance: ${metrics.question_history.slice(-5).map(q => 
    `${q.topic} (${q.difficulty}): ${q.is_correct ? 'Correct' : 'Incorrect'}`
  ).join(', ')}

Generate a personalized learning path that:
1. Prioritizes topics with mastery below 70%
2. Adjusts difficulty based on recent performance
3. Maintains engagement through topic variety
4. Includes specific practice recommendations
5. Sets realistic daily goals
6. Provides estimated time commitments`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an adaptive learning AI advisor." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error generating adaptive learning path:', error);
    throw error;
  }
} 