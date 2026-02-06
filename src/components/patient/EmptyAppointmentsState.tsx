import { Calendar, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyAppointmentsStateProps {
  onBookAppointment: () => void;
  onVoiceBooking?: () => void;
}

export function EmptyAppointmentsState({ onBookAppointment, onVoiceBooking }: EmptyAppointmentsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Calendar className="h-8 w-8 text-primary" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2 text-foreground">
        Aucun rendez-vous
      </h3>
      <p className="text-muted-foreground mb-8 max-w-xs">
        Prenez rendez-vous avec un professionnel de santé
      </p>
      
      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={onBookAppointment}
          size="lg"
          className="w-full"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Prendre un rendez-vous
        </Button>
        
        {onVoiceBooking && (
          <Button
            onClick={onVoiceBooking}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <Mic className="h-4 w-4 mr-2" />
            Réserver par la voix
          </Button>
        )}
      </div>
    </div>
  );
}
