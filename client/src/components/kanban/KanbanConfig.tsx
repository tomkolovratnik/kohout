import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useCreateColumn, useDeleteColumn, useCreateSwimlane, useDeleteSwimlane, useAutoGenerateSwimlanes } from '@/api/kanban';
import { ColorPicker } from '@/components/ui/color-picker';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { KanbanColumn, KanbanSwimlane } from '@kohout/shared';

interface KanbanConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: number;
  columns: KanbanColumn[];
  swimlanes: KanbanSwimlane[];
}

export function KanbanConfig({ open, onOpenChange, boardId, columns, swimlanes }: KanbanConfigProps) {
  const createColumn = useCreateColumn();
  const deleteColumn = useDeleteColumn();
  const createSwimlane = useCreateSwimlane();
  const deleteSwimlane = useDeleteSwimlane();
  const autoGenerate = useAutoGenerateSwimlanes();

  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState('#6366f1');
  const [newColWip, setNewColWip] = useState('');

  const [newSwimName, setNewSwimName] = useState('');
  const [autoGroupBy, setAutoGroupBy] = useState('');

  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    await createColumn.mutateAsync({
      boardId,
      name: newColName.trim(),
      sort_order: columns.length,
      color: newColColor,
      wip_limit: newColWip ? Number(newColWip) : undefined,
    });
    setNewColName('');
    setNewColWip('');
  };

  const handleAddSwimlane = async () => {
    if (!newSwimName.trim()) return;
    await createSwimlane.mutateAsync({
      boardId,
      name: newSwimName.trim(),
      sort_order: swimlanes.length,
    });
    setNewSwimName('');
  };

  const handleAutoGenerate = async () => {
    if (!autoGroupBy) return;
    await autoGenerate.mutateAsync({ boardId, group_by: autoGroupBy });
    toast.success('Swimlanes vygenerovány');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Konfigurace nástěnky</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <h4 className="text-sm font-semibold mb-2 font-heading">Sloupce</h4>
            <div className="space-y-2">
              {columns.map(col => (
                <div key={col.id} className="flex items-center gap-2">
                  {col.color && <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />}
                  <span className="text-sm flex-1">{col.name}</span>
                  {col.wip_limit && <span className="text-xs text-muted-foreground">WIP: {col.wip_limit}</span>}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteColumn.mutate({ id: col.id, boardId })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2 mt-2">
              <div className="flex-1">
                <Input placeholder="Název sloupce" value={newColName} onChange={e => setNewColName(e.target.value)} />
              </div>
              <Input placeholder="WIP" value={newColWip} onChange={e => setNewColWip(e.target.value)} className="w-16" />
              <Button size="sm" onClick={handleAddColumn}><Plus className="h-3 w-3" /></Button>
            </div>
            <ColorPicker value={newColColor} onChange={setNewColColor} className="mt-2" />
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-2 font-heading">Swimlanes</h4>

            <div className="flex items-center gap-2 mb-2">
              <Label className="text-xs shrink-0">Auto-grouping:</Label>
              <Select value={autoGroupBy} onChange={e => setAutoGroupBy(e.target.value)} className="text-xs">
                <option value="">Vyberte...</option>
                <option value="category">Kategorie</option>
                <option value="assignee">Assignee</option>
                <option value="priority">Priorita</option>
                <option value="source">Zdroj</option>
                <option value="tag">Tag</option>
              </Select>
              <Button size="sm" variant="outline" onClick={handleAutoGenerate} disabled={!autoGroupBy}>
                Generovat
              </Button>
            </div>

            <div className="space-y-2">
              {swimlanes.map(sw => (
                <div key={sw.id} className="flex items-center gap-2">
                  <span className="text-sm flex-1">{sw.name}</span>
                  {sw.group_by && <span className="text-xs text-muted-foreground">{sw.group_by}: {sw.group_value}</span>}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteSwimlane.mutate({ id: sw.id, boardId })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input placeholder="Název swimlane (manuální)" value={newSwimName} onChange={e => setNewSwimName(e.target.value)} className="flex-1" />
              <Button size="sm" onClick={handleAddSwimlane}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Zavřít</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
