import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, AlertTriangle, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AppointmentCardProps {
  appointment: {
    id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    is_first_visit?: boolean;
    doctor?: {
      specialty: string;
      profile?: {
        first_name: string;
        last_name: string;
      };
    };
    clinic?: {
      name: string;
      address: string;
    } | null;
  };
  showActions?: boolean;
  onCancel?: (id: string) => void;
  queuePosition?: number;
  estimatedWaitTime?: number;
}

export function AppointmentCard({
  appointment,
  showActions = false,
  onCancel,
  queuePosition,
  estimatedWaitTime,
}: AppointmentCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-success/10 text-success border-0 font-medium">Confirmé</Badge>;
      case 'completed':
        return <Badge className="bg-primary/10 text-primary border-0 font-medium">Terminé</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning border-0 font-medium">En attente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="font-medium">Annulé</Badge>;
      case 'no_show':
        return <Badge variant="destructive" className="font-medium">Absent</Badge>;
      default:
        return <Badge variant="outline" className="font-medium">{status}</Badge>;
    }
  };

  const appointmentDate = new Date(appointment.appointment_date);
  const isToday = format(new Date(), 'yyyy-MM-dd') === appointment.appointment_date;
  const isPast = appointmentDate < new Date() && !isToday;

  return (
    <Card className={`transition-all duration-200 ${
      isToday 
        ? 'border-primary/30 bg-primary/5' 
        : isPast 
          ? 'opacity-60' 
          : 'hover:shadow-elevated'
    }`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Date and Time */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Calendar className="h-4 w-4" />
                <span>
                  {isToday ? "Aujourd'hui" : format(appointmentDate, 'EEE d MMM', { locale: fr })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{appointment.appointment_time.slice(0, 5)}</span>
              </div>
            </div>

            {/* Doctor Info */}
            {appointment.doctor && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Dr. {appointment.doctor.profile?.first_name} {appointment.doctor.profile?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {appointment.doctor.specialty}
                  </p>
                </div>
              </div>
            )}

            {/* Clinic Info */}
            {appointment.clinic && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{appointment.clinic.name}</span>
              </div>
            )}

            {/* First Visit Warning */}
            {appointment.is_first_visit && (
              <div className="flex items-center gap-2 text-warning text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Première consultation</span>
              </div>
            )}

            {/* Queue Position */}
            {queuePosition !== undefined && queuePosition > 0 && (
              <div className="flex items-center gap-3 p-2 bg-secondary rounded-lg">
                <span className="text-sm font-semibold text-primary">
                  Position #{queuePosition}
                </span>
                {estimatedWaitTime !== undefined && estimatedWaitTime > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ~{estimatedWaitTime} min
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status and Actions */}
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(appointment.status)}
            
            {showActions && appointment.status !== 'cancelled' && appointment.status !== 'completed' && !isPast && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                onClick={() => onCancel?.(appointment.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
