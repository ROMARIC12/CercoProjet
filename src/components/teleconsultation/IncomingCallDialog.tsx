import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IncomingCallDialogProps {
  open: boolean;
  onClose: () => void;
  sessionData: {
    sessionId: string;
    channelName: string;
    patientName: string;
    patientPhoto?: string | null;
    duration: number;
  } | null;
  onAccept: (data: { channelName: string; token: string; uid: number }) => void;
  onDecline: () => void;
}

export function IncomingCallDialog({ 
  open, 
  onClose, 
  sessionData,
  onAccept,
  onDecline 
}: IncomingCallDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);

  // Countdown timer for auto-decline
  useEffect(() => {
    if (!open) {
      setTimeRemaining(30);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  // Play ringtone effect (visual pulsing)
  useEffect(() => {
    if (!open) return;

    // Could add audio ringtone here
    // const audio = new Audio('/ringtone.mp3');
    // audio.loop = true;
    // audio.play();
    // return () => audio.pause();
  }, [open]);

  const handleAccept = async () => {
    if (!sessionData) return;
    
    setIsLoading(true);
    try {
      // Update session status to active
      const { error: updateError } = await supabase
        .from('teleconsultation_sessions')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', sessionData.sessionId);

      if (updateError) throw updateError;

      // Get Agora token for doctor
      const { data, error } = await supabase.functions.invoke('agora-token', {
        body: { 
          channelName: sessionData.channelName,
          role: 'publisher'
        }
      });

      if (error) throw error;

      onAccept({
        channelName: sessionData.channelName,
        token: data.token,
        uid: data.uid
      });

      toast({
        title: 'Appel accepté',
        description: 'Connexion à la téléconsultation...',
      });
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de rejoindre l\'appel.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!sessionData) {
      onClose();
      return;
    }

    try {
      // Update session status to cancelled
      await supabase
        .from('teleconsultation_sessions')
        .update({ 
          status: 'cancelled',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionData.sessionId);

      onDecline();
      toast({
        title: 'Appel refusé',
        description: 'L\'appel a été décliné.',
      });
    } catch (error) {
      console.error('Error declining call:', error);
    }
    onClose();
  };

  if (!sessionData) return null;

  const initials = sessionData.patientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Video className="h-5 w-5 text-primary animate-pulse" />
            Appel entrant
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Pulsing avatar */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
            <Avatar className="h-24 w-24 border-4 border-primary">
              <AvatarImage src={sessionData.patientPhoto || undefined} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials || <User className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Patient info */}
          <div className="text-center space-y-1">
            <h3 className="text-xl font-semibold">{sessionData.patientName}</h3>
            <p className="text-sm text-muted-foreground">
              Téléconsultation • {sessionData.duration} min
            </p>
            <p className="text-xs text-muted-foreground">
              Réponse automatique dans {timeRemaining}s
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-6">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full h-16 w-16"
              onClick={handleDecline}
              disabled={isLoading}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            
            <Button
              variant="default"
              size="lg"
              className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600"
              onClick={handleAccept}
              disabled={isLoading}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
