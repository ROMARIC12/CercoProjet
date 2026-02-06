import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Video,
  Wallet,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface PatientSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const mainMenuItems = [
  { id: 'home', icon: LayoutDashboard, label: 'Tableau de bord' },
  { id: 'rdv', icon: Calendar, label: 'Mes Rendez-vous' },
  { id: 'ordonnances', icon: FileText, label: 'Mes Ordonnances' },
  { id: 'teleconsultation', icon: Video, label: 'Téléconsultation' },
  { id: 'wallet', icon: Wallet, label: 'Portefeuille' },
];

const secondaryMenuItems = [
  { id: 'settings', icon: Settings, label: 'Paramètres' },
  { id: 'help', icon: HelpCircle, label: 'Aide & Support' },
];

export function PatientSidebar({ activeTab, onTabChange, isOpen = true, onClose }: PatientSidebarProps) {
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    onClose?.();
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return 'P';
  };

  return (
    <>
      {/* Overlay for mobile */}
      {/* Overlay for mobile and desktop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-50 flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* User Profile Section */}
        <div className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-4 ring-primary/20">
              <AvatarImage src="" alt="Profile" />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-foreground truncate">
                {profile?.first_name} {profile?.last_name}
              </h2>
              <p className="text-sm text-primary font-medium">Patient</p>
            </div>
          </div>
        </div>

        <Separator className="mx-4" />

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {mainMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200',
                activeTab === item.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-secondary hover:text-primary'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <Separator className="mx-4" />

        {/* Secondary Navigation */}
        <div className="p-4 space-y-1">
          {secondaryMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200',
                activeTab === item.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-secondary hover:text-primary'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <div className="p-4 mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
