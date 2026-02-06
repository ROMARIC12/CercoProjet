import { Bell, Check, CheckCheck, Calendar, CreditCard, AlertTriangle, Info, Users, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { NotificationActions } from './NotificationActions';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState, useEffect, useRef } from 'react';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'appointment':
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case 'payment':
      return <CreditCard className="h-4 w-4 text-green-500" />;
    case 'urgent':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'queue_update':
      return <Users className="h-4 w-4 text-amber-500" />;
    case 'reminder':
      return <Bell className="h-4 w-4 text-purple-500" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
};

type FilterType = 'all' | 'appointment' | 'payment' | 'urgent';

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, refetch } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastUrgentCountRef = useRef(0);

  // Play sound for urgent notifications
  useEffect(() => {
    const urgentNotifications = notifications.filter(n => n.type === 'urgent' && !n.is_read);
    
    if (soundEnabled && urgentNotifications.length > lastUrgentCountRef.current) {
      // New urgent notification - play sound
      playUrgentSound();
    }
    
    lastUrgentCountRef.current = urgentNotifications.length;
  }, [notifications, soundEnabled]);

  const playUrgentSound = () => {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Beep pattern: on-off-on
      setTimeout(() => {
        gainNode.gain.value = 0;
      }, 150);
      setTimeout(() => {
        gainNode.gain.value = 0.3;
      }, 200);
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 350);
    } catch (error) {
      console.log('Could not play sound:', error);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const getFilterCount = (type: FilterType) => {
    if (type === 'all') return notifications.filter(n => !n.is_read).length;
    return notifications.filter(n => n.type === type && !n.is_read).length;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3 w-3" />
                Tout lire
              </Button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-9 rounded-none border-b">
            <TabsTrigger value="all" className="text-xs">
              Tous {getFilterCount('all') > 0 && `(${getFilterCount('all')})`}
            </TabsTrigger>
            <TabsTrigger value="appointment" className="text-xs">
              RDV {getFilterCount('appointment') > 0 && `(${getFilterCount('appointment')})`}
            </TabsTrigger>
            <TabsTrigger value="payment" className="text-xs">
              Paiements
            </TabsTrigger>
            <TabsTrigger value="urgent" className="text-xs text-red-500">
              Urgences {getFilterCount('urgent') > 0 && `(${getFilterCount('urgent')})`}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Chargement...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                {filter === 'all' ? 'Aucune notification' : `Aucune notification de type ${filter}`}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  } ${notification.type === 'urgent' && !notification.is_read ? 'border-l-4 border-l-red-500' : ''}`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                      
                      {/* Quick actions for actionable notifications */}
                      {notification.data && (notification.data as Record<string, any>).action && (
                        <NotificationActions
                          notificationId={notification.id}
                          type={notification.type}
                          data={notification.data as Record<string, any>}
                          onActionComplete={refetch}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
