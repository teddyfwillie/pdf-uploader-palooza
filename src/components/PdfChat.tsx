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

      try {
        const { data, error: functionError } = await supabase.functions.invoke('process-pdf-query', {
          body: {
            pdfId: selectedPdf.id,
            query: content,
          },
        });

        if (functionError) throw functionError;
        if (!data?.answer) throw new Error('No response from AI');

        const { error: aiError } = await supabase
          .from('chat_messages')
          .insert({
            content: data.answer,
            pdf_id: selectedPdf.id,
            is_ai: true,
            user_id: session.session.user.id,
          });

        if (aiError) throw aiError;
      } catch (error: any) {
        // Handle OpenAI specific errors
        if (error.message?.includes('OpenAI API quota exceeded')) {
          toast({
            title: 'AI Service Error',
            description: 'The AI service is currently unavailable due to quota limits. Please try again later.',
            variant: 'destructive',
          });
        } else if (error.message?.includes('Invalid OpenAI API key')) {
          toast({
            title: 'Configuration Error',
            description: 'There is an issue with the AI service configuration. Please contact support.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: error.message || 'An unexpected error occurred',
            variant: 'destructive',
          });
        }
        throw error;
      }
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
      {/* Header */}
      <div className="flex justify-between items-center border-b bg-card p-4">
        <Logo />
        <div className="flex items-center gap-4">
          <ProfileMenu />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-64 border-r bg-card flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
          <div className="flex-1 overflow-auto">
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
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {selectedPdf ? (
            <>
              {/* Chat Section */}
              <div className="flex-1 flex flex-col border-r overflow-hidden">
                <div className="p-4 border-b bg-card">
                  <h2 className="font-semibold">Chat with: {selectedPdf.name}</h2>
                </div>

                <ChatMessages
                  messages={messages}
                  isLoading={isMessagesLoading}
                  isPending={sendMessage.isPending}
                />

                <div className="p-4 border-t bg-card">
                  <ChatInput
                    onSendMessage={(message) => sendMessage.mutate(message)}
                    isPending={sendMessage.isPending}
                  />
                </div>
              </div>

              {/* PDF Viewer Section - Hidden on mobile, visible on md and up */}
              <div className="hidden md:flex md:w-1/2 flex-col">
                <div className="p-4 border-b bg-card">
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