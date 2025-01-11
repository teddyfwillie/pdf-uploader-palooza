import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

async function extractTextFromPdf(pdfData: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const pdf = await loadingTask;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + ' ';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { ...corsHeaders }
    });
  }

  try {
    const { pdfId, query } = await req.json();
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
    
    // Prepare context for OpenAI
    const context = relevantChunks.join('\n\n');
    console.log('Selected relevant chunks for processing');

    // Process with OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Sending request to OpenAI...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that answers questions about PDF documents. Keep your responses concise and focused on the question.'
          },
          {
            role: 'user',
            content: `Here is the relevant content from the PDF:\n\n${context}\n\nPlease answer this question about the PDF: ${query}`
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'Error processing request with OpenAI');
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response received successfully');

    return new Response(
      JSON.stringify({ answer: openAIData.choices[0].message.content }),
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