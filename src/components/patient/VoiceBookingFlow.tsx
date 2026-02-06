import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, Loader2, X, AlertCircle, CheckCircle2, Sparkles, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useVoiceBookingFlow, VoiceFlowStep } from '@/hooks/useVoiceBookingFlow';
import { MoneyFusionPayment } from './MoneyFusionPayment';
import { useAuth } from '@/hooks/useAuth';

interface VoiceBookingFlowProps {
  open: boolean;
  onClose: () => void;
  patientId: string | null;
  onSuccess?: () => void;
}

const stepLabels: Record<VoiceFlowStep, string> = {
  idle: 'Prêt',
  greeting: 'Bienvenue',
  waiting_rdv_confirm: 'Confirmation',
  asking_type: 'Type de RDV',
  waiting_type: 'Écoute...',
  asking_hospital: 'Choix hôpital',
  waiting_hospital: 'Écoute...',
  finding_doctor: 'Recherche',
  listing_slots: 'Créneaux',
  waiting_choice: 'Écoute...',
  recap: 'Récapitulatif',
  asking_payment_confirm: 'Paiement',
  redirecting_payment: 'Paiement',
  payment_success: 'Succès !',
  done: 'Terminé',
  error: 'Erreur',
};

const stepProgress: Record<VoiceFlowStep, number> = {
  idle: 0,
  greeting: 10,
  waiting_rdv_confirm: 15,
  asking_type: 20,
  waiting_type: 25,
  asking_hospital: 35,
  waiting_hospital: 40,
  finding_doctor: 50,
  listing_slots: 60,
  waiting_choice: 70,
  recap: 80,
  asking_payment_confirm: 90,
  redirecting_payment: 95,
  payment_success: 100,
  done: 100,
  error: 0,
};

// User-friendly step descriptions for illiterate users
const stepDescriptions: Partial<Record<VoiceFlowStep, string>> = {
  greeting: 'Je vous accueille',
  asking_type: 'Téléconsultation ou cabinet ?',
  waiting_type: 'Dites votre choix',
  asking_hospital: 'Dites le nom de votre hôpital',
  waiting_hospital: 'Je vous écoute...',
  finding_doctor: 'Je cherche un médecin disponible',
  listing_slots: 'Voici les dates disponibles',
  waiting_choice: 'Dites votre choix',
  recap: 'Vérifiez votre rendez-vous',
  asking_payment_confirm: 'Confirmez pour payer',
};

export function VoiceBookingFlow({
  open,
  onClose,
  patientId,
  onSuccess,
}: VoiceBookingFlowProps) {
  const { profile } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    appointmentId: string;
    amount: number;
    clinicName: string;
    slotFormatted: string;
  } | null>(null);

  const {
    step,
    isListening,
    isSpeaking,
    transcript,
    error,
    consultationType,
    selectedClinic,
    selectedSlot,
    startFlow,
    stopFlow,
    handlePaymentSuccess,
  } = useVoiceBookingFlow(
    patientId,
    (data) => {
      setPaymentData({
        appointmentId: data.appointmentId,
        amount: data.amount,
        clinicName: data.clinicName,
        slotFormatted: data.slot.timeFormatted,
      });
      setShowPayment(true);
    },
    () => {
      onSuccess?.();
      setTimeout(() => {
        handleClose();
      }, 3000);
    }
  );

  const handleClose = () => {
    stopFlow();
    setShowPayment(false);
    setPaymentData(null);
    onClose();
  };

  const handleStart = async () => {
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      startFlow();
    } catch (err) {
      console.error('Microphone permission denied:', err);
    }
  };

  const handlePaymentSuccessCallback = async () => {
    setShowPayment(false);
    await handlePaymentSuccess();
  };



  const isActive = step !== 'idle' && step !== 'done' && step !== 'error';
  const progress = stepProgress[step];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md mx-auto p-0 gap-0 overflow-hidden rounded-3xl">
        {/* Header - Gradient with clear status */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-primary/90 p-6 pb-8 text-primary-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-xl h-10 w-10"
            onClick={handleClose}
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
              <Mic className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Réservation vocale</DialogTitle>
              <p className="text-sm text-primary-foreground/80">
                Parlez, je vous écoute
              </p>
            </div>
          </div>

          {/* Progress - Clear visual feedback */}
          {isActive && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">{stepLabels[step]}</span>
                </div>
                <span className="text-sm bg-primary-foreground/20 px-2.5 py-1 rounded-full">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5 bg-primary-foreground/20" />
              {stepDescriptions[step] && (
                <p className="text-sm text-primary-foreground/90 mt-2">{stepDescriptions[step]}</p>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 bg-background">
          {showPayment && paymentData ? (
            <div className="space-y-5">
              <div className="text-center mb-5 p-4 bg-secondary rounded-2xl">
                <h3 className="font-semibold text-lg mb-1">Paiement de la consultation</h3>
                <p className="text-sm text-muted-foreground">
                  {paymentData.clinicName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {paymentData.slotFormatted}
                </p>
              </div>

              <MoneyFusionPayment
                amount={paymentData.amount}
                appointmentId={paymentData.appointmentId}
                patientId={patientId || ''}
                customerName={profile ? `${profile.first_name} ${profile.last_name}` : 'Patient'}
                customerPhone={profile?.phone || ''}
                onSuccess={handlePaymentSuccessCallback}
                onError={(error) => console.error('Payment error:', error)}
              />
            </div>
          ) : (
            <>
              {/* Voice Animation - Large and clear */}
              <div className="flex flex-col items-center justify-center py-10">
                <div
                  className={cn(
                    'relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300',
                    isListening && 'bg-accent/15',
                    isSpeaking && 'bg-primary/15',
                    !isListening && !isSpeaking && 'bg-muted'
                  )}
                >
                  {/* Pulsing rings - Larger and more visible */}
                  {(isListening || isSpeaking) && (
                    <>
                      <div
                        className={cn(
                          'absolute inset-0 rounded-full animate-ping opacity-25',
                          isListening && 'bg-accent',
                          isSpeaking && 'bg-primary'
                        )}
                        style={{ animationDuration: '1.5s' }}
                      />
                      <div
                        className={cn(
                          'absolute inset-3 rounded-full animate-pulse opacity-15',
                          isListening && 'bg-accent',
                          isSpeaking && 'bg-primary'
                        )}
                      />
                    </>
                  )}

                  {/* Icon - Larger for accessibility */}
                  <div
                    className={cn(
                      'relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-200',
                      isListening && 'bg-accent text-accent-foreground scale-110',
                      isSpeaking && 'bg-primary text-primary-foreground scale-105',
                      !isListening && !isSpeaking && 'bg-muted-foreground/20 text-muted-foreground'
                    )}
                  >
                    {isListening ? (
                      <Mic className="h-12 w-12" />
                    ) : isSpeaking ? (
                      <Volume2 className="h-12 w-12" />
                    ) : step === 'finding_doctor' ? (
                      <Loader2 className="h-12 w-12 animate-spin" />
                    ) : step === 'done' || step === 'payment_success' ? (
                      <CheckCircle2 className="h-12 w-12 text-success" />
                    ) : step === 'error' ? (
                      <AlertCircle className="h-12 w-12 text-destructive" />
                    ) : (
                      <MicOff className="h-12 w-12" />
                    )}
                  </div>
                </div>

                {/* Status Text - Clear and reassuring */}
                <div className="mt-8 text-center space-y-2">
                  {isListening && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-accent font-semibold text-lg">Je vous écoute...</p>
                      <p className="text-sm text-muted-foreground">Parlez maintenant</p>
                    </div>
                  )}
                  {isSpeaking && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-primary font-semibold text-lg">Je vous parle...</p>
                      <p className="text-sm text-muted-foreground">Écoutez attentivement</p>
                    </div>
                  )}
                  {step === 'finding_doctor' && (
                    <p className="text-muted-foreground text-base">
                      Recherche d'un médecin disponible...
                    </p>
                  )}
                  {step === 'done' && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-success font-semibold text-lg">
                        Rendez-vous confirmé !
                      </p>
                      <p className="text-sm text-muted-foreground">Vous allez recevoir une confirmation</p>
                    </div>
                  )}
                  {step === 'error' && (
                    <p className="text-destructive font-medium text-base">
                      {error || 'Une erreur est survenue'}
                    </p>
                  )}
                  {step === 'idle' && (
                    <p className="text-muted-foreground text-base">
                      Appuyez sur Démarrer pour commencer
                    </p>
                  )}
                </div>

                {/* Transcript - Visible feedback */}
                {transcript && (
                  <div className="mt-6 p-4 bg-secondary rounded-2xl w-full max-w-xs">
                    <p className="text-xs text-muted-foreground text-center mb-1">
                      Vous avez dit :
                    </p>
                    <p className="text-sm font-medium text-center text-foreground">
                      "{transcript}"
                    </p>
                  </div>
                )}

                {/* Context Info - Clear summary */}
                <div className="mt-5 space-y-2 w-full max-w-xs">
                  {consultationType && (
                    <div className="p-3 bg-secondary/50 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Type :</span>
                      <span className="font-medium capitalize">{consultationType === 'video' ? 'Téléconsultation' : 'Au cabinet'}</span>
                    </div>
                  )}
                  {selectedClinic && (
                    <div className="mt-5 p-4 bg-primary/5 border border-primary/20 rounded-2xl text-center w-full max-w-xs">
                      <p className="text-sm text-muted-foreground">Hôpital sélectionné :</p>
                      <p className="font-semibold text-foreground">{selectedClinic.name}</p>
                      {selectedSlot && (
                        <>
                          <p className="text-sm text-muted-foreground mt-2">Date choisie :</p>
                          <p className="font-semibold text-foreground">{selectedSlot.timeFormatted}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions - Large, clear buttons */}
              <div className="space-y-3 mt-4">
                {step === 'idle' && (
                  <Button
                    onClick={handleStart}
                    className="w-full py-7 text-lg font-semibold rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:scale-[1.02]"
                  >
                    <Mic className="h-6 w-6 mr-3" />
                    Démarrer
                  </Button>
                )}

                {step === 'error' && (
                  <div className="space-y-3">
                    <Button
                      onClick={handleStart}
                      className="w-full py-6 text-base font-semibold rounded-2xl"
                    >
                      Réessayer
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full py-5 rounded-2xl gap-2"
                      onClick={handleClose}
                    >
                      <Phone className="h-4 w-4" />
                      Contacter le secrétariat
                    </Button>
                  </div>
                )}

                {step === 'done' && (
                  <Button
                    onClick={handleClose}
                    className="w-full py-6 text-base font-semibold rounded-2xl bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Terminé
                  </Button>
                )}

                {isActive && (
                  <Button
                    onClick={handleClose}
                    variant="ghost"
                    className="w-full py-5 rounded-2xl text-muted-foreground hover:text-foreground"
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
