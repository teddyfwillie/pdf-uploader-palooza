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
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-2">
      <div className="space-y-1 py-2">
        {pdfs?.map((pdf) => (
          <Button
            key={pdf.id}
            variant={selectedPdf?.id === pdf.id ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2 text-sm font-medium"
            onClick={() => onSelectPdf(pdf)}
          >
            <FileText className="h-4 w-4 text-primary" />
            <span className="truncate">{pdf.name}</span>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
};