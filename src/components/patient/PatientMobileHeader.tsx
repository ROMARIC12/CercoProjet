import { Bell, Search, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';

interface PatientMobileHeaderProps {
  unreadCount?: number;
  onNotificationsClick?: () => void;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
}

export function PatientMobileHeader({
  unreadCount = 0,
  onNotificationsClick,
  onSearchClick,
  onProfileClick,
}: PatientMobileHeaderProps) {
  const { profile } = useAuth();
  
  const initials = profile 
    ? `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`
    : 'U';

  return (
    <header className="sticky top-0 z-40 bg-background pt-2 px-4">
      <div className="flex items-center justify-between h-14">
        {/* Left - Profile Avatar */}
        <button
          onClick={onProfileClick}
          className="focus:outline-none focus:ring-2 focus:ring-[#1a5fb4] focus:ring-offset-2 rounded-full"
          aria-label="Mon profil"
        >
          <Avatar className="h-12 w-12 border-2 border-[#1a5fb4]">
            <AvatarImage src="" alt={`${profile?.first_name || 'User'}`} />
            <AvatarFallback className="bg-[#1a5fb4]/10 text-[#1a5fb4] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Right - Search and Notifications */}
        <div className="flex items-center gap-2">
          {onSearchClick && (
            <button
              onClick={onSearchClick}
              className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              aria-label="Rechercher"
            >
              <Search className="h-5 w-5 text-gray-700" />
            </button>
          )}
          
          {onNotificationsClick && (
            <button
              onClick={onNotificationsClick}
              className="relative w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} non lues` : ''}`}
            >
              <Bell className="h-5 w-5 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
