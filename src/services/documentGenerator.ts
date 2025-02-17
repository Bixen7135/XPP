import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { Question } from '../types/exam';
import { saveAs } from 'file-saver';

export interface DocumentOptions {
  includeSolutions: boolean;
  includeAnswers: boolean;
}

const formatMathText = (text: string): string => {
  // Remove LaTeX delimiters for plain text
  return text.replace(/\\\((.*?)\\\)/g, '$1')
            .replace(/\\\[(.*?)\\\]/g, '$1');
};

export async function generatePDF(tasks: Question[], options: DocumentOptions): Promise<Blob> {
  const doc = new jsPDF();
  let y = 20;
  const pageHeight = doc.internal.pageSize.height;
  
  tasks.forEach((task, index) => {
    // Add new page if content will overflow
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }

    // Task number and text
    doc.setFontSize(12);
    doc.text(`${index + 1}. ${formatMathText(task.text)}`, 20, y);
    y += 10;

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Type: ${task.type} | Topic: ${task.topic} | Difficulty: ${task.difficulty}`, 20, y);
    y += 15;

    // Solutions and answers if enabled
    if (options.includeSolutions && task.correctAnswer) {
      doc.setTextColor(0, 100, 0);
      doc.text('Solution:', 20, y);
      y += 5;
      doc.text(formatMathText(task.correctAnswer), 25, y);
      y += 15;
    }

    if (options.includeAnswers && task.answer) {
      doc.setTextColor(0, 0, 100);
      doc.text('Answer:', 20, y);
      y += 5;
      doc.text(formatMathText(task.answer), 25, y);
      y += 15;
    }

    doc.setTextColor(0);
    y += 10;
  });

  return doc.output('blob');
}

export async function generateDOCX(tasks: Question[], options: DocumentOptions): Promise<Blob> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "Task Sheet",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        ...tasks.flatMap((task, index) => [
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${formatMathText(task.text)}`,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Type: ${task.type} | Topic: ${task.topic} | Difficulty: ${task.difficulty}`,
                size: 20,
                color: "666666",
              }),
            ],
          }),
          ...(options.includeSolutions && task.correctAnswer ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Solution:",
                  size: 22,
                  color: "008800",
                  bold: true,
                }),
                new TextRun({
                  text: formatMathText(task.correctAnswer),
                  size: 22,
                  color: "008800",
                }),
              ],
            }),
          ] : []),
          ...(options.includeAnswers && task.answer ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Answer:",
                  size: 22,
                  color: "000088",
                  bold: true,
                }),
                new TextRun({
                  text: formatMathText(task.answer),
                  size: 22,
                  color: "000088",
                }),
              ],
            }),
          ] : []),
          new Paragraph({}), // Spacing
        ]),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}

export async function downloadDocument(
  tasks: Question[], 
  format: 'pdf' | 'docx', 
  options: DocumentOptions
): Promise<void> {
  try {
    const blob = await (format === 'pdf' 
      ? generatePDF(tasks, options) 
      : generateDOCX(tasks, options)
    );
    
    saveAs(blob, `tasks.${format}`);
  } catch (error) {
    console.error('Error generating document:', error);
    throw new Error(`Failed to generate ${format.toUpperCase()} document`);
  }
} 