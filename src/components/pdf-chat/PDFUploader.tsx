import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const PDFUploader: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('pdfs')
        .insert({
          name: file.name,
          file_path: fileName,
        });

      if (dbError) throw dbError;
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mb-4">
      <Input
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        className="hidden"
        id="pdf-upload"
      />
      <Button
        onClick={() => document.getElementById('pdf-upload')?.click()}
        className="w-full"
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>
            <Upload className="mr-2" />
            Upload PDF
          </>
        )}
      </Button>
    </div>
  );
};