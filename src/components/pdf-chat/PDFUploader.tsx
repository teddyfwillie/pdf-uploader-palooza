import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const PDFUploader: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Error',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File size must be less than 50MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('Not authenticated');

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
          user_id: session.session.user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'PDF uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error uploading file',
        variant: 'destructive',
      });
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