import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface IncomingCall {
  sessionId: string;
  channelName: string;
  patientName: string;
  patientPhoto?: string | null;
  duration: number;
}

interface TeleconsultationSession {
  id: string;
  channel_name: string;
  duration_minutes: number;
  status: string;
  patient_id: string;
}

export function useIncomingCalls(doctorId: string | null) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  const fetchPatientInfo = useCallback(async (patientId: string): Promise<{ name: string; photo: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          profile:profiles(first_name, last_name)
        `)
        .eq('id', patientId)
        .single();

      if (error || !data?.profile) {
        return { name: 'Patient', photo: null };
      }

      const profile = data.profile as { first_name: string; last_name: string };
      return {
        name: `${profile.first_name} ${profile.last_name}`,
        photo: null
      };
    } catch (error) {
      console.error('Error fetching patient info:', error);
      return { name: 'Patient', photo: null };
    }
  }, []);

  useEffect(() => {
    if (!doctorId) return;

    console.log('[IncomingCalls] Setting up subscription for doctor:', doctorId);

    // Subscribe to teleconsultation_sessions changes
    const channel = supabase
      .channel(`teleconsultation-calls-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'teleconsultation_sessions',
          filter: `doctor_id=eq.${doctorId}`,
        },
        async (payload: RealtimePostgresChangesPayload<TeleconsultationSession>) => {
          console.log('[IncomingCalls] New session:', payload);
          const session = payload.new as TeleconsultationSession;
          
          // Show incoming call for any new session that's ready (paid or pending)
          if (session.status === 'paid' || session.status === 'pending') {
            const patientInfo = await fetchPatientInfo(session.patient_id);
            
            setIncomingCall({
              sessionId: session.id,
              channelName: session.channel_name,
              patientName: patientInfo.name,
              patientPhoto: patientInfo.photo,
              duration: session.duration_minutes
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teleconsultation_sessions',
          filter: `doctor_id=eq.${doctorId}`,
        },
        async (payload: RealtimePostgresChangesPayload<TeleconsultationSession>) => {
          console.log('[IncomingCalls] Session updated:', payload);
          const session = payload.new as TeleconsultationSession;
          
          // Check if this is a new call (status changed to 'pending' or 'paid')
          if (session.status === 'pending' || session.status === 'paid') {
            const patientInfo = await fetchPatientInfo(session.patient_id);
            
            setIncomingCall({
              sessionId: session.id,
              channelName: session.channel_name,
              patientName: patientInfo.name,
              patientPhoto: patientInfo.photo,
              duration: session.duration_minutes
            });
          }
          
          // Clear incoming call if session is cancelled or ended
          if (session.status === 'cancelled' || session.status === 'ended') {
            setIncomingCall(prev => 
              prev?.sessionId === session.id ? null : prev
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('[IncomingCalls] Subscription status:', status);
        setSubscriptionStatus(status);
      });

    // Fallback polling: ensures doctor still receives calls even if Realtime fails
    // (We keep Realtime for real-time behavior when it works.)
    let isMounted = true;
    const fetchLatest = async () => {
      if (!doctorId) return;
      try {
        const { data, error } = await supabase
          .from('teleconsultation_sessions')
          .select('id, channel_name, duration_minutes, status, patient_id')
          .eq('doctor_id', doctorId)
          .in('status', ['pending', 'paid'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!isMounted || !data) return;

        // Avoid re-showing the same call repeatedly
        if (incomingCall?.sessionId === data.id) return;

        const patientInfo = await fetchPatientInfo(data.patient_id);
        if (!isMounted) return;

        setIncomingCall({
          sessionId: data.id,
          channelName: data.channel_name,
          patientName: patientInfo.name,
          patientPhoto: patientInfo.photo,
          duration: data.duration_minutes,
        });
      } catch (e) {
        console.error('[IncomingCalls] Polling error:', e);
      }
    };

    // Run once immediately
    fetchLatest();

    const interval = window.setInterval(fetchLatest, 4000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      console.log('[IncomingCalls] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [doctorId, fetchPatientInfo, incomingCall?.sessionId]);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return {
    incomingCall,
    clearIncomingCall
  };
}
