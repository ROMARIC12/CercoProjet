import { Home, Calendar, FileText, Video, Wallet, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Accueil' },
  { id: 'rdv', icon: Calendar, label: 'RDV' },
  { id: 'ordonnances', icon: FileText, label: 'Ordonnances' },
  { id: 'teleconsultation', icon: Video, label: 'Téléconsult' },
  { id: 'wallet', icon: Wallet, label: 'Portefeuille' },
];

export function MobileBottomNav({ activeTab, onTabChange, onMenuClick }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 lg:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 px-1 rounded-lg transition-colors',
              activeTab === item.id
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
            aria-label={item.label}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <item.icon 
              className="h-5 w-5 flex-shrink-0" 
              strokeWidth={activeTab === item.id ? 2.5 : 1.5} 
            />
            <span className="text-[10px] font-medium truncate max-w-full">{item.label}</span>
          </button>
        ))}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 px-1 rounded-lg text-muted-foreground transition-colors"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-[10px] font-medium">Plus</span>
        </button>
      </div>
    </nav>
  );
}
