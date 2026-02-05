import type { ReactNode } from 'react';
import { SearchBar } from '@/components/search/SearchBar';

interface HeaderProps {
  title: string;
  actions?: ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="h-12 shadow-[0_1px_0_0_var(--color-border)] flex items-center gap-6 px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
      <h2 className="text-base font-semibold shrink-0 font-heading">{title}</h2>
      <SearchBar />
      {actions && <div className="shrink-0 ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
}
