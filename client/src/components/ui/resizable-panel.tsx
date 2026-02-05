import * as React from 'react';
import { cn } from '@/lib/utils';

interface ResizablePanelGroupProps {
  direction: 'horizontal' | 'vertical';
  children: React.ReactNode;
  className?: string;
}

export function ResizablePanelGroup({ direction, children, className }: ResizablePanelGroupProps) {
  const [splitPercent, setSplitPercent] = React.useState(35);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);

  const handleMouseDown = React.useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = direction === 'horizontal'
        ? ((e.clientX - rect.left) / rect.width) * 100
        : ((e.clientY - rect.top) / rect.height) * 100;
      setSplitPercent(Math.min(Math.max(percent, 20), 80));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction]);

  const childArray = React.Children.toArray(children);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
    >
      <div style={{ flexBasis: `${splitPercent}%` }} className="overflow-hidden min-w-0 min-h-0">
        {childArray[0]}
      </div>
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'shrink-0 bg-border/40 hover:bg-primary/20 transition-colors',
          direction === 'horizontal' ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize'
        )}
      />
      <div style={{ flexBasis: `${100 - splitPercent}%` }} className="overflow-hidden min-w-0 min-h-0">
        {childArray[1]}
      </div>
    </div>
  );
}
