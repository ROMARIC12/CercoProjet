import { useEffect, useState, useCallback } from 'react';
import { TeleconsultationDoctorCard } from './TeleconsultationDoctorCard';
import { EnterCodeDialog } from './EnterCodeDialog';
import { TeleconsultationPaymentDialog } from './TeleconsultationPaymentDialog';
import { VideoCall } from './VideoCall';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Video, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Generate a unique 6-character access code
function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
interface OnlineDoctor {
  id: string;
  specialty: string;
  photo_url?: string | null;
  teleconsultation_price_per_minute?: number | null;
  teleconsultation_price_per_hour?: number | null;
  teleconsultation_enabled?: boolean | null;
  is_teleconsultation_free?: boolean;
  profile: {
    first_name: string;
    last_name: string;
  } | null;
}

interface VideoSessionData {
  channelName: string;
  token: string;
  appId: string;
  uid: number;
  duration: number;
}

export function TeleconsultationView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [onlineDoctors, setOnlineDoctors] = useState<OnlineDoctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialogs
  const [enterCodeOpen, setEnterCodeOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<OnlineDoctor | null>(null);
  
  // Video call
  const [videoSession, setVideoSession] = useState<VideoSessionData | null>(null);
  const [isInCall, setIsInCall] = useState(false);

  const fetchOnlineDoctors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          specialty,
          photo_url,
          teleconsultation_price_per_minute,
          teleconsultation_price_per_hour,
          teleconsultation_enabled,
          is_teleconsultation_free,
          profile:profiles(first_name, last_name)
        `)
        .eq('teleconsultation_enabled', true)
        .eq('is_online', true) // Only show doctors who are actually online
        .order('specialty');

      if (error) throw error;

      // Transform data to match expected structure - safely cast types
      // Filter out doctors with null profiles
      const doctors: OnlineDoctor[] = (data || [])
        .filter((doc: any) => doc.profile !== null)
        .map((doc: any) => ({
          id: doc.id,
          specialty: doc.specialty,
          photo_url: doc.photo_url,
          teleconsultation_price_per_minute: doc.teleconsultation_price_per_minute,
          teleconsultation_price_per_hour: doc.teleconsultation_price_per_hour,
          teleconsultation_enabled: doc.teleconsultation_enabled,
          is_teleconsultation_free: doc.is_teleconsultation_free || false,
          profile: doc.profile as { first_name: string; last_name: string }
        }));

      setOnlineDoctors(doctors);
    } catch (error) {
      console.error('Error fetching online doctors:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les médecins en ligne.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOnlineDoctors();
  }, [fetchOnlineDoctors]);

  // Real-time subscription for doctor status changes
  useRealtimeSubscription({
    table: 'doctors',
    onChange: (payload) => {
      console.log('[Teleconsultation] Doctor status changed:', payload);
      fetchOnlineDoctors();
    },
  });

  const handleEnterCode = (doctorId: string) => {
    setEnterCodeOpen(true);
  };

  const handleBookTeleconsultation = (doctor: OnlineDoctor) => {
    setSelectedDoctor(doctor);
    setPaymentDialogOpen(true);
  };

  const handleCodeValid = async (sessionData: { channelName: string; token: string; doctorId: string }) => {
    try {
      // Get Agora token and start video call
      const { data, error } = await supabase.functions.invoke('agora-token', {
        body: { 
          channelName: sessionData.channelName,
          role: 'audience' 
        }
      });

      if (error) throw error;

      setVideoSession({
        channelName: sessionData.channelName,
        token: data.token,
        appId: data.appId,
        uid: data.uid,
        duration: 30, // Default duration
      });
      setIsInCall(true);
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de démarrer la vidéoconférence.',
      });
    }
  };

  const handleStartFreeSession = async (doctorId: string) => {
    try {
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Vous devez être connecté.',
        });
        return;
      }

      // Get patient ID
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (patientError || !patientData) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Profil patient non trouvé.',
        });
        return;
      }

      const channelName = `free-${doctorId}-${Date.now()}`;
      const accessCode = generateAccessCode(); // Generate unique code
      
      console.log('[Teleconsultation] Creating session:', { channelName, accessCode, doctorId });
      
      // Create a session in the database to notify the doctor
      const { data: sessionData, error: sessionError } = await supabase
        .from('teleconsultation_sessions')
        .insert({
          doctor_id: doctorId,
          patient_id: patientData.id,
          channel_name: channelName,
          access_code: accessCode, // Use unique generated code
          status: 'pending',
          duration_minutes: 60,
          amount: 0
        })
        .select('id')
        .single();
      
      console.log('[Teleconsultation] Session created:', sessionData);

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        throw sessionError;
      }

      // Get Agora token
      const { data, error } = await supabase.functions.invoke('agora-token', {
        body: { 
          channelName,
          role: 'publisher'
        }
      });

      if (error) throw error;

      setVideoSession({
        channelName,
        token: data.token,
        appId: data.appId,
        uid: data.uid,
        duration: 60, // 1 hour for free sessions
      });
      setIsInCall(true);

      toast({
        title: 'Session démarrée',
        description: 'En attente que le médecin rejoigne...',
      });
    } catch (error) {
      console.error('Error starting free session:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de démarrer la session.',
      });
    }
  };

  const handleCallEnd = () => {
    setIsInCall(false);
    setVideoSession(null);
    toast({
      title: 'Appel terminé',
      description: 'La téléconsultation est terminée.',
    });
  };

  // If in a video call, show the video component
  if (isInCall && videoSession) {
    return (
      <VideoCall
        channelName={videoSession.channelName}
        token={videoSession.token}
        appId={videoSession.appId}
        uid={videoSession.uid}
        duration={videoSession.duration}
        onCallEnd={handleCallEnd}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Médecins en ligne</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={fetchOnlineDoctors}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {onlineDoctors.length} médecin{onlineDoctors.length > 1 ? 's' : ''} disponible{onlineDoctors.length > 1 ? 's' : ''} pour une consultation vidéo
        </p>
      </div>

      {/* Doctors List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 pb-20">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Chargement...</p>
            </div>
          ) : onlineDoctors.length === 0 ? (
            <div className="text-center py-8">
              <Video className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
              <p className="text-muted-foreground mt-4">
                Aucun médecin en ligne pour le moment
              </p>
              <p className="text-sm text-muted-foreground">
                Revenez plus tard ou prenez un rendez-vous classique
              </p>
            </div>
          ) : (
            onlineDoctors.map((doctor) => (
              <TeleconsultationDoctorCard
                key={doctor.id}
                doctor={doctor}
                onEnterCode={handleEnterCode}
                onBookTeleconsultation={handleBookTeleconsultation}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <EnterCodeDialog
        open={enterCodeOpen}
        onClose={() => setEnterCodeOpen(false)}
        onCodeValid={handleCodeValid}
      />

      <TeleconsultationPaymentDialog
        open={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false);
          setSelectedDoctor(null);
        }}
        doctor={selectedDoctor}
        onStartFreeSession={handleStartFreeSession}
      />
    </div>
  );
}
