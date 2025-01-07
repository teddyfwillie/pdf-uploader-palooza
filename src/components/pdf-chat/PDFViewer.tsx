import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import type { PDF } from '@/types/database';

interface PDFViewerProps {
  pdf: PDF;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ pdf }) => {
  const getPdfUrl = async () => {
    const { data } = await supabase.storage
      .from('pdfs')
      .createSignedUrl(pdf.file_path, 3600);
    
    return data?.signedUrl;
  };

  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    getPdfUrl().then(setPdfUrl);
  }, [pdf]);

  if (!pdfUrl) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl}
      className="w-full h-full bg-background"
      title={pdf.name}
    />
  );
};