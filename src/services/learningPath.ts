import { openai } from './openai';
import type { PerformanceMetrics } from '../types/analytics';

export async function generatePersonalizedPath(metrics: PerformanceMetrics) {
  const prompt = `Based on the following performance metrics:
- Overall Score: ${metrics.overall_score}
- Weak Areas: ${metrics.weak_areas.join(', ')}
- Strong Areas: ${metrics.strong_areas.join(', ')}

Generate a personalized learning path that:
1. Focuses on improving weak areas
2. Maintains proficiency in strong areas
3. Gradually increases difficulty
4. Includes specific topic recommendations`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an educational AI advisor." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error generating learning path:', error);
    throw error;
  }
} 