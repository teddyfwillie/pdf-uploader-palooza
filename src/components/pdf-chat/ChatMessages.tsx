import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Bot, User } from 'lucide-react';
import type { ChatMessage } from '@/types/database';
import { cn } from '@/lib/utils';

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
      <div className="max-w-3xl mx-auto space-y-4 py-4">
        {messages?.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "group relative flex items-start gap-4 px-4",
              msg.is_ai ? "justify-start" : "justify-end"
            )}
          >
            {msg.is_ai && (
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-primary text-primary-foreground shadow">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={cn(
                "flex-1 space-y-2 overflow-hidden px-1",
                msg.is_ai ? "mr-12" : "ml-12"
              )}
            >
              <div className="prose prose-neutral dark:prose-invert">
                {msg.content}
              </div>
            </div>
            {!msg.is_ai && (
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-secondary text-secondary-foreground shadow">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {isPending && (
          <div className="group relative flex items-start gap-4 px-4">
            <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-primary text-primary-foreground shadow">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-2 overflow-hidden px-1 mr-12">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
};