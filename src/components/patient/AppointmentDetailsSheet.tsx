import { Calendar, Clock, MapPin, User, Stethoscope, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  is_first_visit?: boolean;
  doctor: {
    id: string;
    specialty: string;
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

interface AppointmentDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

const statusMap: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmé', color: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Terminé', color: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Annulé', color: 'bg-destructive/10 text-destructive' },
  no_show: { label: 'Absent', color: 'bg-orange-100 text-orange-600' },
};

export function AppointmentDetailsSheet({ open, onClose, appointment }: AppointmentDetailsSheetProps) {
  if (!appointment) return null;

  const doctorName = `Dr. ${appointment.doctor.profile.first_name} ${appointment.doctor.profile.last_name}`;
  const initials = `${appointment.doctor.profile.first_name[0]}${appointment.doctor.profile.last_name[0]}`;
  const status = statusMap[appointment.status] || { label: appointment.status, color: 'bg-muted text-muted-foreground' };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">Détails du rendez-vous</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Doctor */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-lg text-foreground">{doctorName}</h3>
              <p className="text-muted-foreground text-sm">{appointment.doctor.specialty}</p>
              <Badge className={cn('mt-1 text-xs', status.color)}>{status.label}</Badge>
            </div>
          </div>

          {/* Info cards */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
              <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-semibold text-foreground capitalize">
                  {format(new Date(appointment.appointment_date), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
              <Clock className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Heure</p>
                <p className="font-semibold text-foreground">{appointment.appointment_time.substring(0, 5)}</p>
              </div>
            </div>

            {appointment.clinic && (
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Lieu</p>
                  <p className="font-semibold text-foreground">{appointment.clinic.name}</p>
                  <p className="text-xs text-muted-foreground">{appointment.clinic.address}</p>
                </div>
              </div>
            )}

            {appointment.is_first_visit && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <User className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm font-medium text-primary">Première visite</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
