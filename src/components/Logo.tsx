import { FileText } from "lucide-react";

export const Logo = () => {
  return (
    <div className="flex items-center gap-2 p-4">
      <FileText className="h-6 w-6 text-primary" />
      <span className="font-semibold text-xl bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">PDF Chat</span>
    </div>
  );
};