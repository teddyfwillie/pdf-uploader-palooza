import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

async function extractTextFromPdf(pdfData: ArrayBuffer): Promise<string> {
  try {
    console.log('Starting PDF text extraction...');
    const loadingTask = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const pdf = await loadingTask;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i} of ${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + ' ';
    }
    
    console.log('PDF text extraction completed successfully');
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

function splitIntoChunks(text: string, maxChunkLength = 3000): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

function findRelevantChunks(chunks: string[], query: string, maxChunks = 3): string[] {
  return chunks
    .map(chunk => ({
      chunk,
      relevance: [...chunk.toLowerCase().matchAll(query.toLowerCase())].length,
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxChunks)
    .map(item => item.chunk);
}

async function generateGeminiResponse(context: string, query: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Context from PDF:\n${context}\n\nQuestion: ${query}\n\nPlease provide a concise and relevant answer based on the context provided.`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Gemini API error:', error);
    throw new Error(`Error from Gemini API: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('No response generated from Gemini');
  }

  return data.candidates[0].content.parts[0].text;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const { pdfId, query } = await req.json();
    if (!pdfId || !query) {
      throw new Error('PDF ID and query are required');
    }

    console.log('Processing query for PDF:', pdfId);
    console.log('Query:', query);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the PDF content from storage
    const { data: pdf } = await supabase
      .from('pdfs')
      .select('*')
      .eq('id', pdfId)
      .single();

    if (!pdf) {
      throw new Error('PDF not found');
    }

    console.log('Found PDF:', pdf.name);

    // Get the PDF file from storage
    const { data: pdfData, error: storageError } = await supabase
      .storage
      .from('pdfs')
      .download(pdf.file_path);

    if (storageError || !pdfData) {
      console.error('Storage error:', storageError);
      throw new Error('Could not download PDF');
    }

    // Extract text from PDF
    console.log('Extracting text from PDF...');
    const pdfText = await extractTextFromPdf(await pdfData.arrayBuffer());
    
    // Split into chunks and find relevant ones
    console.log('Processing text chunks...');
    const chunks = splitIntoChunks(pdfText);
    const relevantChunks = findRelevantChunks(chunks, query);
    
    // Prepare context for Gemini
    const context = relevantChunks.join('\n\n');
    console.log('Selected relevant chunks for processing');

    // Process with Gemini
    console.log('Sending request to Gemini...');
    const answer = await generateGeminiResponse(context, query);
    console.log('Gemini response received successfully');

    return new Response(
      JSON.stringify({ answer }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error in process-pdf-query function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});