import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PDFViewerToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const PDFViewerToggle = ({ isOpen, onToggle, className }: PDFViewerToggleProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={cn("fixed right-4 top-20 z-50 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 md:hidden", className)}
    >
      {isOpen ? <X className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
};