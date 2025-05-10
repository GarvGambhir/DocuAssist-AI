'use client';

import type { RouteQueryOutput } from '@/ai/flows/route-query';
import { routeQuery } from '@/ai/flows/route-query';
import type { GenerateAnswerOutput } from '@/ai/flows/generate-answer';
import { generateAnswer } from '@/ai/flows/generate-answer';
import { extractTextFromDocument } from '@/ai/flows/extract-text-from-document-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, MessageSquare, FileText, AlertTriangle, Lightbulb, BotIcon, UploadCloud, Trash2 } from 'lucide-react';
import { useState, type FormEvent, useEffect, type ChangeEvent } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

// Simulated tool responses (can be replaced with actual tool calls)
const SIMULATED_TOOL_RESPONSE_CALCULATOR = "The calculator tool would process this request. For example, if you asked to 'calculate 25 * 4', the result would be 100. (Simulated Response)";
const SIMULATED_TOOL_RESPONSE_DICTIONARY = "The dictionary tool would provide a definition. For example, 'RAG' stands for Retrieval Augmented Generation, a technique to improve LLM answers with external knowledge. (Simulated Response)";
const SIMULATED_TOOL_RESPONSE_GENERIC = "A specialized tool, appropriate for your query, would be engaged to provide a precise answer. (Simulated Response)";


interface UploadedFile {
  name: string;
  content: string; 
  wasProcessedAsBinary: boolean; 
  size: number;
  type: string; 
  status?: 'processing' | 'completed' | 'error'; 
}

export default function DocuAssistPage() {
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now()); 

  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
  }, []);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (files.length + uploadedFiles.length > 10) {
      setError(`You can upload a maximum of 10 documents. You already have ${uploadedFiles.length} and tried to add ${files.length}.`);
      setFileInputKey(Date.now()); 
      return;
    }

    setIsExtractingText(true);
    setError(null);

    const allowedTextReadableExtensions = ['.txt', '.md'];
    const allowedBinaryExtensions = [
      '.pdf', '.doc', '.docx', '.ppt', '.pptx', 
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'
    ];
    const allAllowedExtensions = [...allowedTextReadableExtensions, ...allowedBinaryExtensions];

    const unsupportedFile = Array.from(files).find(file => {
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      return !allAllowedExtensions.includes(fileExtension);
    });

    if (unsupportedFile) {
      setError(`Unsupported file type: ${unsupportedFile.name}. Allowed types: ${allAllowedExtensions.join(', ')}.`);
      setIsExtractingText(false);
      setFileInputKey(Date.now());
      return;
    }
    
    const initialFileStates: UploadedFile[] = Array.from(files).map(file => ({
      name: file.name,
      content: '[Processing...]',
      wasProcessedAsBinary: !allowedTextReadableExtensions.includes(`.${file.name.split('.').pop()?.toLowerCase()}`),
      size: file.size,
      type: file.type,
      status: 'processing',
    }));
    setUploadedFiles(prevFiles => [...prevFiles, ...initialFileStates].slice(0,10));


    const newFilesPromises = Array.from(files).map(async (file): Promise<UploadedFile> => {
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      let content: string;
      let wasProcessedAsBinary = false;
      
      if (allowedTextReadableExtensions.includes(fileExtension)) {
        try {
          content = await file.text();
          return { name: file.name, content, wasProcessedAsBinary, size: file.size, type: file.type, status: 'completed' };
        } catch (e) {
          console.error(`Error reading text file ${file.name}:`, e);
          return { name: file.name, content: `[Error reading text file: ${e instanceof Error ? e.message : 'Unknown error'}]`, wasProcessedAsBinary, size: file.size, type: file.type, status: 'error' };
        }
      } else if (allowedBinaryExtensions.includes(fileExtension)) {
        wasProcessedAsBinary = true;
        try {
          const fileReader = new FileReader();
          const dataUri = await new Promise<string>((resolve, reject) => {
            fileReader.onerror = reject;
            fileReader.onload = () => resolve(fileReader.result as string);
            fileReader.readAsDataURL(file);
          });

          const extractionResult = await extractTextFromDocument({
            fileDataUri: dataUri,
            fileName: file.name,
          });
          content = extractionResult.extractedText;
          // Check if extraction returned an error message or no actual content
          if (content.startsWith("[No text") || content.startsWith("[Error extracting") || content.trim() === '') {
            return { name: file.name, content, wasProcessedAsBinary, size: file.size, type: file.type, status: 'error' };
          }
          return { name: file.name, content, wasProcessedAsBinary, size: file.size, type: file.type, status: 'completed' };
        } catch (e) {
          console.error(`Error processing or extracting text from ${file.name}:`, e);
          return { name: file.name, content: `[Error extracting content from ${file.name}: ${e instanceof Error ? e.message : 'Unknown error'}]`, wasProcessedAsBinary, size: file.size, type: file.type, status: 'error' };
        }
      }
      return { name: file.name, content: `[Unsupported file type: ${file.name}]`, wasProcessedAsBinary: true, size: file.size, type: file.type, status: 'error' };
    });

    const processedFilesData = await Promise.all(newFilesPromises);

    setUploadedFiles(prevFiles => {
      const updatedFiles = [...prevFiles];
      processedFilesData.forEach(processedFile => {
        const index = updatedFiles.findIndex(f => f.name === processedFile.name && f.status === 'processing');
        if (index !== -1) {
          updatedFiles[index] = processedFile;
        } else { 
          if(updatedFiles.length < 10) updatedFiles.push(processedFile);
        }
      });
      return updatedFiles.slice(0, 10);
    });

    setIsExtractingText(false);
    setFileInputKey(Date.now()); 
  };


  const handleClearFiles = () => {
    setUploadedFiles([]);
    setFileInputKey(Date.now()); 
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setError("Please enter a question.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFinalAnswer(null);

    try {
      const routeResult = await routeQuery({ query });

      if (routeResult.route === 'tool') {
        if (query.toLowerCase().includes("calculate")) {
          setFinalAnswer(SIMULATED_TOOL_RESPONSE_CALCULATOR);
        } else if (query.toLowerCase().includes("define")) {
          setFinalAnswer(SIMULATED_TOOL_RESPONSE_DICTIONARY);
        } else {
           setFinalAnswer(SIMULATED_TOOL_RESPONSE_GENERIC);
        }
      } else if (routeResult.route === 'rag') {
        if (uploadedFiles.length === 0) {
          setError("Please upload documents to answer questions using the RAG pipeline. The AI has determined your query is best answered by the uploaded documents.");
          setIsLoading(false);
          return;
        }
        
        const validExtractedFiles = uploadedFiles.filter(file => {
            const isErrorContent = 
                (file.content?.startsWith("[No text") || 
                 file.content?.startsWith("[Error extracting") ||
                 file.content?.startsWith("[Unsupported file type") ||
                 file.content?.startsWith("[Error reading text file"));
            // Content must exist, not be an error message, and not be just whitespace
            return file.content && file.content.trim() !== '' && !isErrorContent;
        });

        if (validExtractedFiles.length === 0) {
            setError("Text extraction failed or yielded no usable content for all uploaded documents. Cannot answer the question based on the provided documents.");
            setIsLoading(false);
            return;
        }
        
        const contextString = validExtractedFiles
          .map(file => {
            let fileInfo = `Document: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(2)} KB\n`;
            if (file.wasProcessedAsBinary) {
              fileInfo += `(Originally a binary file, text extracted)\n`;
            }
            const fileContent = file.content || ""; 
            fileInfo += `Content:\n${fileContent}`;
            return fileInfo;
          })
          .join('\n\n---\n\n');
        
        const answerResult = await generateAnswer({ question: query, context: contextString });
        setFinalAnswer(answerResult.answer);
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "An unexpected error occurred with the AI. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!clientLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center p-4 md:p-8 selection:bg-primary/20 selection:text-primary">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-primary flex items-center justify-center">
          <BotIcon className="h-10 w-10 mr-3 text-accent" />
          DocuAssist AI
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Your RAG-Powered Multi-Agent Q&amp;A Assistant</p>
      </header>

      <Card className="w-full max-w-2xl shadow-xl mb-8">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <UploadCloud className="mr-2 h-6 w-6 text-primary" />
            Upload Documents
          </CardTitle>
          <CardDescription>Upload up to 10 docs (.txt, .pdf, .docx, .pptx, images). Text will be extracted.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              id="file-upload"
              key={fileInputKey}
              type="file"
              multiple
              accept=".txt,.md,.pdf,.doc,.docx,.ppt,.pptx,text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/gif,image/bmp,image/tiff,image/webp"
              onChange={handleFileChange}
              className="text-base"
              disabled={isLoading || isExtractingText || uploadedFiles.length >= 10}
            />
            {isExtractingText && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing files and extracting text...
              </div>
            )}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <Label>Uploaded Documents ({uploadedFiles.length}/10):</Label>
                <ScrollArea className="h-32 rounded-md border p-2 bg-background">
                  <ul className="space-y-1">
                    {uploadedFiles.map((file, index) => (
                      <li key={`${file.name}-${index}-${file.size}`} className="text-sm flex justify-between items-center p-1.5 bg-secondary/50 rounded-md">
                        <span className="flex items-center truncate">
                            {file.status === 'processing' ? <Loader2 className="inline mr-2 h-4 w-4 flex-shrink-0 animate-spin" /> : <FileText className="inline mr-2 h-4 w-4 flex-shrink-0" />}
                            <span className="truncate" title={file.name}>{file.name}</span>
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap pl-2">
                          ({(file.size / 1024).toFixed(2)} KB)
                          {file.status === 'error' && <span className="text-destructive ml-1">(Error/No Content)</span>}
                          {file.status === 'completed' && file.wasProcessedAsBinary && <span className="text-green-600 ml-1">(Extracted)</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
                <Button variant="outline" size="sm" onClick={handleClearFiles} disabled={isLoading || isExtractingText} className="w-full sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" /> Clear All Documents
                </Button>
              </div>
            )}
            {uploadedFiles.length >= 10 && (
              <p className="text-sm text-muted-foreground">Maximum number of documents reached.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl shadow-xl mb-8">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <MessageSquare className="mr-2 h-6 w-6 text-primary" />
            Ask a Question
          </CardTitle>
          <CardDescription>Ask a question about your documents or general topics.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="query" className="sr-only">Your Question</Label>
              <Input
                id="query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., What is RAG? or Summarize document X."
                className="text-base"
                disabled={isLoading || isExtractingText}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isExtractingText}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Get Answer'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {(isLoading || isExtractingText) && !error && (
        <div className="text-center my-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">{isExtractingText ? 'Extracting text from documents...' : 'Thinking...'}</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="w-full max-w-2xl mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isExtractingText && finalAnswer && (
        <div className="w-full max-w-2xl space-y-6">
          {finalAnswer && (
            <Card className="shadow-lg bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-primary">
                  <Lightbulb className="mr-2 h-6 w-6 text-accent" />
                  Answer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap text-base leading-relaxed">{finalAnswer}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} DocuAssist AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

