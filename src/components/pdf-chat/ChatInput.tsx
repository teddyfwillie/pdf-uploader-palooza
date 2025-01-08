import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isPending: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isPending }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSendMessage(message);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex max-w-3xl mx-auto">
      <div className="relative flex w-full flex-col">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about the PDF..."
          disabled={isPending}
          className={cn(
            "min-h-[60px] w-full resize-none rounded-lg border bg-background px-4 py-3 pr-14",
            "focus-visible:ring-1 focus-visible:ring-offset-0",
            "text-base md:text-sm"
          )}
          rows={1}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={isPending}
          className="absolute bottom-2 right-2 h-8 w-8 rounded-lg"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
};