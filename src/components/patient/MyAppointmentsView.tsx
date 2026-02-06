import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  is_first_visit?: boolean;
  doctor: {
    id: string;
    specialty: string;
    photo_url?: string;
    profile: {
      first_name: string;
      last_name: string;
    };
  };
  clinic: {
    name: string;
    address: string;
  } | null;
}

interface MyAppointmentsViewProps {
  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];
  onBack?: () => void;
  onViewDetails?: (appointmentId: string) => void;
  onReschedule?: (appointmentId: string) => void;
}

export function MyAppointmentsView({
  upcomingAppointments,
  pastAppointments,
  onBack,
  onViewDetails,
  onReschedule,
}: MyAppointmentsViewProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { label: 'CONFIRMÉ', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
      case 'pending':
        return { label: 'EN ATTENTE', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' };
      case 'completed':
        return { label: 'TERMINÉ', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-500' };
      case 'cancelled':
        return { label: 'ANNULÉ', color: 'bg-red-100 text-red-600', dot: 'bg-red-500' };
      case 'no_show':
        return { label: 'ABSENT', color: 'bg-orange-100 text-orange-600', dot: 'bg-orange-500' };
      default:
        return { label: status.toUpperCase(), color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-500' };
    }
  };

  const formatAppointmentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "EEEE d MMMM yyyy", { locale: fr });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const appointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const renderAppointmentCard = (apt: Appointment, isUpcoming: boolean) => {
    const statusConfig = getStatusConfig(apt.status);
    const doctorName = `Dr. ${apt.doctor.profile.first_name} ${apt.doctor.profile.last_name}`;
    const initials = `${apt.doctor.profile.first_name[0]}${apt.doctor.profile.last_name[0]}`;

    return (
      <div
        key={apt.id}
        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
      >
        {/* Status & Doctor Info */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('w-2 h-2 rounded-full', statusConfig.dot)} />
              <span className={cn('text-xs font-semibold', statusConfig.color.split(' ')[1])}>
                {statusConfig.label}
              </span>
            </div>
            <h3 className="font-bold text-foreground text-lg">{doctorName}</h3>
            <p className="text-muted-foreground text-sm">
              {apt.doctor.specialty} • {apt.clinic?.name || 'Cabinet'}
            </p>
          </div>
          <Avatar className="h-14 w-14 border-2 border-white shadow-md">
            <AvatarImage src={apt.doctor.photo_url} alt={doctorName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Date & Time - Only for upcoming */}
        {isUpcoming && (
          <div className="bg-secondary rounded-xl p-3 flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm capitalize">
                {formatAppointmentDate(apt.appointment_date)}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatTime(apt.appointment_time)} - {formatTime(apt.appointment_time).replace(/:\d{2}$/, ':30')}
              </p>
            </div>
          </div>
        )}

        {/* Date for past appointments */}
        {!isUpcoming && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(apt.appointment_date), 'd MMMM yyyy', { locale: fr })}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {isUpcoming ? (
            <>
              <Button
                onClick={() => onViewDetails?.(apt.id)}
                className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Détails
              </Button>
              <Button
                variant="outline"
                onClick={() => onReschedule?.(apt.id)}
                className="flex-1 h-11 rounded-xl border-gray-200 text-foreground font-semibold hover:bg-gray-50"
              >
                Reprogrammer
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              onClick={() => onViewDetails?.(apt.id)}
              className="ml-auto text-primary font-semibold hover:bg-primary/10 px-4"
            >
              {apt.status === 'completed' ? 'Revoir' : 'Détails'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-secondary">
      {/* Header */}
      <header className="w-full bg-white py-4 px-4 flex items-center justify-center relative border-b border-gray-100">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute left-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-primary hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-lg font-bold text-foreground">Mes Rendez-vous</h1>
      </header>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="bg-gray-100 rounded-xl p-1 flex">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
              activeTab === 'upcoming'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            À venir
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
              activeTab === 'past'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Passés
          </button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-4 pt-4 pb-24">
        {activeTab === 'upcoming' && (
          <>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Prochain rendez-vous
            </h2>
            <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((apt) => renderAppointmentCard(apt, true))
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun rendez-vous à venir</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'past' && (
          <>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Historique récent
            </h2>
            <div className="space-y-4">
              {pastAppointments.length > 0 ? (
                pastAppointments.map((apt) => renderAppointmentCard(apt, false))
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun historique</p>
                </div>
              )}
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
}
