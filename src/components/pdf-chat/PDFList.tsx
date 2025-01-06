import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { PDF } from '@/types/database';

interface PDFListProps {
  pdfs: PDF[] | null;
  isLoading: boolean;
  selectedPdf: PDF | null;
  onSelectPdf: (pdf: PDF) => void;
}

export const PDFList: React.FC<PDFListProps> = ({
  pdfs,
  isLoading,
  selectedPdf,
  onSelectPdf,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <div className="space-y-2">
        {pdfs?.map((pdf) => (
          <Button
            key={pdf.id}
            variant={selectedPdf?.id === pdf.id ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onSelectPdf(pdf)}
          >
            {pdf.name}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
};