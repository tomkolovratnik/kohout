import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Mail, Kanban, Settings, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/theme-store';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Mail, label: 'Tikety' },
  { to: '/kanban', icon: Kanban, label: 'Kanban' },
  { to: '/settings', icon: Settings, label: 'Nastavení' },
];

const themeIcons = { light: Sun, dark: Moon, system: Monitor } as const;
const themeLabels = { light: 'Světlý', dark: 'Tmavý', system: 'Systém' } as const;
const themeCycle = { light: 'dark', dark: 'system', system: 'light' } as const;

export function Sidebar() {
  const { mode, setTheme } = useThemeStore();
  const ThemeIcon = themeIcons[mode];

  return (
    <aside className="w-56 bg-sidebar-background flex flex-col h-full shadow-[1px_0_0_0_var(--color-border)]">
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="Kohout" className="h-6 w-6" />
          <h1 className="text-lg font-bold tracking-tight font-heading">Kohout</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Správa tiketů</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground rounded-lg'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-2">
        <button
          onClick={() => setTheme(themeCycle[mode])}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-all duration-150 w-full"
          title={`Režim: ${themeLabels[mode]}`}
        >
          <ThemeIcon className="h-4 w-4" />
          {themeLabels[mode]}
        </button>
      </div>
    </aside>
  );
}
