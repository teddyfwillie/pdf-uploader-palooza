import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Get signed URL for the PDF
    const { data: { signedUrl } } = await supabase
      .storage
      .from('pdfs')
      .createSignedUrl(pdf.file_path, 60);

    if (!signedUrl) {
      throw new Error('Could not generate signed URL for PDF');
    }

    console.log('Generated signed URL for PDF');

    // Fetch PDF content
    const pdfResponse = await fetch(signedUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    console.log('Successfully converted PDF to base64');

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
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that answers questions about PDF documents. Keep your responses concise and focused on the question.'
          },
          {
            role: 'user',
            content: `Here is the PDF content in base64: ${pdfBase64}\n\nPlease answer this question about the PDF: ${query}`
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

    if (!openAIData.choices?.[0]?.message?.content) {
      console.error('Unexpected OpenAI response format:', openAIData);
      throw new Error('Invalid response format from OpenAI');
    }

    const answer = openAIData.choices[0].message.content;

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});