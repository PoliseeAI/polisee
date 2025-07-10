export interface TextChunk {
  content: string;
  id: string; // e.g., paragraph number
}

/**
 * Splits a long string of text into chunks by paragraph.
 * Paragraphs are assumed to be separated by one or more newline characters.
 * 
 * @param fullText The full text to be chunked.
 * @returns An array of TextChunk objects.
 */
export function chunkTextByParagraph(fullText: string): TextChunk[] {
  if (!fullText) {
    return [];
  }

  // Split by one or more newline characters and filter out empty strings.
  const paragraphs = fullText.split(/[\r\n]+/).filter(p => p.trim() !== '');

  return paragraphs.map((p, index) => ({
    content: p.trim(),
    id: `p-${index + 1}`,
  }));
}

/**
 * A more advanced chunking strategy that could be implemented later.
 * For example, chunking by section based on specific headings.
 */
// export function chunkTextBySection(fullText: string): TextChunk[] { ... } 