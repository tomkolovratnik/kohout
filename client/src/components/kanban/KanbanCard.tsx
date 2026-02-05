import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface KanbanCardProps {
  id: string;
  ticketId: number;
  title: string;
  externalId: string;
  status: string;
  priority: string;
  providerType: string;
  assignee: string | null;
}

const priorityDotColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-500',
  none: 'bg-slate-300 dark:bg-slate-600',
};

export function KanbanCard({ id, title, externalId, priority, providerType, assignee }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card rounded-lg ring-1 ring-border/30 p-3 shadow-[var(--shadow-card)] cursor-default hover:shadow-[var(--shadow-card-hover)] transition-all duration-150',
        isDragging && 'opacity-50 shadow-lg ring-primary/30'
      )}
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
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
