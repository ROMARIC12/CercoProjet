import { useEffect, useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DoctorAgenda } from '@/components/doctor/DoctorAgenda';
import { DoctorStatsPanel } from '@/components/doctor/DoctorStatsPanel';
import { BlockSlotDialog } from '@/components/doctor/BlockSlotDialog';
import { ConsultationNotes } from '@/components/doctor/ConsultationNotes';
import { AvailabilitySettings } from '@/components/doctor/AvailabilitySettings';
import { PricingSettings } from '@/components/doctor/PricingSettings';
import { TeleconsultationSettings } from '@/components/doctor/TeleconsultationSettings';
import { DoctorTeleconsultationView } from '@/components/teleconsultation/DoctorTeleconsultationView';
import { IncomingCallDialog } from '@/components/teleconsultation/IncomingCallDialog';
import { VideoCall } from '@/components/teleconsultation/VideoCall';
import { WaitingQueue } from '@/components/secretary/WaitingQueue';
import { PatientFileDialog } from '@/components/doctor/PatientFileDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, TrendingUp, Clock, AlertTriangle, CheckCircle, Bell, FileText, Lock, Settings, UserX, ChevronDown, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
interface DoctorStats {
  todayAppointments: number;
  completedToday: number;
  monthlyRevenue: number;
  fillRate: number;
  pendingConfirmations: number;
}

interface TodayAppointment {
  id: string;
  appointment_time: string;
  appointment_date: string;
  status: string;
  is_first_visit: boolean;
  patient: {
    id: string;
    date_of_birth?: string | null;
    gender?: string | null;
    address?: string | null;
    emergency_contact?: string | null;
    profile: {
      first_name: string;
      last_name: string;
      phone: string | null;
    };
  };
  consultation_form?: {
    consultation_reason: string | null;
    allergies: string[] | null;
    chronic_conditions: string[] | null;
    current_treatments: string | null;
  } | null;
}

interface PatientFileData {
  patient: TodayAppointment['patient'];
  consultationForm?: TodayAppointment['consultation_form'];
  appointmentInfo?: {
    date: string;
    time: string;
    doctorName: string;
    isFirstVisit?: boolean;
  };
}

const PATIENTS_PER_PAGE = 5;

export default function DoctorDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DoctorStats>({
    todayAppointments: 0,
    completedToday: 0,
    monthlyRevenue: 0,
    fillRate: 0,
    pendingConfirmations: 0,
  });
  const [todayPatients, setTodayPatients] = useState<TodayAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  // Patient file dialog
  const [selectedPatientData, setSelectedPatientData] = useState<PatientFileData | null>(null);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);

  // Pagination
  const [visiblePatients, setVisiblePatients] = useState(PATIENTS_PER_PAGE);

  // Block slot dialog
  const [blockSlotOpen, setBlockSlotOpen] = useState(false);
  const [blockSlotDate, setBlockSlotDate] = useState('');
  const [blockSlotTime, setBlockSlotTime] = useState('');

  // Consultation notes dialog
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');

  // Global teleconsultation state
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [videoSessionData, setVideoSessionData] = useState<{
    channelName: string;
    token: string;
    uid: number;
    duration: number;
  } | null>(null);

  // Hook for incoming calls - active globally
  const { incomingCall, clearIncomingCall } = useIncomingCalls(doctorId);

  const fetchDoctorData = useCallback(async () => {
    if (!user) return;

    try {
      // Get doctor ID
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (!doctorData) {
        setIsLoading(false);
        return;
      }

      setDoctorId(doctorData.id);
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch upcoming appointments so new patient requests (future dates) are visible
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          appointment_date,
          status,
          is_first_visit,
          patient:patients(
            id,
            date_of_birth,
            gender,
            address,
            emergency_contact,
            profile:profiles(first_name, last_name, phone)
          ),
          consultation_form:consultation_forms(
            consultation_reason,
            allergies,
            chronic_conditions,
            current_treatments
          )
        `)
        .eq('doctor_id', doctorData.id)
        .neq('status', 'cancelled')
        .gte('appointment_date', today)
        .order('appointment_date')
        .order('appointment_time')
        .limit(100);

      // Fetch doctor statistics
      const { data: statsData } = await supabase
        .from('doctor_statistics')
        .select('*')
        .eq('doctor_id', doctorData.id)
        .single();

      // Count pending confirmations
      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', doctorData.id)
        .eq('status', 'pending')
        .gte('appointment_date', today);

      const todayCompleted = appointments?.filter(a => a.status === 'completed').length || 0;

      setTodayPatients(appointments || []);
      setStats({
        todayAppointments: appointments?.length || 0,
        completedToday: todayCompleted,
        monthlyRevenue: statsData?.monthly_revenue || 0,
        fillRate: statsData?.no_show_rate ? 100 - (statsData.no_show_rate * 100) : 100,
        pendingConfirmations: pendingCount || 0,
      });
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

  // Real-time subscription
  useRealtimeSubscription({
    table: 'appointments',
    filter: doctorId ? 'doctor_id' : undefined,
    filterValue: doctorId || undefined,
    onChange: (payload) => {
      console.log('[Doctor] Appointment update:', payload);
      fetchDoctorData();

      if (payload.eventType === 'INSERT') {
        toast({
          title: 'Nouveau RDV',
          description: 'Un nouveau rendez-vous a été pris.',
        });
      } else if (payload.eventType === 'UPDATE' && payload.new?.status === 'cancelled') {
        toast({
          variant: 'destructive',
          title: 'RDV Annulé',
          description: 'Un rendez-vous a été annulé.',
        });
      }
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default">Confirmé</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Terminé</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'no_show':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const markAsCompleted = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Consultation terminée',
        description: 'Le statut a été mis à jour.',
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const markAsNoShow = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'no_show' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Patient absent',
        description: 'Le statut a été mis à jour.',
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const openPatientFile = (appointment: TodayAppointment) => {
    setSelectedPatientData({
      patient: appointment.patient,
      consultationForm: appointment.consultation_form,
      appointmentInfo: {
        date: appointment.appointment_date,
        time: appointment.appointment_time.slice(0, 5),
        doctorName: `Dr. ${profile?.first_name || ''} ${profile?.last_name || ''}`,
        isFirstVisit: appointment.is_first_visit,
      },
    });
    setPatientDialogOpen(true);
  };

  const handleLoadMore = () => {
    setVisiblePatients(prev => prev + PATIENTS_PER_PAGE);
  };

  const openConsultationNotes = (appointment: TodayAppointment) => {
    setSelectedAppointmentId(appointment.id);
    setSelectedPatientName(`${appointment.patient?.profile?.first_name} ${appointment.patient?.profile?.last_name}`);
    setNotesDialogOpen(true);
  };

  const handleBlockSlot = (date: string, time: string) => {
    setBlockSlotDate(date);
    setBlockSlotTime(time);
    setBlockSlotOpen(true);
  };

  // Handle accepting an incoming call
  const handleAcceptCall = async (data: { channelName: string; token: string; uid: number }) => {
    setVideoSessionData({
      channelName: data.channelName,
      token: data.token,
      uid: data.uid,
      duration: incomingCall?.duration || 30
    });
    setIsInVideoCall(true);
    clearIncomingCall();
  };

  // Handle ending a video call
  const handleCallEnd = async () => {
    if (videoSessionData) {
      await supabase
        .from('teleconsultation_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('channel_name', videoSessionData.channelName);
    }

    setIsInVideoCall(false);
    setVideoSessionData(null);
    toast({
      title: 'Appel terminé',
      description: 'La téléconsultation est terminée.',
    });
  };

  // If in a video call, show only the video component
  if (isInVideoCall && videoSessionData) {
    return (
      <VideoCall
        channelName={videoSessionData.channelName}
        token={videoSessionData.token}
        appId=""
        uid={videoSessionData.uid}
        isDoctor={true}
        duration={videoSessionData.duration}
        onCallEnd={handleCallEnd}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-20 md:pb-10">
        <div className="container-responsive py-6 space-y-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Bonjour Dr. {profile?.last_name || ''} 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Voici un aperçu de votre activité aujourd'hui.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </Button>
            </div>
          </div>

          {/* Stats Cards - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatsCard
              title="Patients du jour"
              value={isLoading ? '...' : stats.todayAppointments}
              description="Rendez-vous prévus"
              icon={Calendar}
            />
            <StatsCard
              title="Consultations"
              value={isLoading ? '...' : stats.completedToday}
              description="Terminées aujourd'hui"
              icon={CheckCircle}
            />
            <StatsCard
              title="Revenus du mois"
              value={isLoading ? '...' : `${stats.monthlyRevenue.toLocaleString()} FCFA`}
              description="Total facturation"
              icon={TrendingUp}
            />
            <StatsCard
              title="À confirmer"
              value={isLoading ? '...' : stats.pendingConfirmations}
              description="RDV en attente"
              icon={Bell}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column - Patients List (span 2 on large screens) */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="today" className="w-full">
                <TabsList className="w-full grid grid-cols-4 mb-6 p-1 bg-muted/50 rounded-xl">
                  <TabsTrigger value="today" className="rounded-lg">
                    Patients
                  </TabsTrigger>
                  <TabsTrigger value="teleconsultation" className="rounded-lg">
                    <Video className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Visio</span>
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="rounded-lg">
                    Agenda
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-lg">
                    <Settings className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Outils</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="today" className="mt-0">
                  <Card className="card-responsive border-0 shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <Clock className="h-5 w-5 text-primary" />
                            {format(new Date(), 'EEEE d MMMM', { locale: fr })}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Liste des consultations prévues aujourd'hui
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="px-3 py-1">
                          {stats.todayAppointments} RDV
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                      {isLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                          ))}
                        </div>
                      ) : todayPatients.length === 0 ? (
                        <div className="py-12 text-center bg-muted/20 rounded-xl border border-dashed">
                          <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Calendar className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <h3 className="font-medium text-foreground">Aucun rendez-vous</h3>
                          <p className="text-muted-foreground text-sm mt-1">Votre planning est vide pour aujourd'hui</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {todayPatients.slice(0, visiblePatients).map((apt) => {
                            const patientName = `${apt.patient?.profile?.first_name || ''} ${apt.patient?.profile?.last_name || ''}`.trim();
                            const initials = `${apt.patient?.profile?.first_name?.[0] || ''}${apt.patient?.profile?.last_name?.[0] || ''}`;

                            return (
                              <div
                                key={apt.id}
                                className={`group p-4 rounded-xl border transition-all duration-200 hover:shadow-md bg-card ${apt.is_first_visit ? 'border-l-4 border-l-purple-500' : 'border-border'
                                  } ${apt.status === 'completed' ? 'opacity-75 bg-muted/30' : ''}`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                  <div className="flex items-start gap-4">
                                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm mt-1">
                                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                        {initials}
                                      </AvatarFallback>
                                    </Avatar>

                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-base leading-none">{patientName}</h4>
                                        {getStatusBadge(apt.status)}
                                      </div>

                                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground bg-secondary px-2 py-0.5 rounded text-xs">
                                          {apt.appointment_time.slice(0, 5)}
                                        </span>
                                        {apt.is_first_visit && (
                                          <span className="text-purple-600 text-xs flex items-center gap-0.5 font-medium">
                                            <AlertTriangle className="h-3 w-3" />
                                            1ère visite
                                          </span>
                                        )}
                                      </div>

                                      {apt.consultation_form?.consultation_reason && (
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                          Motif : {apt.consultation_form.consultation_reason}
                                        </p>
                                      )}

                                      <div className="flex gap-2 mt-2">
                                        {apt.consultation_form?.allergies && apt.consultation_form.allergies.length > 0 && (
                                          <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
                                            Allergies
                                          </Badge>
                                        )}
                                        {apt.consultation_form?.chronic_conditions && apt.consultation_form.chronic_conditions.length > 0 && (
                                          <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                                            Chronique
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex sm:flex-col items-center sm:items-end gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 w-full sm:w-auto">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openPatientFile(apt)}
                                      className="flex-1 sm:flex-none justify-center h-8 text-xs"
                                    >
                                      Voir fiche
                                    </Button>

                                    {apt.status === 'confirmed' ? (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() => markAsCompleted(apt.id)}
                                          className="flex-1 sm:flex-none justify-center gap-1.5 bg-green-600 hover:bg-green-700 h-8 text-xs w-full sm:w-auto"
                                        >
                                          <CheckCircle className="h-3.5 w-3.5" />
                                          Terminer
                                        </Button>
                                        <div className="flex w-full gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openConsultationNotes(apt)}
                                            className="flex-1 h-8 text-xs justify-center"
                                          >
                                            <FileText className="h-3.5 w-3.5" />
                                            Notes
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                                            onClick={() => markAsNoShow(apt.id)}
                                          >
                                            <UserX className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {todayPatients.length > visiblePatients && (
                            <Button
                              variant="ghost"
                              className="w-full mt-2 text-muted-foreground"
                              onClick={handleLoadMore}
                            >
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Voir plus
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="teleconsultation" className="mt-0">
                  {doctorId && (
                    <DoctorTeleconsultationView doctorId={doctorId} />
                  )}
                </TabsContent>

                <TabsContent value="agenda" className="mt-0">
                  {doctorId && (
                    <DoctorAgenda
                      doctorId={doctorId}
                      onAppointmentClick={(apt) => {
                        if (apt.status === 'confirmed') {
                          setSelectedAppointmentId(apt.id);
                          setSelectedPatientName(`${apt.patient?.profile?.first_name} ${apt.patient?.profile?.last_name}`);
                          setNotesDialogOpen(true);
                        }
                      }}
                      onBlockSlot={handleBlockSlot}
                    />
                  )}
                </TabsContent>

                <TabsContent value="settings" className="mt-0 space-y-6">
                  {doctorId && (
                    <>
                      <TeleconsultationSettings doctorId={doctorId} />
                      <AvailabilitySettings doctorId={doctorId} />
                      <PricingSettings doctorId={doctorId} />
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Queue & Stats (span 1) */}
            <div className="space-y-6">
              {doctorId && (
                <>
                  <div className="sticky top-6 space-y-6">
                    <WaitingQueue filterByDoctor={doctorId} showActions={false} />
                    <DoctorStatsPanel doctorId={doctorId} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Patient File Dialog */}
      <PatientFileDialog
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        patient={selectedPatientData?.patient ? {
          id: selectedPatientData.patient.id,
          date_of_birth: selectedPatientData.patient.date_of_birth || undefined,
          gender: selectedPatientData.patient.gender || undefined,
          address: selectedPatientData.patient.address || undefined,
          emergency_contact: selectedPatientData.patient.emergency_contact || undefined,
          profile: selectedPatientData.patient.profile,
        } : null}
        consultationForm={selectedPatientData?.consultationForm}
        appointmentInfo={selectedPatientData?.appointmentInfo}
      />

      {/* Block Slot Dialog */}
      {
        doctorId && (
          <BlockSlotDialog
            open={blockSlotOpen}
            onOpenChange={setBlockSlotOpen}
            doctorId={doctorId}
            initialDate={blockSlotDate}
            initialTime={blockSlotTime}
            onSuccess={fetchDoctorData}
          />
        )
      }

      {/* Consultation Notes Dialog */}
      <ConsultationNotes
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        appointmentId={selectedAppointmentId}
        patientName={selectedPatientName}
        onSuccess={fetchDoctorData}
      />

      {/* Global Incoming Call Dialog - Shows anywhere on doctor dashboard */}
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
