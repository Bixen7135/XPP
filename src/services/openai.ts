import OpenAI from 'openai';
import type { ExamConfig, TaskConfig, Question } from '../types/exam';
import pThrottle from 'p-throttle';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const throttle = pThrottle({
  limit: 5,
  interval: 60000
});

const throttledCompletion = throttle(async (messages: any[]) => {
  return await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
  });
});

export { openai };

// Add error types
interface OpenAIError {
  message: string;
  code?: string;
  details?: any;
}

// Add error handling wrapper
async function handleOpenAIRequest<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`OpenAI ${errorContext} error:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Error in ${errorContext}: ${message}`);
  }
}

export const generateExamQuestions = async (config: ExamConfig): Promise<Question[]> => {
  const systemPrompt = createSystemPrompt(config);
  const userPrompt = createExamPrompt(config);
  
  try {
    const completion = await throttledCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No response from OpenAI');

    return parseQuestions(response, config);
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    console.error('Error generating exam questions:', error);
    throw error;
  }
};

export const generateTasks = async (config: TaskConfig): Promise<Question[]> => {
  return handleOpenAIRequest(async () => {
    const prompt = createTaskPrompt(config);
    const completion = await throttledCompletion([
      { role: "system", content: "You are a professional task generator." },
      { role: "user", content: prompt }
    ]);
    
    if (!completion.choices[0]?.message?.content) {
      throw new Error('No content generated');
    }

    return parseQuestions(completion.choices[0].message.content, config);
  }, 'task generation');
};

function createSystemPrompt(config: ExamConfig | TaskConfig): string {
  const examTypePrompts: Record<string, string> = {
    'IELTS': `You are an expert IELTS examiner with deep knowledge of English language assessment.
Format requirements:
- Reading: Include authentic texts with varied question types (multiple choice, matching, completion)
- Writing: Provide clear task descriptions for both Task 1 and Task 2
- Listening: Structure questions following the 4-section IELTS format
- Speaking: Create detailed cue cards and discussion topics for all 3 parts
Use official IELTS band descriptors and marking criteria`,

    'SAT': `You are an experienced SAT test creator specializing in standardized college admission testing.
Format requirements:
- Math: Include both calculator and no-calculator questions
- Reading: Use evidence-based questions with complex passages
- Writing: Focus on grammar, expression, and rhetorical skills
- Essay: Provide source text and clear analytical prompts
Follow official College Board guidelines and scoring rubrics`,

    'CIE': `You are a Cambridge International Examinations expert with extensive knowledge of international curricula.
Format requirements:
- Structure questions according to CAIE assessment objectives
- Include both structured and unstructured questions
- Provide mark schemes with detailed allocation
- Follow subject-specific command terms
Align with Cambridge International AS & A Level standards`,

    'UNT': `You are a specialist in Kazakhstan's Unified National Testing system.
Format requirements:
- Follow the official UNT format for each subject
- Include context-based questions in Kazakh/Russian
- Create questions that test both knowledge and application
- Ensure cultural relevance and appropriateness
Match the current UNT specification and difficulty levels`
  };

  const basePrompt = `${examTypePrompts[config.type] || 'You are an expert exam creator.'}

Each question MUST include:
1. Clear question text
2. Specific section and topic
3. Detailed marking scheme
4. Model answer or solution
5. Common misconceptions or pitfalls`;

  if ('difficultyDistribution' in config) {
    // ExamConfig case
    return `${basePrompt}

Difficulty distribution:
- Easy: ${config.difficultyDistribution?.easy || 30}%
- Medium: ${config.difficultyDistribution?.medium || 40}%
- Hard: ${config.difficultyDistribution?.hard || 30}%`;
  }

  // TaskConfig case
  return basePrompt;
}

function createExamPrompt(config: ExamConfig): string {
  const examTypeFormats: Record<string, string> = {
    'IELTS': `Format each question EXACTLY as:
---START QUESTION---
SECTION: [Reading/Writing/Listening/Speaking]
BAND_RANGE: [0-9]
SKILL: [Specific skill being tested]
TEXT: [Reading passage or listening script if applicable]
QUESTION: [Clear question text]
ANSWER: [Model answer or acceptable responses]
MARKING_CRITERIA: [Band descriptors and scoring guide]
---END QUESTION---`,

    'SAT': `Format each question EXACTLY as:
---START QUESTION---
SECTION: [Math/Reading/Writing/Essay]
DIFFICULTY: [easy/medium/hard]
SKILL: [Specific skill being tested]
STIMULUS: [Passage/Graph/Figure if applicable]
QUESTION: [Question text]
OPTIONS: [Multiple choice options if applicable]
CORRECT_ANSWER: [Answer with explanation]
POINTS: [Score value]
---END QUESTION---`,

    'CIE': `Format each question EXACTLY as:
---START QUESTION---
PAPER: [Paper number]
MARKS: [Total marks]
TOPIC: [Syllabus topic]
COMMAND_TERM: [Describe/Explain/Analyse etc.]
QUESTION: [Question text]
MARK_SCHEME: [Detailed marking scheme]
EXAMINER_NOTES: [Additional guidance]
---END QUESTION---`,

    'UNT': `Format each question EXACTLY as:
---START QUESTION---
SUBJECT: [Subject name]
TOPIC: [Specific topic]
COMPLEXITY: [1-3]
QUESTION_KZ: [Question in Kazakh]
QUESTION_RU: [Question in Russian]
OPTIONS: [5 options as per UNT format]
CORRECT_ANSWER: [Correct option with explanation]
---END QUESTION---`
  };

  return `Generate questions for sections: ${config.sections.join(', ')}
Topics to cover: ${config.topics.join(', ')}

${examTypeFormats[config.type] || `Format each question as:
---START QUESTION---
SECTION: [Section name]
DIFFICULTY: [easy/medium/hard]
TOPIC: [Specific topic]
QUESTION: [Question text]
ANSWER: [Correct answer]
EXPLANATION: [Detailed explanation]
---END QUESTION---`}

Requirements:
1. Follow exact format for ${config.type} exam
2. Include all required components for each section
3. Maintain consistent difficulty progression
4. Provide detailed solutions and marking criteria
5. Use appropriate language and terminology`;
}

function createTaskPrompt(config: TaskConfig): string {
  return `Generate ${config.count} ${config.difficulty} level tasks for ${config.topics.join(', ')}.

Format each task as follows:
---START TASK---
TYPE: ${config.type}
DIFFICULTY: ${config.difficulty}
TOPIC: [one of: ${config.topics.join(', ')}]
TEXT: [task text]
ANSWER: [expected answer]
SOLUTION: [detailed solution steps]
EXPLANATION: [explanation of the solution approach]
---END TASK---

Requirements:
1. Ensure each task has all required fields
2. SOLUTION must provide a complete step-by-step solution
3. ANSWER should be concise and direct
4. Use LaTeX math notation with \\( \\) for inline math and \\[ \\] for display math
`;
}

function parseQuestions(response: string, config: ExamConfig | TaskConfig): Question[] {
  try {
    const isExam = 'questionsPerSection' in config;
    const delimiter = isExam ? /---START QUESTION---|---END QUESTION---/ : /---START TASK---|---END TASK---/;
    
    const items = response.split(delimiter).filter(item => item.trim());
    
    return items.map((content, index) => {
      // Improved field parsing to handle multiline values
      const fields: Record<string, string> = {};
      const lines = content.split('\n');
      let currentField = '';
      let currentValue: string[] = [];

      for (const line of lines) {
        const match = line.match(/^([A-Z_]+):\s*(.*)$/);
        if (match) {
          // Save previous field if exists
          if (currentField && currentValue.length > 0) {
            fields[currentField] = currentValue.join('\n').trim();
          }
          // Start new field
          currentField = match[1];
          currentValue = [match[2]];
        } else if (currentField && line.trim()) {
          // Continue previous field
          currentValue.push(line.trim());
        }
      }
      // Save last field
      if (currentField && currentValue.length > 0) {
        fields[currentField] = currentValue.join('\n').trim();
      }

      if (!isExam) {
        // For tasks, ensure all required fields are present
        const requiredFields = ['TYPE', 'DIFFICULTY', 'TOPIC', 'TEXT', 'ANSWER', 'SOLUTION'];
        for (const field of requiredFields) {
          if (!fields[field]) {
            console.error(`Missing field ${field} in task:`, content);
            throw new Error(`Missing required field ${field} in task ${index + 1}`);
          }
        }

        // Make topic validation case-insensitive and trim whitespace
        const normalizedTopics = config.topics.map(t => t.toLowerCase().trim());
        const taskTopic = fields['TOPIC'].toLowerCase().trim();
        if (!normalizedTopics.includes(taskTopic)) {
          // If topic doesn't match exactly, try to find the closest match
          const matchingTopic = config.topics.find(t => 
            t.toLowerCase().includes(taskTopic) || taskTopic.includes(t.toLowerCase())
          );
          if (matchingTopic) {
            fields['TOPIC'] = matchingTopic; // Use the properly cased topic
          } else {
            throw new Error(`Invalid topic in task ${index + 1}`);
          }
        }

        return {
          id: `${Date.now()}-${index}`,
          text: fields['TEXT'],
          type: fields['TYPE'],
          topic: fields['TOPIC'],
          difficulty: fields['DIFFICULTY'].toLowerCase(),
          correctAnswer: fields['SOLUTION'],  // Use SOLUTION for correctAnswer
          explanation: fields['EXPLANATION'] || null,
          context: fields['CONTEXT'] || null,
          answer: fields['ANSWER'] || null,
          instructions: fields['INSTRUCTIONS'] || null,
          learningOutcome: fields['LEARNING_OUTCOME'] || null
        };
      } else {
        // Handle exam-specific formats
        const examType = (config as ExamConfig).type;
        switch (examType) {
          case 'IELTS':
            return {
              id: `${Date.now()}-${index}`,
              text: fields['QUESTION'] || '',
              type: fields['SECTION'] || '',
              topic: fields['SKILL'] || '',
              difficulty: fields['BAND_RANGE'] ? `Band ${fields['BAND_RANGE']}` : 'medium',
              correctAnswer: fields['ANSWER'] || null,
              explanation: fields['MARKING_CRITERIA'] || null,
              context: fields['TEXT'] || null
            };

          case 'SAT':
            return {
              id: `${Date.now()}-${index}`,
              text: fields['QUESTION'] || '',
              type: fields['SECTION'] || '',
              topic: fields['SKILL'] || '',
              difficulty: fields['DIFFICULTY'] || 'medium',
              correctAnswer: fields['CORRECT_ANSWER'] || null,
              explanation: null,
              context: fields['STIMULUS'] || null,
              answers: fields['OPTIONS'] ? JSON.parse(fields['OPTIONS']) : null
            };

          case 'CIE':
            return {
              id: `${Date.now()}-${index}`,
              text: fields['QUESTION'] || '',
              type: fields['PAPER'] || '',
              topic: fields['TOPIC'] || '',
              difficulty: `${fields['MARKS']} marks`,
              correctAnswer: fields['MARK_SCHEME'] || null,
              explanation: fields['EXAMINER_NOTES'] || null,
              instructions: fields['COMMAND_TERM'] || null
            };

          case 'UNT':
            return {
              id: `${Date.now()}-${index}`,
              text: fields['QUESTION_RU'] || '',
              type: fields['SUBJECT'] || '',
              topic: fields['TOPIC'] || '',
              difficulty: fields['COMPLEXITY'] ? `Level ${fields['COMPLEXITY']}` : 'medium',
              correctAnswer: fields['CORRECT_ANSWER'] || null,
              answers: fields['OPTIONS'] ? JSON.parse(fields['OPTIONS']) : null,
              context: fields['QUESTION_KZ'] || null // Store Kazakh version in context
            };

          default:
            return {
              id: `${Date.now()}-${index}`,
              text: fields['QUESTION'] || '',
              type: fields['SECTION'] || '',
              topic: fields['TOPIC'] || '',
              difficulty: fields['DIFFICULTY'] || 'medium',
              correctAnswer: fields['ANSWER'] || null,
              explanation: fields['EXPLANATION'] || null
            };
        }
      }
    });
  } catch (error) {
    console.error('Error parsing questions:', error);
    console.debug('Full response:', response);
    throw error;
  }
}
