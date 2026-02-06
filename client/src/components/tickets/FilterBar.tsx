import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useFiltersStore } from '@/stores/filters-store';
import { useUiStore } from '@/stores/ui-store';
import { useCategories } from '@/api/categories';
import { useTags } from '@/api/tags';
import { RotateCcw, FolderTree, LayoutList, LayoutGrid } from 'lucide-react';

interface FilterBarProps {
  foldersPanelOpen?: boolean;
  onToggleFolders?: () => void;
}

export function FilterBar({ foldersPanelOpen, onToggleFolders }: FilterBarProps = {}) {
  const { status, priority, provider_type, sort_by, sort_order, category_id, tag_id, setFilter, resetFilters } = useFiltersStore();
  const ticketViewMode = useUiStore(s => s.ticketViewMode);
  const setTicketViewMode = useUiStore(s => s.setTicketViewMode);
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  return (
    <div className="flex items-center gap-2 p-3 shadow-[0_1px_0_0_var(--color-border)] flex-wrap">
      {onToggleFolders && (
        <Button variant={foldersPanelOpen ? 'default' : 'outline'} size="icon" className="h-9 w-9 shrink-0" onClick={onToggleFolders} title="Zobrazit/skrýt složky">
          <FolderTree className="h-4 w-4" />
        </Button>
      )}

      <div className="flex items-center rounded-md ring-1 ring-border/40 shrink-0">
        <Button
          variant={ticketViewMode === 'cards' ? 'default' : 'ghost'}
          size="icon"
          className="h-9 w-9 rounded-r-none"
          onClick={() => setTicketViewMode('cards')}
          title="Kartové zobrazení"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={ticketViewMode === 'compact' ? 'default' : 'ghost'}
          size="icon"
          className="h-9 w-9 rounded-l-none"
          onClick={() => setTicketViewMode('compact')}
          title="Kompaktní zobrazení"
        >
          <LayoutList className="h-4 w-4" />
        </Button>
      </div>

      <Select value={status} onChange={e => setFilter('status', e.target.value)}>
        <option value="">Všechny stavy</option>
        <option value="open">Otevřené</option>
        <option value="in_progress">V řešení</option>
        <option value="resolved">Vyřešené</option>
        <option value="closed">Uzavřené</option>
        <option value="unknown">Neznámý stav</option>
      </Select>

      <Select value={priority} onChange={e => setFilter('priority', e.target.value)}>
        <option value="">Všechny priority</option>
        <option value="critical">Kritická</option>
        <option value="high">Vysoká</option>
        <option value="medium">Střední</option>
        <option value="low">Nízká</option>
      </Select>

      <Select value={provider_type} onChange={e => setFilter('provider_type', e.target.value)}>
        <option value="">Všechny zdroje</option>
        <option value="jira">Jira</option>
        <option value="azure-devops">Azure DevOps</option>
      </Select>

      <Select value={category_id} onChange={e => setFilter('category_id', e.target.value)}>
        <option value="">Všechny kategorie</option>
        {categories.map((c: any) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>

      <Select value={tag_id} onChange={e => setFilter('tag_id', e.target.value)}>
        <option value="">Všechny tagy</option>
        {tags.map((t: any) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </Select>

      <Select value={`${sort_by}:${sort_order}`} onChange={e => {
        const [sb, so] = e.target.value.split(':');
        setFilter('sort_by', sb);
        setFilter('sort_order', so);
      }}>
        <option value="updated_at:desc">Poslední aktualizace</option>
        <option value="created_at:desc">Nejnovější</option>
        <option value="created_at:asc">Nejstarší</option>
        <option value="priority:asc">Priorita</option>
        <option value="title:asc">Název A-Z</option>
        <option value="title:desc">Název Z-A</option>
        <option value="external_id:asc">Tiket vzestupně</option>
        <option value="external_id:desc">Tiket sestupně</option>
      </Select>

      <Button variant="ghost" size="icon" onClick={resetFilters} title="Reset filtrů">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
