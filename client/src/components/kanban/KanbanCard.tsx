import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

const priorityDotColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-500',
  none: 'bg-slate-300 dark:bg-slate-600',
};

// Presentational card content — used both in-place and inside DragOverlay
export interface KanbanCardContentProps {
  title: string;
  externalId: string;
  priority: string;
  providerType: string;
  assignee: string | null;
  isDragPlaceholder?: boolean;
  isOverlay?: boolean;
}

export function KanbanCardContent({ title, externalId, priority, providerType, assignee, isDragPlaceholder, isOverlay }: KanbanCardContentProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-lg ring-1 ring-border/30 p-3 shadow-[var(--shadow-card)] transition-all duration-150',
        isDragPlaceholder && 'opacity-30 ring-dashed ring-primary/40 bg-primary/5 shadow-none',
        isOverlay && 'shadow-2xl ring-primary/50 rotate-[1.5deg] scale-[1.03]',
        !isDragPlaceholder && !isOverlay && 'hover:shadow-[var(--shadow-card-hover)]'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">
          <GripVertical className={cn('h-4 w-4', isOverlay ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div className={cn('h-2 w-2 rounded-full shrink-0', priorityDotColors[priority] || 'bg-slate-300')} />
            <p className="text-sm font-medium leading-tight truncate">{title}</p>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground font-mono">{externalId}</span>
            <Badge variant="outline" className="text-xs px-1 py-0">{providerType}</Badge>
          </div>
          {assignee && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{assignee}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface KanbanCardProps {
  id: string;
  ticketId: number;
  title: string;
  externalId: string;
  status: string;
  priority: string;
  providerType: string;
  assignee: string | null;
  onCardClick?: (ticketId: number) => void;
}

export function KanbanCard({ id, ticketId, title, externalId, priority, providerType, assignee, onCardClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isDragging && onCardClick?.(ticketId)}
      className="cursor-pointer"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <KanbanCardContent
          title={title}
          externalId={externalId}
          priority={priority}
          providerType={providerType}
          assignee={assignee}
          isDragPlaceholder={isDragging}
        />
      </div>
    </div>
  );
}
