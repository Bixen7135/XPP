import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export const formatMathText = (text: string) => {
  if (!text) return '';

  
  const parts = text.split(/(\\\[.*?\\\]|\\\(.*?\\\))/gs);
  
  return parts.map((part, index) => {
    
    if (part.startsWith('\\[') && part.endsWith('\\]')) {
      const math = part.slice(2, -2).trim();
      return (
        <div key={index} className="my-2 overflow-x-auto max-w-full">
          <div className="inline-block min-w-0">
            <BlockMath math={math} />
          </div>
        </div>
      );
    }
    
    else if (part.startsWith('\\(') && part.endsWith('\\)')) {
      const math = part.slice(2, -2).trim();
      return (
        <span key={index} className="inline-block max-w-full overflow-x-auto">
          <InlineMath math={math} />
        </span>
      );
    }
    
    return (
      <span key={index} className="break-words whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}; 