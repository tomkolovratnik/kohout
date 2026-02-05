import { useState } from 'react';
import { useTicket, useTicketCategories, useTicketTags, useAssignCategory, useRemoveCategory, useAssignTag, useRemoveTag, useRefreshTicket, useTogglePin } from '@/api/tickets';
import { useCategories } from '@/api/categories';
import { useTags } from '@/api/tags';
import { useUiStore } from '@/stores/ui-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TicketNotes } from './TicketNotes';
import { DeleteTicketDialog } from './DeleteTicketDialog';
import { Markdown } from '@/components/ui/markdown';
import { FolderSelect } from '@/components/folders/FolderSelect';
import { ExternalLink, RefreshCw, X, Tag, FolderOpen, Folder as FolderIcon, Pin, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TicketComment } from '@kohout/shared';

const statusColors: Record<string, string> = {
  open: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  in_progress: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  resolved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
  unknown: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
};

const statusLabels: Record<string, string> = {
  open: 'Otevřené',
  in_progress: 'V řešení',
  resolved: 'Vyřešené',
  closed: 'Uzavřené',
  unknown: 'Neznámý stav',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  none: 'bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400',
};

const priorityLabels: Record<string, string> = {
  critical: 'Kritická',
  high: 'Vysoká',
  medium: 'Střední',
  low: 'Nízká',
  none: 'Žádná',
};

export function TicketDetail() {
  const selectedId = useUiStore(s => s.selectedTicketId);
  const { data: ticket, isLoading } = useTicket(selectedId);
  const { data: ticketCategories = [] } = useTicketCategories(selectedId);
  const { data: ticketTags = [] } = useTicketTags(selectedId);
  const { data: allCategories = [] } = useCategories();
  const { data: allTags = [] } = useTags();
  const assignCategory = useAssignCategory();
  const removeCategory = useRemoveCategory();
  const assignTag = useAssignTag();
  const removeTag = useRemoveTag();
  const refreshTicket = useRefreshTicket();
  const togglePin = useTogglePin();
  const [showDelete, setShowDelete] = useState(false);

  if (!selectedId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Vyberte tiket ze seznamu
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Načítání...</div>;
  }

  if (!ticket) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Tiket nenalezen</div>;
  }

  const comments = (ticket as any).comments || [];
  const availableCategories = allCategories.filter((c: any) => !ticketCategories.some((tc: any) => tc.id === c.id));
  const availableTags = allTags.filter((t: any) => !ticketTags.some((tt: any) => tt.id === t.id));

  const handleRefresh = async () => {
    try {
      await refreshTicket.mutateAsync(ticket.id);
      toast.success('Tiket aktualizován');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePin.mutateAsync({ ticketId: ticket.id, is_pinned: !ticket.is_pinned });
      toast.success(ticket.is_pinned ? 'Tiket odepnut' : 'Tiket připnut');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-mono">{ticket.external_id}</span>
              <Badge variant="secondary" className={cn('text-xs', statusColors[ticket.status])} title="Stav">
                {statusLabels[ticket.status] || ticket.status}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', priorityColors[ticket.priority])} title="Priorita">
                {priorityLabels[ticket.priority] || ticket.priority}
              </Badge>
              <Badge variant="outline" className="text-xs" title="Zdroj">{ticket.provider_type === 'jira' ? 'Jira' : ticket.provider_type === 'azure-devops' ? 'Azure DevOps' : ticket.provider_type}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant={ticket.is_pinned ? 'default' : 'outline'} size="sm" onClick={handleTogglePin} disabled={togglePin.isPending}>
                <Pin className="h-3 w-3 mr-1" />
                {ticket.is_pinned ? 'Připnuto' : 'Připnout'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshTicket.isPending}>
                <RefreshCw className={cn('h-3 w-3 mr-1', refreshTicket.isPending && 'animate-spin')} />
                Obnovit
              </Button>
              {ticket.external_url && (
                <a href={ticket.external_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium h-8 px-3 ring-1 ring-border/40 bg-card shadow-[var(--shadow-card)] hover:bg-accent hover:text-accent-foreground transition-all duration-150">
                  <ExternalLink className="h-3 w-3" /> Otevřít
                </a>
              )}
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-3 w-3 mr-1" />
                Smazat
              </Button>
            </div>
          </div>
          <h2 className="text-xl font-semibold font-heading">{ticket.title}</h2>
          <div className="flex gap-4 text-xs text-muted-foreground">
            {ticket.assignee && <span>Přiřazeno: {ticket.assignee}</span>}
            {ticket.creator && <span>Autor: {ticket.creator}</span>}
            <span>Synch: {new Date(ticket.synced_at).toLocaleString('cs')}</span>
          </div>
        </div>

        {/* Folder */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Složka</span>
          </div>
          <FolderSelect ticketId={ticket.id} currentFolderId={ticket.folder_id} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Categories */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Kategorie</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ticketCategories.map((cat: any) => (
                <Badge key={cat.id} style={{ backgroundColor: cat.color + '20', color: cat.color, borderColor: cat.color }}>
                  {cat.name}
                  <button className="ml-1" onClick={() => removeCategory.mutate({ ticketId: ticket.id, categoryId: cat.id })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {availableCategories.length > 0 && (
                <Select className="h-7 text-xs w-32" onChange={e => {
                  if (e.target.value) {
                    assignCategory.mutate({ ticketId: ticket.id, categoryId: Number(e.target.value) });
                    e.target.value = '';
                  }
                }}>
                  <option value="">+ Přidat</option>
                  {availableCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tagy</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ticket.external_tags?.map((tag: string, i: number) => (
                <Badge key={`ext-${i}`} variant="outline" className="text-xs">{tag}</Badge>
              ))}
              {ticketTags.map((tag: any) => (
                <Badge key={tag.id} style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}>
                  {tag.name}
                  <button className="ml-1" onClick={() => removeTag.mutate({ ticketId: ticket.id, tagId: tag.id })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {availableTags.length > 0 && (
                <Select className="h-7 text-xs w-32" onChange={e => {
                  if (e.target.value) {
                    assignTag.mutate({ ticketId: ticket.id, tagId: Number(e.target.value) });
                    e.target.value = '';
                  }
                }}>
                  <option value="">+ Přidat</option>
                  {availableTags.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold font-heading">Popis</h3>
          <div className="text-sm bg-muted/50 rounded-lg p-4 ring-1 ring-border/20">
            {ticket.description ? (
              <Markdown>{ticket.description}</Markdown>
            ) : (
              <span className="text-muted-foreground italic">Bez popisu</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Notes */}
        <TicketNotes ticketId={ticket.id} />

        <Separator />

        {/* Comments */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold font-heading">Komentáře ({comments.length})</h4>
          {comments.map((comment: TicketComment) => (
            <div key={comment.id} className="rounded-lg ring-1 ring-border/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{comment.author}</span>
                <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString('cs')}</span>
              </div>
              <Markdown className="text-sm">{comment.body}</Markdown>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground">Žádné komentáře</p>
          )}
        </div>
      </div>
      <DeleteTicketDialog open={showDelete} onOpenChange={setShowDelete} ticket={ticket} />
    </ScrollArea>
  );
}
