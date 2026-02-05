import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTicketNotes, useCreateNote, useUpdateNote, useDeleteNote } from '@/api/tickets';
import { Markdown } from '@/components/ui/markdown';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import type { TicketNote } from '@kohout/shared';

interface TicketNotesProps {
  ticketId: number;
}

export function TicketNotes({ ticketId }: TicketNotesProps) {
  const { data: notes = [] } = useTicketNotes(ticketId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    await createNote.mutateAsync({ ticketId, content: newContent.trim() });
    setNewContent('');
    setShowAdd(false);
  };

  const handleUpdate = async (noteId: number) => {
    if (!editContent.trim()) return;
    await updateNote.mutateAsync({ noteId, content: editContent.trim(), ticketId });
    setEditingId(null);
  };

  const handleDelete = async (noteId: number) => {
    await deleteNote.mutateAsync({ noteId, ticketId });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Poznámky</h4>
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3 mr-1" /> Přidat
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-2">
          <Textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Nová poznámka (Markdown)..."
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={createNote.isPending}>
              <Save className="h-3 w-3 mr-1" /> Uložit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewContent(''); }}>
              <X className="h-3 w-3 mr-1" /> Zrušit
            </Button>
          </div>
        </div>
      )}

      {notes.map((note: TicketNote) => (
        <div key={note.id} className="rounded-lg ring-1 ring-border/30 p-3 text-sm">
          {editingId === note.id ? (
            <div className="space-y-2">
              <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleUpdate(note.id)}>
                  <Save className="h-3 w-3 mr-1" /> Uložit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <Markdown className="flex-1">{note.content}</Markdown>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(note.id); setEditContent(note.content); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(note.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(note.updated_at).toLocaleString('cs')}
              </p>
            </>
          )}
        </div>
      ))}

      {notes.length === 0 && !showAdd && (
        <p className="text-xs text-muted-foreground">Žádné poznámky</p>
      )}
    </div>
  );
}
