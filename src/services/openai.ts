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

export const throttledCompletion = throttle(async (messages: any[]) => {
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

// Add these helper functions at the top
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && error instanceof Error) {
      await wait(RETRY_DELAY * (MAX_RETRIES - retries + 1));
      return retryWithBackoff(operation, retries - 1);
    }
    throw error;
  }
};

// Update the exam generation function to match task generation pattern
export const generateExamQuestions = async (config: ExamConfig): Promise<Question[]> => {
  return handleOpenAIRequest(async () => {
    const { sections } = config;
    const questionsPerSection = Math.ceil(20 / sections.length);
    const allQuestions: Question[] = [];

    for (const section of sections) {
      const prompt = createExamPrompt({
        ...config,
        currentSection: section,
        questionsNeeded: questionsPerSection,
        currentTopics: config.topics
      });

      const completion = await throttledCompletion([
        { role: "system", content: createSystemPrompt(config) },
        { role: "user", content: prompt }
      ]);

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No content generated');
      }

      const sectionQuestions = parseQuestions(completion.choices[0].message.content, config);
      allQuestions.push(...sectionQuestions.map(q => ({
        ...q,
        type: section,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })));
    }

    return allQuestions;
  }, 'exam generation');
};

// Update the exam prompt to match task prompt structure
function createExamPrompt(config: ExamConfig & { 
  currentSection: string;
  questionsNeeded: number;
  currentTopics: string[];
}): string {
  const { currentSection, questionsNeeded, currentTopics, type } = config;

  return `Generate ${questionsNeeded} questions for the ${type} exam ${currentSection} section.
Topics to cover: ${currentTopics.join(', ')}

Format each question EXACTLY as follows:
---START QUESTION---
TEXT: [Question text]
TYPE: ${currentSection}
TOPIC: [one of: ${currentTopics.join(', ')}]
DIFFICULTY: [easy/medium/hard]
ANSWER: [correct answer]
SOLUTION: [detailed solution steps]
${currentSection === 'Multiple Choice' ? 'OPTIONS: ["A) option1", "B) option2", "C) option3", "D) option4"]' : ''}
---END QUESTION---

Requirements:
1. Each question must be properly formatted and complete
2. Include detailed solutions and explanations
3. Follow ${type} exam standards for ${currentSection}
4. Use LaTeX math notation with \\( \\) for inline math and \\[ \\] for display math
5. Ensure questions are appropriate for ${type} exam level`;
}

// Update the system prompt to be more specific
function createSystemPrompt(config: ExamConfig): string {
  return `You are an expert exam creator specializing in ${config.type} exams.

Your task is to generate high-quality exam questions that:
1. Match the exact format specified
2. Are clear and unambiguous
3. Have complete solutions and explanations
4. Are appropriate for ${config.type} exam level
5. Use proper mathematical notation when needed

Use LaTeX format for mathematical expressions:
- Inline math: \\(x^2 + y^2\\)
- Display math: \\[\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\]

Follow the exact question format provided in the prompt.`;
}

// Add helper functions
function createSectionPrompt(section: string, config: ExamConfig & { count: number }): string {
  const examConfig = {
    ...config,
    currentSection: section,
    questionsNeeded: config.count,
    currentTopics: config.topics
  };
  
  const basePrompt = createExamPrompt(examConfig);
  return `${basePrompt}

Generate ${config.count} questions specifically for the ${section} section.`;
}

function getSectionSpecificRequirements(section: string, examType: string): string {
  const requirements: Record<string, Record<string, string>> = {
    'IELTS': {
      'Reading': '- Include passage comprehension questions\n- Vary question types (multiple choice, gap fill, etc.)',
      'Writing': '- Provide clear task descriptions\n- Include word count requirements',
      'Listening': '- Structure questions following the 4-section format\n- Include audio script references',
      'Speaking': '- Create detailed cue cards\n- Include follow-up discussion topics'
    },
    'SAT': {
      'Math': '- Include both calculator and no-calculator questions\n- Cover various math concepts',
      'Reading': '- Use evidence-based questions\n- Include complex passages',
      'Writing': '- Focus on grammar and expression\n- Include rhetorical skills questions'
    }
    // Add more exam types and sections as needed
  };

  return requirements[examType]?.[section] || 
    '- Maintain consistent difficulty level\n- Include clear marking criteria';
}

function isTopicValidForSection(topic: string, section: string): boolean {
  // Add logic to determine if a topic is valid for a section
  // This could be based on a predefined mapping or rules
  return true; // Simplified for now
}

function balanceQuestionDifficulty(
  questions: Question[], 
  distribution: ExamConfig['difficultyDistribution']
) {
  if (!distribution) return;

  const total = questions.length;
  const targetCounts = {
    easy: Math.round((distribution.easy / 100) * total),
    medium: Math.round((distribution.medium / 100) * total),
    hard: Math.round((distribution.hard / 100) * total)
  };

  // Adjust questions to match target distribution
  const currentCounts = questions.reduce((acc, q) => {
    acc[q.difficulty as keyof typeof acc] = (acc[q.difficulty as keyof typeof acc] || 0) + 1;
    return acc;
  }, { easy: 0, medium: 0, hard: 0 });

  // Adjust difficulties to match target distribution
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    while (currentCounts[difficulty] > targetCounts[difficulty]) {
      const questionToAdjust = questions.find(q => q.difficulty === difficulty);
      if (questionToAdjust) {
        const newDifficulty = findNextBestDifficulty(currentCounts, targetCounts);
        if (newDifficulty) {
          questionToAdjust.difficulty = newDifficulty;
          currentCounts[difficulty]--;
          currentCounts[newDifficulty]++;
        }
      }
    }
  }
}

function findNextBestDifficulty(
  current: Record<string, number>,
  target: Record<string, number>
): 'easy' | 'medium' | 'hard' | null {
  const differences = Object.entries(target).map(([diff, count]) => ({
    difficulty: diff,
    difference: count - (current[diff] || 0)
  }));

  const bestMatch = differences
    .filter(d => d.difference > 0)
    .sort((a, b) => b.difference - a.difference)[0];

  return bestMatch ? bestMatch.difficulty as 'easy' | 'medium' | 'hard' : null;
}

const getTypeSpecificPrompt = (type: string, subject?: string): string => {
  const basePrompts: Record<string, string> = {
    'Multiple Choice': `
Format requirements:
1. Question Structure:
   - Start with a clear stem that poses a specific problem or question
   - All necessary information must be in the stem
   - MUST end with the following format:
     [question text] Choose the correct answer:
     
     A) [first option]
     B) [second option]
     C) [third option]
     D) [fourth option]

2. Options Format:
   - MUST use this exact format for OPTIONS field: OPTIONS: ["A) option", "B) option", "C) option", "D) option"]
   - Options in TEXT and OPTIONS must match exactly
   - All options must be:
     * Similar in length
     * Grammatically parallel
     * Mutually exclusive
     * Plausible but only one correct
   - Order options logically (e.g., numerical order, chronological)
   - Avoid "All/None of the above"

3. Answer Format:
   - MUST be exactly "A", "B", "C", or "D" (single letter)
   - Correct answer should be randomly distributed
   - Include brief explanation of why correct

4. Solution Format:
   - Start with correct answer explanation
   - Explain why each distractor is wrong
   - Reference specific concepts/principles
   - Keep explanations concise but clear

Example:
TEXT: What is the time complexity for searching an element in a binary search tree? Choose the correct answer:

A) O(n)
B) O(log n)
C) O(1)
D) O(n²)

OPTIONS: ["A) O(n)", "B) O(log n)", "C) O(1)", "D) O(n²)"]
ANSWER: B
SOLUTION: O(log n) (B) is correct as binary search tree halves the search space in each step. O(n) (A) is for linear search, O(1) (C) is for hash tables, and O(n²) (D) is incorrect as BST operations never require quadratic time.`,

    'Problem Solving': `
Format requirements:
- Start with clear problem statement
- List all given information and constraints
- Break solution into numbered steps
- Include all intermediate calculations
- Show mathematical reasoning at each step
- Highlight key decision points
- Provide final answer in clear format
- Include units where applicable
- Add verification steps or checks`,

    'Short Answer': `
Format requirements:
1. Question Structure:
   - Focused question requiring specific points
   - Clear scope of expected answer

2. Evaluation Criteria (MUST include in ANSWER field as JSON):
   {
     "requiredPoints": [
       {"point": "Key concept definition", "weight": 30},
       {"point": "Example/application", "weight": 40},
       {"point": "Explanation", "weight": 30}
     ],
     "minWordCount": 50,
     "maxWordCount": 100
   }

3. Solution Format:
   - Model answer
   - Point-by-point breakdown
   - Key terminology required`,

    'Essay': `
Format requirements:
1. Question Structure:
   - Clear writing prompt
   - Specific topic/focus
   - Required word count range
   - List of required elements

2. Evaluation Criteria (MUST include in ANSWER field as JSON):
   {
     "requiredPoints": [
       {"point": "Main argument/thesis", "weight": 25},
       {"point": "Supporting evidence", "weight": 20},
       {"point": "Analysis/reasoning", "weight": 20},
       {"point": "Structure/organization", "weight": 15},
       {"point": "Writing mechanics", "weight": 10},
       {"point": "Conclusion", "weight": 10}
     ],
     "minWordCount": 300,
     "maxWordCount": 500
   }

3. Solution Format:
   - Model essay example
   - Point-by-point explanation
   - Common pitfalls to avoid

Example:
TEXT: Analyze the impact of social media on modern communication. Include specific examples and research evidence. (400-500 words)
ANSWER: {
  "requiredPoints": [
    {"point": "Definition of social media impact", "weight": 20},
    {"point": "Positive effects with examples", "weight": 20},
    {"point": "Negative effects with examples", "weight": 20},
    {"point": "Research evidence citation", "weight": 20},
    {"point": "Balanced conclusion", "weight": 20}
  ],
  "minWordCount": 400,
  "maxWordCount": 500
}`,

    'True/False': `
Format requirements:
- Statement must be unambiguously true or false
- Avoid double negatives
- Focus on single concept per statement
- Include detailed explanation for correct answer
- Explain common misconceptions
- ANSWER must start with "True" or "False" followed by justification
- Ensure no partial truth scenarios`,

    'Fill in the Blank': `
Format requirements:
- Use ___ for each blank (consistent length)
- Context should make answer unambiguous
- Each blank should test specific knowledge
- Provide grammatical hints if appropriate
- List all acceptable variations of answers
- Include unit requirements if applicable
- Specify if exact wording is required`,

    'Matching': `
Format requirements:
- Create two clearly labeled columns
- Minimum 4, maximum 8 pairs
- Each item should have only one correct match
- Group related concepts
- Include clear matching instructions
- Specify if items can be used multiple times
- Format both columns consistently`,

    'Coding': `
Format requirements:
- Specify programming language
- Provide clear problem description
- List all input/output requirements
- Include example test cases
- Specify time/space complexity requirements
- List any constraints or limitations
- Provide function/method signature
- Include edge cases to handle
- Specify error handling requirements`,

    'Debugging': `
Format requirements:
- Provide code with specific bugs
- Describe expected vs actual behavior
- Include error messages if applicable
- Specify debugging environment
- List required fixes
- Include common debugging steps
- Explain why the bug occurs
- Show corrected code version`,

    'Case Study': `
Format requirements:
- Present detailed scenario with context
- Include relevant background information
- Pose specific analysis questions
- Provide necessary data/metrics
- List required analysis frameworks
- Include multiple aspects to consider
- Specify deliverables format
- Add decision points to address`,

    'Diagram Analysis': `
Format requirements:
- Describe diagram clearly and completely
- List specific elements to identify
- Include measurement/scale information
- Specify required annotations
- List relationships to analyze
- Include step-by-step analysis guide
- Specify required conclusions
- Add interpretation guidelines`,

    'Data Analysis': `
Format requirements:
- Provide structured dataset or description
- List specific analysis tasks
- Include required statistical methods
- Specify visualization requirements
- Define success criteria
- Include data cleaning steps
- Specify required insights
- Add interpretation guidelines`,

    'Theory': `
Format requirements:
- Focus on specific theoretical concept
- Include historical context if relevant
- List key principles to explain
- Require practical applications
- Include supporting evidence
- Address common misconceptions
- Specify required depth of explanation
- Link to related theories`,

    'Practical': `
Format requirements:
- List required materials/tools
- Provide step-by-step procedure
- Include safety considerations
- Specify expected outcomes
- List common mistakes to avoid
- Include troubleshooting guide
- Specify success criteria
- Add documentation requirements`
  };

  // Subject-specific requirements for each task type
  const subjectSpecificPrompts: Record<string, Record<string, string>> = {
    'Mathematics': {
      'Multiple Choice': `
Additional requirements:
- Include numerical calculations
- At least one option should be a common mathematical misconception
- Include units where applicable
- Show intermediate calculation steps in solution`,

      'Problem Solving': `
Additional requirements:
- Include relevant formulas
- Show step-by-step mathematical reasoning
- Include diagram or visual aid when helpful
- Specify units and significant figures`,

      'Short Answer': `
Additional requirements:
- Ask for specific mathematical terms or definitions
- Include numerical examples where applicable
- Require mathematical reasoning explanation`,
    },

    'Computer Science': {
      'Multiple Choice': `
Additional requirements:
- Include code snippets where relevant
- Test understanding of programming concepts
- Include common programming pitfalls as distractors`,

      'Coding': `
Additional requirements:
- Specify programming language
- Include input/output format
- Define time/space complexity requirements
- Add edge cases and test cases`,

      'Debugging': `
Additional requirements:
- Use real programming language syntax
- Include common programming errors
- Specify expected vs actual output
- Test debugging methodology`,

      'Problem Solving': `
Additional requirements:
- Focus on algorithmic thinking
- Include pseudocode where appropriate
- Consider efficiency and optimization
- Break down complex problems`,
    },

    'Physics': {
      'Multiple Choice': `
Additional requirements:
- Include unit conversion challenges
- Use physics formulas and constants
- Include conceptual understanding questions
- Add diagram-based questions`,

      'Problem Solving': `
Additional requirements:
- Include free body diagrams where applicable
- Show vector components
- Use standard physics notation
- Include real-world applications`,
    },

    'Chemistry': {
      'Multiple Choice': `
Additional requirements:
- Include chemical equations
- Use molecular structures
- Test periodic table knowledge
- Include reaction mechanisms`,

      'Problem Solving': `
Additional requirements:
- Balance chemical equations
- Show stoichiometric calculations
- Include molecular drawings
- Use chemical nomenclature`,
    },

    'Biology': {
      'Multiple Choice': `
Additional requirements:
- Include diagram labeling
- Test process sequences
- Use biological terminology
- Include classification questions`,

      'Case Study': `
Additional requirements:
- Use real biological scenarios
- Include experimental data
- Test scientific method understanding
- Incorporate current research`,
    },

    'English': {
      'Essay': `
Additional requirements:
- Include writing prompts
- Specify essay structure
- Define evaluation criteria
- Include example thesis statements`,

      'Short Answer': `
Additional requirements:
- Focus on grammar rules
- Include literary analysis
- Test reading comprehension
- Use proper citation formats`,
    },

    'History': {
      'Essay': `
Additional requirements:
- Include primary source analysis
- Test chronological understanding
- Require historical evidence
- Include historiographical debate`,

      'Case Study': `
Additional requirements:
- Use historical documents
- Include multiple perspectives
- Test cause-and-effect relationships
- Incorporate historical context`,
    }
  };

  // Get base prompt
  let prompt = basePrompts[type] || '';

  // Add subject-specific requirements if available
  if (subject && subjectSpecificPrompts[subject]?.[type]) {
    prompt += '\n\n' + subjectSpecificPrompts[subject][type];
  }

  return prompt;
};

function createTaskPrompt(config: TaskConfig): string {
  // Update to include subject in getTypeSpecificPrompt
  const typeSpecificPrompt = getTypeSpecificPrompt(config.type, config.subject);

  return `Generate ${config.count} ${config.difficulty} level ${config.type} tasks for ${config.topics.join(', ')}.

Format each task as follows:
---START TASK---
TYPE: ${config.type}
DIFFICULTY: ${config.difficulty}
TOPIC: [one of: ${config.topics.join(', ')}]
TEXT: [task text]
${config.type === 'Multiple Choice' ? 'OPTIONS: ["A) option1", "B) option2", "C) option3", "D) option4"]' : ''}
ANSWER: [expected answer]
SOLUTION: [detailed solution steps]
EXPLANATION: [explanation of the solution approach]
---END TASK---

${typeSpecificPrompt}

General Requirements:
1. Ensure each task has all required fields
2. SOLUTION must provide a complete step-by-step solution
3. ANSWER should be concise and direct
4. Use LaTeX math notation with \\( \\) for inline math and \\[ \\] for display math
5. Ensure difficulty level matches ${config.difficulty} requirements
6. Make tasks relevant to ${config.subject || 'the subject'}
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

// Add export keyword to the generateTasks function
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
