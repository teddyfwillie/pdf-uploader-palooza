import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types/database';
import { ChatBubble } from './ChatBubble';

interface ChatMessagesProps {
  messages: ChatMessage[] | null;
  isLoading: boolean;
  isPending: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  isPending,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        {messages?.map((msg, index) => (
          <ChatBubble
            key={msg.id}
            content={msg.content}
            isAI={msg.is_ai}
            showActions={msg.is_ai && index === messages.length - 1}
          />
        ))}
        {isPending && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
};