import { useAuth } from '@/hooks/useAuth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { role, profile } = useAuth();

  const getRoleBadge = () => {
    const roleLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      admin: { label: 'Admin', variant: 'default' },
      doctor: { label: 'Médecin', variant: 'secondary' },
      secretary: { label: 'Secrétaire', variant: 'outline' },
      patient: { label: 'Patient', variant: 'outline' },
    };
    return roleLabels[role || ''] || { label: 'Inconnu', variant: 'outline' as const };
  };

  const badge = getRoleBadge();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</p>
            <p className="text-xs text-muted-foreground">{profile?.phone}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
