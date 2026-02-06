import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Users, RefreshCw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  doctor: {
    id: string;
    specialty: string;
    profile?: {
      first_name: string;
      last_name: string;
    } | null;
  };
}

interface WaitingQueueCardProps {
  appointment: Appointment;
  onPositionChange?: (newPosition: number) => void;
}

const AVG_CONSULTATION_TIME = 20; // minutes

export function WaitingQueueCard({ appointment, onPositionChange }: WaitingQueueCardProps) {
  const [position, setPosition] = useState<number>(0);
  const [totalInQueue, setTotalInQueue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const calculatePosition = async () => {
    setIsLoading(true);
    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, appointment_time, status')
        .eq('doctor_id', appointment.doctor.id)
        .eq('appointment_date', appointment.appointment_date)
        .in('status', ['confirmed', 'pending'])
        .order('appointment_time');

      if (error) throw error;

      const validAppointments = appointments || [];
      
      const myPosition = validAppointments.filter(
        apt => apt.appointment_time <= appointment.appointment_time
      ).length;

      setPosition(myPosition);
      setTotalInQueue(validAppointments.length);
      setLastUpdate(new Date());
      onPositionChange?.(myPosition);
    } catch (error) {
      console.error('Error calculating queue position:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    calculatePosition();
  }, [appointment.id]);

  useRealtimeSubscription({
    table: 'appointments',
    filter: 'doctor_id',
    filterValue: appointment.doctor.id,
    onChange: () => {
      console.log('[WaitingQueue] Position recalculated due to change');
      calculatePosition();
    },
  });

  const estimatedWaitTime = Math.max(0, (position - 1) * AVG_CONSULTATION_TIME);
  const progressPercent = totalInQueue > 0 ? ((totalInQueue - position + 1) / totalInQueue) * 100 : 0;
  const isToday = appointment.appointment_date === format(new Date(), 'yyyy-MM-dd');
  const doctorName = appointment.doctor.profile
    ? `Dr. ${appointment.doctor.profile.first_name} ${appointment.doctor.profile.last_name}`
    : 'Médecin';

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${
      isToday 
        ? 'border-2 border-primary shadow-xl shadow-primary/15' 
        : 'border-border'
    }`}>
      {/* Gradient header for today's appointments */}
      {isToday && (
        <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span>File d'attente</span>
            {isToday && (
              <Badge className="ml-1 bg-accent/15 text-accent border-accent/30 gap-1">
                <Sparkles className="h-3 w-3" />
                Aujourd'hui
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={calculatePosition}
            disabled={isLoading}
            className="h-9 w-9 rounded-xl"
            aria-label="Actualiser la position"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Position Display - Large and clear */}
        <div className="text-center py-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl">
          <div className="text-6xl font-bold text-primary tracking-tight">
            {isLoading ? '...' : `#${position}`}
          </div>
          <p className="text-muted-foreground mt-2 text-base">
            sur {totalInQueue} patient{totalInQueue > 1 ? 's' : ''} en attente
          </p>
        </div>

        {/* Progress Bar - More prominent */}
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-medium">Progression</span>
            <span className="font-semibold text-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-3 rounded-full" />
        </div>

        {/* Estimated Wait Time - Highlighted */}
        <div className="flex items-center justify-between p-4 bg-secondary rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">Temps d'attente estimé</span>
          </div>
          <span className="font-bold text-xl text-foreground">
            ~{estimatedWaitTime} min
          </span>
        </div>

        {/* Details Collapsible */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full rounded-xl" size="sm">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Masquer les détails
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Voir les détails
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <div className="text-sm space-y-2 p-4 bg-muted/50 rounded-xl">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date :</span>
                <span className="font-medium">
                  {format(new Date(appointment.appointment_date), 'EEEE d MMMM', { locale: fr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heure prévue :</span>
                <span className="font-medium">{appointment.appointment_time.slice(0, 5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Médecin :</span>
                <span className="font-medium">{doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dernière MàJ :</span>
                <span className="text-xs font-medium">
                  {format(lastUpdate, 'HH:mm:ss', { locale: fr })}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center px-4">
              La position se met à jour automatiquement en temps réel
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
