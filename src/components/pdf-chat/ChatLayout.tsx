import React from 'react';
import { Logo } from '../Logo';
import { ProfileMenu } from '../ProfileMenu';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  pdfViewer?: React.ReactNode;
  isPdfViewerOpen: boolean;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  sidebar,
  content,
  pdfViewer,
  isPdfViewerOpen
}) => {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Logo />
        <div className="flex items-center gap-4">
          <ProfileMenu />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-64 border-r bg-muted/40 flex flex-col overflow-hidden">
          {sidebar}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {content}
          </div>

          {/* PDF Viewer Section */}
          {pdfViewer && (
            <div
              className={cn(
                "fixed inset-y-0 right-0 z-40 w-full bg-background transition-transform duration-300 ease-in-out lg:relative lg:w-1/2",
                isPdfViewerOpen
                  ? "translate-x-0"
                  : "translate-x-full lg:translate-x-0 lg:w-0"
              )}
            >
              {pdfViewer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};