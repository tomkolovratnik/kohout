import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTicketNotes, useDeleteTicket } from '@/api/tickets';
import { useUiStore } from '@/stores/ui-store';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Ticket } from '@kohout/shared';

interface DeleteTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
}

function notesCountText(count: number): string {
  if (count === 1) return '1 osobní poznámku, která bude také smazána';
  if (count >= 2 && count <= 4) return `${count} osobní poznámky, které budou také smazány`;
  return `${count} osobních poznámek, které budou také smazány`;
}

export function DeleteTicketDialog({ open, onOpenChange, ticket }: DeleteTicketDialogProps) {
  const { data: notes = [] } = useTicketNotes(ticket.id);
  const deleteTicket = useDeleteTicket();
  const selectTicket = useUiStore(s => s.selectTicket);

  const handleDelete = async () => {
    try {
      await deleteTicket.mutateAsync(ticket.id);
      selectTicket(null);
      onOpenChange(false);
      toast.success('Tiket smazán');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Smazat tiket z Kohouta</DialogTitle>
          <DialogDescription>
            Opravdu chcete odstranit tiket <span className="font-mono font-medium text-foreground">{ticket.external_id}</span>? Tiket nebude odstraněn z Jira ani Azure DevOps.
          </DialogDescription>
        </DialogHeader>

        {notes.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 ring-1 ring-amber-200/60 dark:ring-amber-800/40 mt-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Tento tiket obsahuje {notesCountText(notes.length)}.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteTicket.isPending}>
            <Trash2 className="h-4 w-4" />
            Smazat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
