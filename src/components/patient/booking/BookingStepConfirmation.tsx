import { CheckCircle, CalendarCheck, Clock, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BookingStepConfirmationProps {
  clinicName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  queuePosition: number;
  onViewAppointments: () => void;
}

export function BookingStepConfirmation({
  clinicName,
  doctorName,
  appointmentDate,
  appointmentTime,
  queuePosition,
  onViewAppointments,
}: BookingStepConfirmationProps) {
  return (
    <div className="flex flex-col h-full bg-[#f5f7fa]">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 mb-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle className="h-14 w-14 text-white" />
        </div>

        {/* Success Message */}
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Rendez-vous confirmé !
        </h2>
        <p className="text-muted-foreground mb-8">
          Votre rendez-vous a été réservé avec succès.
          <br />
          Un reçu vous a été envoyé.
        </p>

        {/* Appointment Details Card */}
        <Card className="w-full max-w-sm bg-white rounded-2xl shadow-sm mb-6">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e8f0fd] flex items-center justify-center">
                <MapPin className="h-5 w-5 text-[#1a5fb4]" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Centre</p>
                <p className="font-semibold text-foreground">{clinicName || 'Non spécifié'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e8f0fd] flex items-center justify-center">
                <User className="h-5 w-5 text-[#1a5fb4]" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Médecin</p>
                <p className="font-semibold text-foreground">{doctorName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e8f0fd] flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-[#1a5fb4]" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Date & Heure</p>
                <p className="font-semibold text-foreground">{appointmentDate} à {appointmentTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Position */}
        <Card className="w-full max-w-sm bg-gradient-to-br from-[#1a5fb4] to-[#1a4b9c] rounded-2xl shadow-lg">
          <CardContent className="p-5 text-center text-white">
            <p className="text-sm opacity-80 mb-2">Votre position dans la file d'attente</p>
            <p className="text-5xl font-bold">#{queuePosition}</p>
            <p className="text-xs opacity-70 mt-2">
              Vous serez notifié à l'approche de votre tour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="p-4 bg-white border-t border-gray-100">
        <Button
          onClick={onViewAppointments}
          className="w-full h-14 rounded-2xl bg-[#1a5fb4] hover:bg-[#1a4b9c] text-white font-semibold text-base"
        >
          <CalendarCheck className="h-5 w-5 mr-2" />
          Voir mes rendez-vous
        </Button>
      </div>
    </div>
  );
}
