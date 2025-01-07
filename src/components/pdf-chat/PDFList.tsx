import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText } from 'lucide-react';
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
      <div className="flex justify-center p-4">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2">
        {pdfs?.map((pdf) => (
          <Button
            key={pdf.id}
            variant={selectedPdf?.id === pdf.id ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2"
            onClick={() => onSelectPdf(pdf)}
          >
            <FileText className="h-4 w-4" />
            <span className="truncate">{pdf.name}</span>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
};