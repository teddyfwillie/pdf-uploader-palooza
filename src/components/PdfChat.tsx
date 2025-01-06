import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Message {
  id: string;
  content: string;
  is_ai: boolean;
  created_at: string;
}

interface PDF {
  id: string;
  name: string;
}

export const PdfChat = () => {
  const [selectedPdf, setSelectedPdf] = useState<PDF | null>(null);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: pdfs, isLoading: isPdfsLoading } = useQuery({
    queryKey: ['pdfs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdfs')
        .select('id, name')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: messages, isLoading: isMessagesLoading } = useQuery({
    queryKey: ['messages', selectedPdf?.id],
    queryFn: async () => {
      if (!selectedPdf) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('pdf_id', selectedPdf.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPdf,
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('pdfs')
        .insert({
          name: file.name,
          file_path: fileName,
        });

      if (dbError) throw dbError;
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedPdf) throw new Error('No PDF selected');
      
      const { error: chatError } = await supabase
        .from('chat_messages')
        .insert({
          content,
          pdf_id: selectedPdf.id,
          is_ai: false,
        });

      if (chatError) throw chatError;

      // Call the AI processing edge function
      const response = await fetch('/api/process-pdf-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfId: selectedPdf.id,
          query: content,
        }),
      });

      if (!response.ok) throw new Error('Failed to process query');

      const { answer } = await response.json();

      const { error: aiError } = await supabase
        .from('chat_messages')
        .insert({
          content: answer,
          pdf_id: selectedPdf.id,
          is_ai: true,
        });

      if (aiError) throw aiError;
    },
  });

  return (
    <div className="flex h-screen">
      {/* PDF List Sidebar */}
      <div className="w-64 border-r p-4 bg-sidebar">
        <div className="mb-4">
          <Input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="pdf-upload"
          />
          <Button
            onClick={() => document.getElementById('pdf-upload')?.click()}
            className="w-full"
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Upload className="mr-2" />
                Upload PDF
              </>
            )}
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {isPdfsLoading ? (
            <div className="flex justify-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {pdfs?.map((pdf) => (
                <Button
                  key={pdf.id}
                  variant={selectedPdf?.id === pdf.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedPdf(pdf)}
                >
                  {pdf.name}
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {selectedPdf ? (
          <>
            <div className="p-4 border-b">
              <h2 className="font-semibold">Chat with: {selectedPdf.name}</h2>
            </div>

            <ScrollArea className="flex-1 p-4">
              {isMessagesLoading ? (
                <div className="flex justify-center">
                  <Loader2 className="animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.is_ai ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.is_ai
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {sendMessage.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-secondary text-secondary-foreground max-w-[80%] p-3 rounded-lg">
                        <Loader2 className="animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!message.trim()) return;
                  sendMessage.mutate(message);
                  setMessage('');
                }}
                className="flex gap-2"
              >
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask a question about the PDF..."
                  disabled={sendMessage.isPending}
                />
                <Button type="submit" disabled={sendMessage.isPending}>
                  {sendMessage.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Send />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <Alert>
              <AlertDescription>
                Select a PDF from the sidebar or upload a new one to start chatting
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};