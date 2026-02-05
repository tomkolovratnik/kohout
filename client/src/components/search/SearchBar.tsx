import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/api/search';
import { useUiStore } from '@/stores/ui-store';


export function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const selectTicket = useUiStore(s => s.selectTicket);

  const { data: results = [] } = useSearch(debouncedQuery);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = useCallback((ticketId: number) => {
    selectTicket(ticketId);
    navigate('/tickets');
    setOpen(false);
    setQuery('');
  }, [selectTicket, navigate]);

  return (
    <div ref={ref} className="relative flex-1 max-w-3xl">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder="Hledat tikety..."
        className="pl-8 pr-16 bg-secondary/50"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => query.length >= 2 && setOpen(true)}
      />
      <div className="absolute right-2.5 top-2 flex items-center gap-1">
        {query ? (
          <button onClick={() => { setQuery(''); setOpen(false); }}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground ring-1 ring-border/40">
            Ctrl+K
          </kbd>
        )}
      </div>

      {open && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover/95 backdrop-blur-md ring-1 ring-border/40 rounded-lg shadow-[var(--shadow-card-hover)] z-50 max-h-80 overflow-auto">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">Žádné výsledky</div>
          ) : (
            results.map((r: any) => (
              <button
                key={r.ticket_id}
                className="w-full text-left px-3 py-2 hover:bg-accent/60 transition-colors rounded-lg"
                onClick={() => handleSelect(r.ticket_id)}
              >
                <div className="flex items-center gap-2">
                  {r.external_id && (
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{r.external_id}</span>
                  )}
                  <p className="text-sm font-medium truncate">{r.title}</p>
                </div>
                {/* Snippet comes from server-side search highlighting (trusted source) */}
                <p
                  className="text-xs text-muted-foreground truncate"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
