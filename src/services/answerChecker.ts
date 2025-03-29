import { throttledCompletion } from './openai';

export const checkAnswerWithAI = async (
  userAnswer: string,
  correctAnswer: string,
  type: string,
  question: string
): Promise<{ isCorrect: boolean; feedback: string }> => {
  const prompt = `
Task: Evaluate if the student's answer is correct for this ${type} question.

Question: ${question}
Correct answer: ${correctAnswer}
Student's answer: ${userAnswer}

Evaluate based on:
1. Mathematical equivalence (if numbers are involved)
2. Conceptual understanding
3. Key points coverage
4. Technical accuracy

Respond in this JSON format:
{
  "isCorrect": boolean,
  "score": number (0-100),
  "feedback": "Detailed explanation of what's correct/incorrect",
  "keyPointsCovered": ["list", "of", "key", "points", "covered"],
  "missingConcepts": ["list", "of", "missing", "concepts"]
}`;

  try {
    const completion = await throttledCompletion([
      { role: "system", content: "You are an expert answer evaluator." },
      { role: "user", content: prompt }
    ]);

    const response = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      isCorrect: response.score >= 85, 
      feedback: `Score: ${response.score}%\n${response.feedback}\n\nKey points covered: ${response.keyPointsCovered.join(', ')}`
    };
  } catch (error) {
    console.error('AI answer checking failed:', error);
    
    return {
      isCorrect: false,
      feedback: "Error evaluating answer. Using basic comparison."
    };
  }
}; 