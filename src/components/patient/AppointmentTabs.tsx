import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Video, Calendar } from 'lucide-react';

interface AppointmentTabsProps {
  activeTab: 'rdv' | 'teleconsultation';
  onTabChange: (tab: 'rdv' | 'teleconsultation') => void;
  onlineDoctorsCount?: number;
}

export function AppointmentTabs({ activeTab, onTabChange, onlineDoctorsCount = 0 }: AppointmentTabsProps) {
  return (
    <div className="flex bg-muted/50 mx-4 mt-4 rounded-2xl p-1.5">
      <button
        onClick={() => onTabChange('rdv')}
        className={cn(
          'flex-1 py-3.5 text-center font-medium transition-all duration-200 rounded-xl flex items-center justify-center gap-2.5',
          activeTab === 'rdv'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-selected={activeTab === 'rdv'}
        role="tab"
      >
        <Calendar className="h-5 w-5" />
        <span className="text-sm">Mes RDV</span>
      </button>
      <button
        onClick={() => onTabChange('teleconsultation')}
        className={cn(
          'flex-1 py-3.5 text-center font-medium transition-all duration-200 rounded-xl flex items-center justify-center gap-2.5',
          activeTab === 'teleconsultation'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-selected={activeTab === 'teleconsultation'}
        role="tab"
      >
        <Video className="h-5 w-5" />
        <span className="text-sm">Téléconsultation</span>
        {onlineDoctorsCount > 0 && (
          <Badge 
            className="h-5 min-w-[20px] rounded-full text-xs bg-success text-success-foreground border-0"
          >
            {onlineDoctorsCount}
          </Badge>
        )}
      </button>
    </div>
  );
}
