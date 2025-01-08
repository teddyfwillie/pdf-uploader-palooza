import React from 'react';
import { Bot, User, ThumbsUp, ThumbsDown, Repeat, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface ChatBubbleProps {
  content: string;
  isAI: boolean;
  showActions?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ content, isAI, showActions = false }) => {
  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 px-4",
        isAI ? "justify-start" : "justify-end"
      )}
    >
      {isAI && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "flex-1 space-y-2 overflow-hidden px-1",
          isAI ? "mr-12" : "ml-12"
        )}
      >
        <div className={cn(
          "rounded-2xl px-4 py-2 text-sm",
          isAI ? "bg-muted/50" : "bg-primary text-primary-foreground"
        )}>
          {content}
        </div>
        {isAI && showActions && (
          <div className="flex items-center gap-2 pt-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ThumbsDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Repeat className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {!isAI && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-secondary">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};