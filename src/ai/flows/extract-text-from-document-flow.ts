
'use server';
/**
 * @fileOverview Extracts text content from a wide variety of document types, including PDFs, Office documents, and images containing text.
 *
 * - extractTextFromDocument - A function that extracts text from a document provided as a data URI.
 * - ExtractTextFromDocumentInput - The input type for the extractTextFromDocument function.
 * - ExtractTextFromDocumentOutput - The return type for the extractTextFromDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTextFromDocumentInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "The document file content as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  fileName: z.string().describe('The name of the file.'),
});
export type ExtractTextFromDocumentInput = z.infer<typeof ExtractTextFromDocumentInputSchema>;

const ExtractTextFromDocumentOutputSchema = z.object({
  extractedText: z.string().describe('The extracted text content from the document.'),
});
export type ExtractTextFromDocumentOutput = z.infer<typeof ExtractTextFromDocumentOutputSchema>;

export async function extractTextFromDocument(input: ExtractTextFromDocumentInput): Promise<ExtractTextFromDocumentOutput> {
  return extractTextFromDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTextFromDocumentPrompt',
  input: {schema: ExtractTextFromDocumentInputSchema},
  output: {schema: ExtractTextFromDocumentOutputSchema},
  prompt: `You are an AI assistant highly specialized in document processing and text extraction. Your primary task is to extract all discernible textual content from the provided document, regardless of its original format. The document could be a PDF, Word document, PowerPoint presentation, plain text file, image containing text, or any other common document type.

Document Name: {{fileName}}
Document Data: {{media url=fileDataUri}}

Your goal is to:
1.  Analyze the provided document data.
2.  If the document contains text (including text within images, diagrams, or tables), extract it as accurately and completely as possible.
3.  Return *only* the extracted textual content. Do not add any commentary, summarization, or explanation beyond the raw text itself.
4.  If the document is an image or contains images with text, perform Optical Character Recognition (OCR) to extract that text.
5.  If the document contains no discernible text (e.g., it's a blank document, purely graphical without text, or an audio/video file mistaken for a document), or if it's corrupted, or if it's in a format you genuinely cannot process to extract text from, return a clear and concise message stating this. For example: "[No text could be extracted from {{fileName}} as it appears to be empty or unreadable]" or "[The document {{fileName}} is in an unsupported format for text extraction]". Do not attempt to invent content or apologize.

Focus solely on accurate text extraction.`,
  // Using the default model configured in genkit.ts, which should be Gemini Flash and have multimodal capabilities.
});

const extractTextFromDocumentFlow = ai.defineFlow(
  {
    name: 'extractTextFromDocumentFlow',
    inputSchema: ExtractTextFromDocumentInputSchema,
    outputSchema: ExtractTextFromDocumentOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      // Ensure output is not null, and provide a default if it is.
      if (output?.extractedText && output.extractedText.trim() !== '') {
        return output;
      }
      // If Gemini returns an empty string or just whitespace, use a specific message.
      return { extractedText: `[No text could be extracted from ${input.fileName} or the document is empty]` };

    } catch (error) {
      console.error(`Error in extractTextFromDocumentFlow for ${input.fileName}:`, error);
      // Provide a more specific error message if possible, or a generic one.
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during text extraction.';
      return { extractedText: `[Error extracting text from ${input.fileName}: ${errorMessage}]` };
    }
  }
);
