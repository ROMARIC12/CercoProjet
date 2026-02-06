import { useState } from 'react';
import { Mic, MicOff, Loader2, Volume2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useVoiceBooking } from '@/hooks/useVoiceBooking';
import { cn } from '@/lib/utils';

interface VoiceBookingButtonProps {
  doctorId: string | null;
  patientId: string | null;
  clinicId: string | null;
  onSuccess?: (appointmentId: string) => void;
  disabled?: boolean;
}

const STEP_LABELS: Record<string, string> = {
  idle: 'Prêt',
  greeting: 'Accueil...',
  waiting_confirm: 'Écoute en cours...',
  listing_slots: 'Recherche des disponibilités...',
  waiting_choice: 'Écoute de votre choix...',
  confirming: 'Confirmation...',
  booking: 'Réservation en cours...',
  done: 'Terminé !',
  error: 'Erreur',
};

const STEP_PROGRESS: Record<string, number> = {
  idle: 0,
  greeting: 15,
  waiting_confirm: 30,
  listing_slots: 45,
  waiting_choice: 60,
  confirming: 75,
  booking: 90,
  done: 100,
  error: 0,
};

export function VoiceBookingButton({ 
  doctorId, 
  patientId, 
  clinicId, 
  onSuccess,
  disabled 
}: VoiceBookingButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const {
    step,
    isListening,
    isSpeaking,
    transcript,
    error,
    availableSlots,
    selectedSlot,
    startVoiceBooking,
    stopVoiceBooking,
  } = useVoiceBooking(doctorId, patientId, clinicId, (appointmentId) => {
    onSuccess?.(appointmentId);
    // Keep dialog open to show success state
    setTimeout(() => setDialogOpen(false), 3000);
  });

  const handleStart = async () => {
    setDialogOpen(true);
    
    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Microphone permission denied:', err);
      return;
    }
    
    // Small delay to let the dialog open
    setTimeout(() => {
      startVoiceBooking();
    }, 500);
  };

  const handleClose = () => {
    stopVoiceBooking();
    setDialogOpen(false);
  };

  const isActive = step !== 'idle' && step !== 'done' && step !== 'error';

  return (
    <>
      <Button
        onClick={handleStart}
        disabled={disabled || !doctorId || !patientId}
        variant="outline"
        size="lg"
        className="w-full py-6 border-dashed border-2 border-primary/50 hover:border-primary hover:bg-primary/5 gap-3"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Mic className="h-6 w-6 text-primary" />
        </div>
        <div className="text-left flex-1">
          <p className="font-medium text-base">Réserver par la voix</p>
          <p className="text-xs text-muted-foreground">Pour personnes ne sachant pas lire</p>
        </div>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Réservation vocale
            </DialogTitle>
            <DialogDescription>
              Parlez normalement, le système vous guidera
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Progress indicator */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{STEP_LABELS[step]}</span>
                <span className="text-muted-foreground">{STEP_PROGRESS[step]}%</span>
              </div>
              <Progress value={STEP_PROGRESS[step]} className="h-2" />
            </div>

            {/* Voice activity indicator */}
            <div className="flex justify-center">
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
                isSpeaking && "bg-primary/20 animate-pulse",
                isListening && "bg-green-500/20 animate-pulse",
                step === 'done' && "bg-green-500/20",
                step === 'error' && "bg-destructive/20",
                !isActive && step !== 'done' && step !== 'error' && "bg-muted"
              )}>
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all",
                  isSpeaking && "bg-primary/30",
                  isListening && "bg-green-500/30",
                  step === 'done' && "bg-green-500/30",
                  step === 'error' && "bg-destructive/30",
                  !isActive && step !== 'done' && step !== 'error' && "bg-muted"
                )}>
                  {step === 'booking' ? (
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  ) : step === 'done' ? (
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  ) : step === 'error' ? (
                    <AlertCircle className="h-10 w-10 text-destructive" />
                  ) : isSpeaking ? (
                    <Volume2 className="h-10 w-10 text-primary animate-bounce" />
                  ) : isListening ? (
                    <Mic className="h-10 w-10 text-green-600" />
                  ) : (
                    <MicOff className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            {/* Status text */}
            <div className="text-center space-y-2">
              {isSpeaking && (
                <p className="text-sm font-medium text-primary">Le système parle...</p>
              )}
              {isListening && (
                <p className="text-sm font-medium text-green-600">Parlez maintenant...</p>
              )}
              {transcript && (
                <p className="text-sm text-muted-foreground bg-muted rounded-lg p-2">
                  « {transcript} »
                </p>
              )}
              {step === 'done' && (
                <p className="text-sm font-medium text-green-600">
                  Rendez-vous confirmé pour {selectedSlot?.timeFormatted}
                </p>
              )}
              {step === 'error' && (
                <p className="text-sm font-medium text-destructive">
                  {error || 'Une erreur s\'est produite'}
                </p>
              )}
            </div>

            {/* Available slots (shown during listing) */}
            {step === 'waiting_choice' && availableSlots.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">Créneaux disponibles :</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {availableSlots.map((slot, i) => (
                    <span 
                      key={slot.dateStr + slot.time} 
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                    >
                      {i + 1}. {slot.timeFormatted}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {isActive && (
              <Button 
                variant="destructive" 
                onClick={handleClose}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            )}
            {(step === 'idle' || step === 'error') && (
              <>
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Fermer
                </Button>
                {step === 'error' && (
                  <Button onClick={startVoiceBooking} className="flex-1">
                    Réessayer
                  </Button>
                )}
              </>
            )}
            {step === 'done' && (
              <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Terminé
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
