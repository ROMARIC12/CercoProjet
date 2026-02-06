import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Video, 
  VideoOff, 
  Clock, 
  User, 
  PhoneCall, 
  Loader2,
  RefreshCw 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { IncomingCallDialog } from './IncomingCallDialog';
import { VideoCall } from './VideoCall';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WaitingSession {
  id: string;
  channel_name: string;
  duration_minutes: number;
  created_at: string;
  status: string;
  patient: {
    id: string;
    profile: {
      first_name: string;
      last_name: string;
    } | null;
  } | null;
}

interface VideoSessionData {
  channelName: string;
  token: string;
  uid: number;
  duration: number;
}

export function DoctorTeleconsultationView({ doctorId }: { doctorId: string }) {
  const { toast } = useToast();
  const [waitingSessions, setWaitingSessions] = useState<WaitingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoSession, setVideoSession] = useState<VideoSessionData | null>(null);
  const [isInCall, setIsInCall] = useState(false);

  // Hook for incoming calls
  const { incomingCall, clearIncomingCall } = useIncomingCalls(doctorId);

  const fetchWaitingSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teleconsultation_sessions')
        .select(`
          id,
          channel_name,
          duration_minutes,
          created_at,
          status,
          patient:patients(
            id,
            profile:profiles(first_name, last_name)
          )
        `)
        .eq('doctor_id', doctorId)
        .in('status', ['paid', 'waiting', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match expected structure
      const sessions: WaitingSession[] = (data || []).map((session: any) => ({
        id: session.id,
        channel_name: session.channel_name,
        duration_minutes: session.duration_minutes,
        created_at: session.created_at,
        status: session.status,
        patient: session.patient ? {
          id: session.patient.id,
          profile: session.patient.profile
        } : null
      }));

      setWaitingSessions(sessions);
    } catch (error) {
      console.error('Error fetching waiting sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchWaitingSessions();
  }, [fetchWaitingSessions]);

  // Real-time subscription for session updates
  useEffect(() => {
    const channel = supabase
      .channel(`doctor-sessions-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teleconsultation_sessions',
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => {
          fetchWaitingSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, fetchWaitingSessions]);

  const handleJoinSession = async (session: WaitingSession) => {
    try {
      // Update session status
      const { error: updateError } = await supabase
        .from('teleconsultation_sessions')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (updateError) throw updateError;

      // Get Agora token
      const { data, error } = await supabase.functions.invoke('agora-token', {
        body: { 
          channelName: session.channel_name,
          role: 'publisher'
        }
      });

      if (error) throw error;

      setVideoSession({
        channelName: session.channel_name,
        token: data.token,
        uid: data.uid,
        duration: session.duration_minutes
      });
      setIsInCall(true);
    } catch (error) {
      console.error('Error joining session:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de rejoindre la session.',
      });
    }
  };

  const handleAcceptCall = (data: { channelName: string; token: string; uid: number }) => {
    // Find the session duration from incoming call or default to 30
    const session = waitingSessions.find(s => s.channel_name === data.channelName);
    
    setVideoSession({
      channelName: data.channelName,
      token: data.token,
      uid: data.uid,
      duration: session?.duration_minutes || 30
    });
    setIsInCall(true);
    clearIncomingCall();
  };

  const handleCallEnd = async () => {
    // Update session status to ended
    if (videoSession) {
      await supabase
        .from('teleconsultation_sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('channel_name', videoSession.channelName);
    }

    setIsInCall(false);
    setVideoSession(null);
    fetchWaitingSessions();

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
        appId="" // Will be fetched from token response
        uid={videoSession.uid}
        isDoctor={true}
        duration={videoSession.duration}
        onCallEnd={handleCallEnd}
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PhoneCall className="h-5 w-5 text-primary" />
              Sessions en attente
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchWaitingSessions}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : waitingSessions.length === 0 ? (
            <div className="text-center py-8">
              <Video className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
              <p className="text-muted-foreground mt-4">
                Aucune session en attente
              </p>
              <p className="text-sm text-muted-foreground">
                Les patients payés apparaîtront ici
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {waitingSessions.map((session) => {
                  const patientName = session.patient?.profile
                    ? `${session.patient.profile.first_name} ${session.patient.profile.last_name}`
                    : 'Patient';
                  const initials = patientName.split(' ').map(n => n[0]).join('').toUpperCase();

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{patientName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{session.duration_minutes} min</span>
                            <span>•</span>
                            <span>
                              {format(new Date(session.created_at), 'HH:mm', { locale: fr })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={session.status === 'paid' ? 'default' : 'secondary'}>
                          {session.status === 'paid' ? 'Payé' : 'En attente'}
                        </Badge>
                        <Button
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => handleJoinSession(session)}
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Rejoindre
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Incoming call dialog */}
      <IncomingCallDialog
        open={!!incomingCall}
        onClose={clearIncomingCall}
        sessionData={incomingCall}
        onAccept={handleAcceptCall}
        onDecline={clearIncomingCall}
      />
    </>
  );
}
