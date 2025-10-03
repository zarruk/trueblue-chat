import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Archive } from 'lucide-react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeAction?: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  actionClassName?: string;
  enableSwipe?: boolean;
  showAction?: boolean;
}

export function SwipeableRow({ 
  children, 
  onSwipeAction, 
  actionLabel = "Archivar",
  actionIcon = <Archive className="h-4 w-4" />,
  actionClassName = "bg-red-500 hover:bg-red-600",
  enableSwipe = true,
  showAction = true
}: SwipeableRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startTranslateX, setStartTranslateX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const SWIPE_THRESHOLD = 80; // Minimum distance for action
  const MAX_TRANSLATE = -88; // Action button width
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setStartTranslateX(translateX);
  }, [translateX]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startX;
    let newTranslateX = startTranslateX + deltaX;
    
    // Constrain movement
    newTranslateX = Math.max(MAX_TRANSLATE, Math.min(0, newTranslateX));
    
    // Add resistance at boundaries
    if (newTranslateX < MAX_TRANSLATE * 0.5) {
      newTranslateX = MAX_TRANSLATE * 0.5 + (newTranslateX - MAX_TRANSLATE * 0.5) * 0.3;
    } else if (newTranslateX > 0) {
      newTranslateX = newTranslateX * 0.3;
    }
    
    setTranslateX(newTranslateX);
  }, [isDragging, startX, startTranslateX]);
  
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    // Determine if we should trigger the action or reset
    if (translateX < -SWIPE_THRESHOLD && onSwipeAction) {
      onSwipeAction();
      setTranslateX(MAX_TRANSLATE);
      // Auto-reset after action
      setTimeout(() => setTranslateX(0), 2000);
    } else {
      // Snap back
      setTranslateX(0);
    }
  }, [translateX, onSwipeAction]);
  
  return (
    <div className="relative overflow-hidden">
      {/* Main content */}
      <div
        ref={containerRef}
        className={`relative transition-transform duration-200 ease-out ${
          isDragging ? 'transition-none' : ''
        }`}
        style={{ transform: `translateX(${enableSwipe ? translateX : 0}px)` }}
        onTouchStart={enableSwipe ? handleTouchStart : undefined}
        onTouchMove={enableSwipe ? handleTouchMove : undefined}
        onTouchEnd={enableSwipe ? handleTouchEnd : undefined}
      >
        {children}
      </div>
      
      {/* Swipe action */}
      {showAction && (
        <div 
          className="absolute inset-y-0 right-0 flex items-center px-4"
          style={{ transform: `translateX(${MAX_TRANSLATE + 100}px)` }}
        >
          <Button
            onClick={onSwipeAction}
            className={`h-full px-4 ${actionClassName} rounded-none`}
            size="sm"
          >
            {actionIcon}
            <span className="ml-2 hidden">{actionLabel}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
