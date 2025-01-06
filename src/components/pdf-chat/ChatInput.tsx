import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';

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

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask a question about the PDF..."
        disabled={isPending}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <Send />}
      </Button>
    </form>
  );
};