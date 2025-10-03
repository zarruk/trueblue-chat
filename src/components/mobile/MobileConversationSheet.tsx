import React, { forwardRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface MobileConversationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
}

export const MobileConversationSheet = forwardRef<
  HTMLDivElement,
  MobileConversationSheetProps
>(({ open, onOpenChange, children, title = "Conversaciones" }, ref) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed inset-x-0 bottom-0 h-[85vh] max-w-none rounded-t-2xl bg-background shadow-xl border-t p-0"
        style={{ 
          top: 'unset',
          transform: 'translateY(0)',
          maxHeight: '85vh'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Scrollable Content */}
        <div 
          ref={ref}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4"
          style={{ height: 'calc(85vh - 73px)' }}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
});

MobileConversationSheet.displayName = 'MobileConversationSheet';
