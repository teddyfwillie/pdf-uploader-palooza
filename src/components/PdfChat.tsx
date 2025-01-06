import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PDFList } from './pdf-chat/PDFList';
import { PDFUploader } from './pdf-chat/PDFUploader';
import { ChatMessages } from './pdf-chat/ChatMessages';
import { ChatInput } from './pdf-chat/ChatInput';
import type { PDF, ChatMessage } from '@/types/database';

export const PdfChat = () => {
  const [selectedPdf, setSelectedPdf] = useState<PDF | null>(null);

  const { data: pdfs, isLoading: isPdfsLoading } = useQuery({
    queryKey: ['pdfs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdfs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PDF[];
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
      return data as ChatMessage[];
    },
    enabled: !!selectedPdf,
  });

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
      <div className="w-64 border-r p-4 bg-sidebar">
        <PDFUploader />
        <PDFList
          pdfs={pdfs}
          isLoading={isPdfsLoading}
          selectedPdf={selectedPdf}
          onSelectPdf={setSelectedPdf}
        />
      </div>

      <div className="flex-1 flex flex-col">
        {selectedPdf ? (
          <>
            <div className="p-4 border-b">
              <h2 className="font-semibold">Chat with: {selectedPdf.name}</h2>
            </div>

            <ChatMessages
              messages={messages}
              isLoading={isMessagesLoading}
              isPending={sendMessage.isPending}
            />

            <div className="p-4 border-t">
              <ChatInput
                onSendMessage={(message) => sendMessage.mutate(message)}
                isPending={sendMessage.isPending}
              />
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