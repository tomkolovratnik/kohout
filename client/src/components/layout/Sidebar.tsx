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
    <aside className="w-14 bg-sidebar-background flex flex-col items-center h-full shadow-[1px_0_0_0_var(--color-border)]">
      <div className="py-3">
        <img src="/favicon.ico" alt="Kohout" className="h-7 w-7" />
      </div>
      <nav className="flex-1 p-2 space-y-1 flex flex-col items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={item.label}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
          </NavLink>
        ))}
      </nav>
      <div className="p-2">
        <button
          onClick={() => setTheme(themeCycle[mode])}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-all duration-150"
          title={`Režim: ${themeLabels[mode]}`}
        >
          <ThemeIcon className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
