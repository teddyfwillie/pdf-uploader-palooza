import { FileText } from "lucide-react";

export const Logo = () => {
  return (
    <div className="flex items-center gap-2 p-4">
      <FileText className="h-6 w-6 text-sidebar-primary" />
      <span className="font-semibold text-sidebar-foreground">PDF Chat</span>
    </div>
  );
};