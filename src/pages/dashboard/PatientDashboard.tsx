import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientSidebar } from '@/components/patient/PatientSidebar';
import { MobileBottomNav } from '@/components/patient/MobileBottomNav';
import { QuickActionsSection } from '@/components/patient/QuickActionsSection';
import { WaitingQueueSection } from '@/components/patient/WaitingQueueSection';
import { ConsultationsCarousel } from '@/components/patient/ConsultationsCarousel';
import { FullBookingFlow } from '@/components/patient/FullBookingFlow';
import { VoiceBookingFlow } from '@/components/patient/VoiceBookingFlow';
import { NotificationsSheet } from '@/components/patient/NotificationsSheet';
import { PaymentHistory } from '@/components/patient/PaymentHistory';
import { AccessibilitySettings } from '@/components/patient/AccessibilitySettings';
import { MyAppointmentsView } from '@/components/patient/MyAppointmentsView';
import { OrdonnancesView } from '@/components/patient/OrdonnancesView';
import { TeleconsultationView } from '@/components/teleconsultation/TeleconsultationView';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { AppointmentDetailsSheet } from '@/components/patient/AppointmentDetailsSheet';
import { HelpSupportView } from '@/components/patient/HelpSupportView';
import { MessagesView } from '@/components/patient/MessagesView';
import { Bell, Search, Menu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PatientStats {
  upcomingAppointments: number;
  pastAppointments: number;
  pendingPayments: number;
  healthReminders: number;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  is_first_visit?: boolean;
  doctor: {
    id: string;
    specialty: string;
    profile: {
      first_name: string;
      last_name: string;
    };
  };
  clinic: {
    name: string;
    address: string;
  } | null;
}

export default function PatientDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { notifications: realtimeNotifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  const [stats, setStats] = useState<PatientStats>({
    upcomingAppointments: 0,
    pastAppointments: 0,
    pendingPayments: 0,
    healthReminders: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBookingSearch, setShowBookingSearch] = useState(false);
  const [showVoiceBooking, setShowVoiceBooking] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);

  // Get the next appointment for queue display
  const nextAppointment = upcomingAppointments.find(
    apt => apt.status === 'confirmed' || apt.status === 'pending'
  );

  const fetchPatientData = useCallback(async () => {
    if (!user) return;

    try {
      // Get patient ID
      const { data: patientData } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (!patientData) {
        setIsLoading(false);
        return;
      }

      setPatientId(patientData.id);
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch upcoming appointments
      const { data: upcoming } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          is_first_visit,
          doctor:doctors(
            id,
            specialty,
            profile:profiles(first_name, last_name)
          ),
          clinic:clinics(name, address)
        `)
        .eq('patient_id', patientData.id)
        .gte('appointment_date', today)
        .neq('status', 'cancelled')
        .order('appointment_date')
        .order('appointment_time')
        .limit(10);

      // Fetch past appointments
      const { data: past } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          doctor:doctors(
            id,
            specialty,
            profile:profiles(first_name, last_name)
          ),
          clinic:clinics(name, address)
        `)
        .eq('patient_id', patientData.id)
        .lt('appointment_date', today)
        .order('appointment_date', { ascending: false })
        .limit(10);

      // Count pending payments
      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', patientData.id)
        .eq('status', 'pending');

      // Fetch health reminders
      const { data: healthReminders } = await supabase
        .from('health_reminders')
        .select('*')
        .eq('patient_id', patientData.id)
        .eq('is_sent', false)
        .gte('scheduled_date', today)
        .order('scheduled_date')
        .limit(5);

      setUpcomingAppointments(upcoming as Appointment[] || []);
      setPastAppointments(past as Appointment[] || []);
      setReminders(healthReminders || []);
      setStats({
        upcomingAppointments: upcoming?.length || 0,
        pastAppointments: past?.length || 0,
        pendingPayments: pendingPayments || 0,
        healthReminders: healthReminders?.length || 0,
      });

    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  // Real-time subscription for appointments
  useRealtimeSubscription({
    table: 'appointments',
    filter: patientId ? 'patient_id' : undefined,
    filterValue: patientId || undefined,
    onChange: () => {
      console.log('[Patient] Appointment update received');
      fetchPatientData();
      toast({
        title: 'Mise à jour',
        description: 'Vos rendez-vous ont été mis à jour.',
      });
    },
  });

  // Transform realtime notifications
  const displayNotifications = realtimeNotifications.map(n => ({
    id: n.id,
    type: n.type as 'appointment' | 'payment' | 'reminder' | 'urgent' | 'queue_update',
    title: n.title,
    message: n.message || '',
    created_at: n.created_at,
    is_read: n.is_read,
  }));

  // Transform appointments for carousel
  const consultationsForCarousel = upcomingAppointments.slice(0, 5).map(apt => ({
    id: apt.id,
    type: 'cabinet' as const,
    date: apt.appointment_date,
    time: apt.appointment_time.substring(0, 5),
    doctorName: `Dr. ${apt.doctor.profile.first_name} ${apt.doctor.profile.last_name}`,
    doctorAvatar: undefined,
  }));

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'settings') {
      setShowAccessibility(true);
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    // Mes Rendez-vous Tab
    if (activeTab === 'rdv') {
      return (
        <MyAppointmentsView
          upcomingAppointments={upcomingAppointments}
          pastAppointments={pastAppointments}
          onViewDetails={(id) => {
            const apt = [...upcomingAppointments, ...pastAppointments].find(a => a.id === id);
            if (apt) {
              setSelectedAppointment(apt);
              setShowAppointmentDetails(true);
            }
          }}
          onReschedule={(id) => {
            toast({
              title: 'Demande de reprogrammation',
              description: 'Votre demande a été envoyée au secrétariat. Vous serez notifié une fois la reprogrammation confirmée.',
            });
          }}
        />
      );
    }

    // Ordonnances Tab
    if (activeTab === 'ordonnances') {
      return <OrdonnancesView />;
    }

    // Téléconsultation Tab
    if (activeTab === 'teleconsultation') {
      return <TeleconsultationView />;
    }

    // Portefeuille Tab
    if (activeTab === 'wallet') {
      return (
        <div className="p-6">
          <PaymentHistory />
        </div>
      );
    }

    // Messages Tab
    if (activeTab === 'messages') {
      return <MessagesView />;
    }

    // Aide & Support Tab
    if (activeTab === 'help') {
      return <HelpSupportView />;
    }

    // Default: Home tab
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-secondary/30">
        <div className="px-4 py-6 md:py-8 space-y-6 max-w-2xl mx-auto w-full">
          {/* Greeting */}
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
              Bonjour {profile?.first_name || 'Patient'}
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base">
              Prêt pour votre suivi santé ?
            </p>
          </div>

          {/* Quick Actions */}
          <QuickActionsSection
            onManualBooking={() => setShowBookingSearch(true)}
            onVoiceBooking={() => setShowVoiceBooking(true)}
          />

          {/* Waiting Queue - only if patient has upcoming appointment */}
          {nextAppointment && (
            <WaitingQueueSection
              doctorName={`Dr. ${nextAppointment.doctor.profile.last_name}`}
              clinicName={nextAppointment.clinic?.name || 'Cabinet'}
              estimatedWait={15}
              onViewDetails={() => handleTabChange('rdv')}
            />
          )}

          {/* Consultations Carousel - real data only */}
          <ConsultationsCarousel
            consultations={consultationsForCarousel}
            onViewAll={() => handleTabChange('rdv')}
          />

          {/* Health Reminders */}
          {reminders.length > 0 && (
            <Card className="rounded-2xl border-0 shadow-soft bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4" />
                  Rappels de santé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{reminder.reminder_type}</p>
                        {reminder.message && (
                          <p className="text-xs text-muted-foreground truncate">{reminder.message}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                        {format(new Date(reminder.scheduled_date), 'd MMM', { locale: fr })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bottom space for nav */}
          <div className="h-20 md:hidden" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <PatientSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-screen transition-all duration-300">
        {/* Top Header */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
              {activeTab === 'home' && 'Tableau de bord'}
              {activeTab === 'rdv' && 'Mes Rendez-vous'}
              {activeTab === 'ordonnances' && 'Mes Ordonnances'}
              {activeTab === 'teleconsultation' && 'Téléconsultation'}
              {activeTab === 'wallet' && 'Portefeuille'}
              {activeTab === 'settings' && 'Paramètres'}
              {activeTab === 'help' && 'Aide & Support'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBookingSearch(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* Full Booking Flow */}
      <FullBookingFlow
        open={showBookingSearch}
        onClose={() => setShowBookingSearch(false)}
        onSuccess={fetchPatientData}
      />

      {/* Voice Booking Flow */}
      <VoiceBookingFlow
        open={showVoiceBooking}
        onClose={() => setShowVoiceBooking(false)}
        patientId={patientId}
        onSuccess={fetchPatientData}
      />

      {/* Notifications Sheet */}
      <NotificationsSheet
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={displayNotifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* Accessibility Dialog */}
      <Dialog open={showAccessibility} onOpenChange={setShowAccessibility}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AccessibilitySettings />
        </DialogContent>
      </Dialog>

      {/* Appointment Details Sheet */}
      <AppointmentDetailsSheet
        open={showAppointmentDetails}
        onClose={() => setShowAppointmentDetails(false)}
        appointment={selectedAppointment}
      />
    </div>
  );
}
