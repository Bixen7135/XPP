import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import type { Question } from '../types/exam';
import { saveAs } from 'file-saver';

export interface DocumentOptions {
  includeSolutions: boolean;
  includeAnswers: boolean;
  includeAnswerSpaces?: boolean;
  includeInstructions?: boolean;
  includeContext?: boolean;
  includeLearningOutcomes?: boolean;
}

const formatMathText = (text: string): string => {
  // Remove LaTeX delimiters for plain text
  return text.replace(/\\\((.*?)\\\)/g, '$1')
            .replace(/\\\[(.*?)\\\]/g, '$1');
};

// Add task type configurations
const taskTypeConfigs: Record<string, {
  answerSpacing: number;  // Additional space in points/lines
  includeAnswerBox: boolean;  // Whether to include a box for answers
  answerFormat?: string;  // Special formatting instructions
}> = {
  'Essay': {
    answerSpacing: 100,
    includeAnswerBox: true,
    answerFormat: 'Write your essay here (minimum 300 words):'
  },
  'Short Answer': {
    answerSpacing: 40,
    includeAnswerBox: true,
    answerFormat: 'Answer:'
  },
  'Problem Solving': {
    answerSpacing: 60,
    includeAnswerBox: true,
    answerFormat: 'Show your work:'
  },
  'Coding': {
    answerSpacing: 80,
    includeAnswerBox: true,
    answerFormat: 'Write your code here:'
  },
  'Case Study': {
    answerSpacing: 80,
    includeAnswerBox: true,
    answerFormat: 'Analysis:'
  },
  'Data Analysis': {
    answerSpacing: 60,
    includeAnswerBox: true,
    answerFormat: 'Analysis and Findings:'
  },
  'Multiple Choice': {
    answerSpacing: 10,
    includeAnswerBox: false
  },
  'True/False': {
    answerSpacing: 10,
    includeAnswerBox: false
  },
  'Fill in the Blank': {
    answerSpacing: 20,
    includeAnswerBox: true
  },
  'Matching': {
    answerSpacing: 30,
    includeAnswerBox: true
  }
};

const generateAnswerSpace = (task: Question) => {
  switch (task.type) {
    case 'multiple-choice':
      return `
        □ A    □ B    □ C    □ D
      `;
    case 'short-answer':
      return `
        Answer: ________________________________
      `;
    case 'essay':
      // Create a larger space for essay responses
      return `
        
        
        
        
        
      `;
    case 'calculation':
      // Space for calculations and final answer
      return `
        Work space:
        
        
        
        
        Final answer: ________________________________
      `;
    case 'true-false':
      return `
        □ True    □ False
      `;
    case 'matching':
      // Generate matching spaces based on the options in the task
      // This is a simplified example
      return `
        Matching answers:
        
        1. ___    2. ___    3. ___    4. ___
      `;
    default:
      return `
        Answer: ________________________________
      `;
  }
};

export async function generatePDF(
  tasks: Question[], 
  options: DocumentOptions,
  title: string = 'Task Sheet'
): Promise<Blob> {
  const doc = new jsPDF();
  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxWidth = pageWidth - (margin * 2);

  const addWrappedText = (text: string, x: number, y: number, fontSize: number) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(formatMathText(text), maxWidth);
    
    if (y + (lines.length * fontSize / 2) > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    
    doc.text(lines, x, y);
    return y + (lines.length * fontSize / 2) + 5;
  };

  // Add title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // First section: Tasks only
  tasks.forEach((task, index) => {
    const typeConfig = taskTypeConfigs[task.type] || { answerSpacing: 20, includeAnswerBox: false };

    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    // Task number and text
    doc.setFont('helvetica', 'bold');
    y = addWrappedText(`${index + 1}. ${task.text}`, margin, y, 12);
    
    // Add context if enabled
    if (options.includeContext && task.context) {
      y += 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      const contextLines = doc.splitTextToSize(`Context: ${task.context}`, maxWidth);
      doc.text(contextLines, margin, y);
      y += (contextLines.length * 5) + 5;
    }
    
    // Add instructions if enabled
    if (options.includeInstructions && task.instructions) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      const instructionLines = doc.splitTextToSize(`Instructions: ${task.instructions}`, maxWidth);
      doc.text(instructionLines, margin, y);
      y += (instructionLines.length * 5) + 5;
    }
    
    // Add learning outcomes if enabled
    if (options.includeLearningOutcomes && task.learningOutcome) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      const outcomeLines = doc.splitTextToSize(`Learning Outcome: ${task.learningOutcome}`, maxWidth);
      doc.text(outcomeLines, margin, y);
      y += (outcomeLines.length * 5) + 5;
    }

    // Add answer space if needed
    if (options.includeAnswerSpaces) {
      // Add answer format instruction
      if (typeConfig.answerFormat) {
        doc.setFont('helvetica', 'italic');
        y = addWrappedText(typeConfig.answerFormat, margin, y + 5, 10);
      }

      // Draw answer box or lines based on task type
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      
      switch(task.type.toLowerCase()) {
        case 'multiple-choice':
          // Add multiple choice boxes without extra space
          const choices = ['A', 'B', 'C', 'D'];
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          
          for (let i = 0; i < choices.length; i++) {
            // Draw checkbox
            doc.rect(margin + (i * 40), y, 12, 12);
            // Add letter
            doc.text(choices[i], margin + 20 + (i * 40), y + 8);
          }
          y += 25; // Minimal space after options
          break;
          
        case 'true-false':
          // Add true/false boxes
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          
          // True checkbox
          doc.rect(margin, y, 12, 12);
          doc.text('True', margin + 20, y + 8);
          
          // False checkbox
          doc.rect(margin + 80, y, 12, 12);
          doc.text('False', margin + 100, y + 8);
          
          y += 25;
          break;
          
        case 'essay':
          // Create a large box for essay responses
          doc.rect(margin, y, maxWidth, 150);
          y += 160;
          break;
          
        case 'calculation':
          // Space for calculations with a box
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          doc.text('Work space:', margin, y);
          y += 10;
          
          // Work space box
          doc.rect(margin, y, maxWidth, 100);
          y += 110;
          
          // Final answer line
          doc.setFont('helvetica', 'normal');
          doc.text('Final answer:', margin, y);
          doc.line(margin + 60, y, pageWidth - margin, y);
          y += 20;
          break;
          
        case 'matching':
          // Generate matching boxes
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          
          for (let i = 1; i <= 4; i++) {
            doc.text(`${i}.`, margin + ((i-1) * 50), y);
            doc.rect(margin + 15 + ((i-1) * 50), y - 10, 25, 15);
          }
          
          y += 20;
          break;
          
        default:
          // For other types, create a standard answer box
          if (typeConfig.answerSpacing >= 60) {
            // Large answer box for longer answers
            doc.rect(margin, y, maxWidth, typeConfig.answerSpacing);
            y += typeConfig.answerSpacing + 10;
          } else {
            // Answer line for shorter answers
            doc.text('Answer:', margin, y);
            doc.line(margin + 40, y, pageWidth - margin, y);
            
            // Add a few more lines for multi-line answers
            for (let i = 1; i < 3; i++) {
              doc.line(margin, y + (i * 15), pageWidth - margin, y + (i * 15));
            }
            
            y += 50;
          }
      }
    } else {
      // Add the generated answer space based on task type
      const answerSpace = generateAnswerSpace(task);
      y = addWrappedText(answerSpace, margin, y, 10);
    }

    y += 10;
  });

  // Second section: Solutions and answers (if enabled)
  if (options.includeSolutions || options.includeAnswers) {
    // Add a page break before solutions section
    doc.addPage();
    y = margin;
    
    // Add solutions header
    doc.setFont('helvetica', 'bold');
    y = addWrappedText("Solutions and Answers", pageWidth / 2, y, 16);
    doc.setTextColor(0, 0, 0);
    y += 10;

    tasks.forEach((task, index) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      // Task reference
      doc.setFont('helvetica', 'bold');
      y = addWrappedText(`Task ${index + 1}:`, margin, y, 12);
      doc.setFont('helvetica', 'normal');
      y = addWrappedText(task.text.substring(0, 100) + (task.text.length > 100 ? '...' : ''), margin + 5, y, 10);

      // Solutions if enabled
      if (options.includeSolutions && task.correctAnswer) {
        doc.setFont('helvetica', 'bold');
        y = addWrappedText('Solution:', margin, y, 10);
        doc.setFont('helvetica', 'normal');
        
        // For multiple choice, just show the correct option letter
        if (task.type.toLowerCase() === 'multiple-choice') {
          y = addWrappedText(`Correct option: ${task.correctAnswer}`, margin + 5, y, 10);
        } else {
          y = addWrappedText(task.correctAnswer, margin + 5, y, 10);
        }
      }

      // Answers if enabled
      if (options.includeAnswers && task.answer) {
        doc.setFont('helvetica', 'bold');
        y = addWrappedText('Answer:', margin, y, 10);
        doc.setFont('helvetica', 'normal');
        y = addWrappedText(task.answer, margin + 5, y, 10);
      }

      y += 10;
    });
  }

  return doc.output('blob');
}

export async function generateDOCX(tasks: Question[], options: DocumentOptions): Promise<Blob> {
  // Create task section paragraphs
  const taskParagraphs = [
    new Paragraph({
      text: "Task Sheet",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    ...tasks.flatMap((task, index) => {
      const typeConfig = taskTypeConfigs[task.type] || { answerSpacing: 20, includeAnswerBox: false };
      
      const paragraphs = [
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${formatMathText(task.text)}`,
              size: 24,
              bold: true,
            }),
          ],
          spacing: { before: 240, after: 120 },
        }),
      ];
      
      // Add instructions if enabled
      if (options.includeInstructions && task.instructions) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Instructions: ${formatMathText(task.instructions)}`,
                size: 20,
                italics: true,
              }),
            ],
            spacing: { before: 120, after: 120 },
          })
        );
      }
      
      // Add task metadata
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Type: ${task.type} | Topic: ${task.topic} | Difficulty: ${task.difficulty}`,
              size: 20,
              color: "666666",
            }),
          ],
          spacing: { before: 120, after: 120 },
        })
      );
      
      // Add answer space based on task type
      if (options.includeAnswerSpaces) {
        // Different answer formats based on task type
        switch(task.type.toLowerCase()) {
          case 'multiple-choice':
            // Add multiple choice options with minimal space
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Select one option:",
                    size: 20,
                    italics: true,
                  }),
                ],
                spacing: { before: 120, after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "□ A    □ B    □ C    □ D", size: 20 }),
                ],
                spacing: { before: 60, after: 120 }, // Reduced spacing after options
              })
            );
            break;
            
          case 'true-false':
            // Add true/false options
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Select one:",
                    size: 20,
                    italics: true,
                  }),
                ],
                spacing: { before: 120, after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "□ True    □ False", size: 20 }),
                ],
                spacing: { before: 60, after: 240 },
              })
            );
            break;
            
          case 'matching':
            // Add matching answer space
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Match the following:",
                    size: 20,
                    italics: true,
                  }),
                ],
                spacing: { before: 120, after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "1. _____    2. _____    3. _____    4. _____", size: 20 }),
                ],
                spacing: { before: 60, after: 240 },
              })
            );
            break;
            
          case 'essay':
            // Add essay answer space with a border
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Write your essay below:",
                    size: 20,
                    italics: true,
                  }),
                ],
                spacing: { before: 120, after: 60 },
                border: {
                  top: { style: 'single', size: 1, color: 'CCCCCC' },
                  bottom: { style: 'none', size: 0 },
                  left: { style: 'single', size: 1, color: 'CCCCCC' },
                  right: { style: 'single', size: 1, color: 'CCCCCC' },
                }
              }),
              // Add several empty paragraphs for writing space with borders
              ...Array(9).fill(0).map((_, i) => 
                new Paragraph({
                  children: [new TextRun({ text: "", size: 20 })],
                  spacing: { before: 240, after: 240 },
                  border: {
                    top: { style: 'none', size: 0 },
                    bottom: { style: i === 8 ? 'single' : 'none', size: 1, color: 'CCCCCC' },
                    left: { style: 'single', size: 1, color: 'CCCCCC' },
                    right: { style: 'single', size: 1, color: 'CCCCCC' },
                  }
                })
              )
            );
            break;
            
          case 'calculation':
            // Add calculation work space with borders
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Work space for calculations:",
                    size: 20,
                    italics: true,
                  }),
                ],
                spacing: { before: 120, after: 60 },
                border: {
                  top: { style: 'single', size: 1, color: 'CCCCCC' },
                  bottom: { style: 'none', size: 0 },
                  left: { style: 'single', size: 1, color: 'CCCCCC' },
                  right: { style: 'single', size: 1, color: 'CCCCCC' },
                }
              }),
              // Add several empty paragraphs for calculations with borders
              ...Array(4).fill(0).map((_, i) => 
                new Paragraph({
                  children: [new TextRun({ text: "", size: 20 })],
                  spacing: { before: 120, after: 120 },
                  border: {
                    top: { style: 'none', size: 0 },
                    bottom: { style: i === 3 ? 'single' : 'none', size: 1, color: 'CCCCCC' },
                    left: { style: 'single', size: 1, color: 'CCCCCC' },
                    right: { style: 'single', size: 1, color: 'CCCCCC' },
                  }
                })
              ),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Final answer: ",
                    size: 20,
                    bold: true,
                  }),
                  new TextRun({
                    text: "_______________________________",
                    size: 20,
                  }),
                ],
                spacing: { before: 120, after: 240 },
              })
            );
            break;
            
          default:
            // Default answer space for other types
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: typeConfig.answerFormat || 'Answer:',
                    size: 20,
                    italics: true,
                  }),
                ],
                spacing: { before: 120, after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "________________________________", size: 20 }),
                ],
                spacing: { before: 60, after: typeConfig.answerSpacing * 20 },
              })
            );
        }
      }
      
      return paragraphs;
    }),
  ];
  
  // Create solutions section paragraphs if needed
  const solutionParagraphs = [];
  
  if (options.includeSolutions || options.includeAnswers) {
    // Add page break before solutions
    solutionParagraphs.push(new Paragraph({ children: [new PageBreak()] }));
    
    // Add solutions header
    solutionParagraphs.push(
      new Paragraph({
        text: "Solutions and Answers",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
      })
    );
    
    // Add each task's solutions and answers
    tasks.forEach((task, index) => {
      solutionParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Task ${index + 1}:`,
              size: 24,
              bold: true,
            }),
          ],
          spacing: { before: 240, after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: formatMathText(task.text.substring(0, 100) + (task.text.length > 100 ? '...' : '')),
              size: 20,
            }),
          ],
          spacing: { before: 120, after: 120 },
        })
      );
      
      // Add solution if enabled
      if (options.includeSolutions && task.correctAnswer) {
        const solutionText = task.type.toLowerCase() === 'multiple-choice' 
          ? `Correct option: ${task.correctAnswer}`
          : formatMathText(task.correctAnswer);
          
        solutionParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Solution:',
                size: 20,
                bold: true,
              }),
            ],
            spacing: { before: 120, after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: solutionText,
                size: 20,
              }),
            ],
            spacing: { before: 60, after: 120 },
          })
        );
      }
      
      // Add answer if enabled
      if (options.includeAnswers && task.answer) {
        solutionParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Answer:',
                size: 20,
                bold: true,
              }),
            ],
            spacing: { before: 120, after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: formatMathText(task.answer),
                size: 20,
              }),
            ],
            spacing: { before: 60, after: 240 },
          })
        );
      }
    });
  }
  
  // Combine all paragraphs
  const allParagraphs = [...taskParagraphs, ...solutionParagraphs];
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: allParagraphs,
    }],
  });

  return await Packer.toBlob(doc);
}

export async function downloadDocument(
  tasks: Question[], 
  format: 'pdf' | 'docx' = 'pdf', 
  options: DocumentOptions,
  title: string = 'Task Sheet'
): Promise<void> {
  try {
    let blob: Blob;
    
    if (format === 'pdf') {
      blob = await generatePDF(tasks, options, title);
    } else {
      blob = await generateDOCX(tasks, options);
    }
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.${format}`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error generating document:', error);
    throw error;
  }
} 