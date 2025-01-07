import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PDFList } from './pdf-chat/PDFList';
import { PDFUploader } from './pdf-chat/PDFUploader';
import { ChatMessages } from './pdf-chat/ChatMessages';
import { ChatInput } from './pdf-chat/ChatInput';
import { PDFViewer } from './pdf-chat/PDFViewer';
import { Logo } from './Logo';
import { ProfileMenu } from './ProfileMenu';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PDF, ChatMessage } from '@/types/database';

export const PdfChat = () => {
  const [selectedPdf, setSelectedPdf] = useState<PDF | null>(null);
  const { toast } = useToast();

  const { data: pdfs, isLoading: isPdfsLoading } = useQuery({
    queryKey: ['pdfs'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('Not authenticated');

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
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('Not authenticated');

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
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('Not authenticated');

      const { error: chatError } = await supabase
        .from('chat_messages')
        .insert({
          content,
          pdf_id: selectedPdf.id,
          is_ai: false,
          user_id: session.session.user.id,
        });

      if (chatError) throw chatError;

      const { data, error: functionError } = await supabase.functions.invoke('process-pdf-query', {
        body: {
          pdfId: selectedPdf.id,
          query: content,
        },
      });

      if (functionError) throw functionError;

      const { error: aiError } = await supabase
        .from('chat_messages')
        .insert({
          content: data.answer,
          pdf_id: selectedPdf.id,
          is_ai: true,
          user_id: session.session.user.id,
        });

      if (aiError) throw aiError;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex justify-between items-center border-b bg-sidebar">
        <Logo />
        <div className="p-4">
          <ProfileMenu />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r bg-sidebar flex flex-col">
          <div className="flex-1">
            <PDFUploader />
            <PDFList
              pdfs={pdfs}
              isLoading={isPdfsLoading}
              selectedPdf={selectedPdf}
              onSelectPdf={setSelectedPdf}
            />
          </div>
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {selectedPdf ? (
            <>
              <div className="flex-1 flex flex-col border-r">
                <div className="p-4 border-b bg-sidebar">
                  <h2 className="font-semibold">Chat with: {selectedPdf.name}</h2>
                </div>

                <ChatMessages
                  messages={messages}
                  isLoading={isMessagesLoading}
                  isPending={sendMessage.isPending}
                />

                <div className="p-4 border-t bg-sidebar">
                  <ChatInput
                    onSendMessage={(message) => sendMessage.mutate(message)}
                    isPending={sendMessage.isPending}
                  />
                </div>
              </div>

              <div className="w-1/2 flex flex-col">
                <div className="p-4 border-b bg-sidebar">
                  <h2 className="font-semibold">PDF Viewer</h2>
                </div>
                <PDFViewer pdf={selectedPdf} />
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
    </div>
  );
};